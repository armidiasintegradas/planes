-- ONLY for a reconstructed, isolated Supabase staging environment.
-- Do NOT apply to Planes OS production until schema reconciliation and approval.
-- Atomic per-user minute/day quota for authenticated Universal Assistant calls.
create schema if not exists private;

create table if not exists private.planes_assistant_usage (
  user_id uuid not null,
  bucket text not null check (bucket in ('minute','day')),
  window_start timestamptz not null,
  requests integer not null default 0 check (requests >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, bucket, window_start)
);
alter table private.planes_assistant_usage enable row level security;
revoke all on private.planes_assistant_usage from public, anon, authenticated;

create or replace function public.consume_planes_assistant_quota(
  p_user_id uuid,
  p_minute_limit integer default 10,
  p_day_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_minute timestamptz := date_trunc('minute', now());
  v_day timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_minute_count integer;
  v_day_count integer;
begin
  -- This RPC is only granted to service_role, used internally by Edge Functions.
  -- Never expose service_role to the browser.
  if p_user_id is null or p_minute_limit < 1 or p_minute_limit > 120
     or p_day_limit < 1 or p_day_limit > 10000 then
    raise exception 'invalid_quota_configuration';
  end if;

  insert into private.planes_assistant_usage as u
    (user_id, bucket, window_start, requests)
  values (p_user_id, 'minute', v_minute, 1)
  on conflict (user_id, bucket, window_start)
  do update set requests = u.requests + 1, updated_at = now()
    where u.requests < p_minute_limit
  returning requests into v_minute_count;

  if v_minute_count is null then
    return jsonb_build_object('allowed', false, 'reason', 'minute_limit');
  end if;

  insert into private.planes_assistant_usage as u
    (user_id, bucket, window_start, requests)
  values (p_user_id, 'day', v_day, 1)
  on conflict (user_id, bucket, window_start)
  do update set requests = u.requests + 1, updated_at = now()
    where u.requests < p_day_limit
  returning requests into v_day_count;

  if v_day_count is null then
    -- IMPORTANT: quota denied must not burn minute balance;
    -- force rollback via a dedicated SQLSTATE and let server handle it as 429.
    raise exception using errcode = 'P0001', message = 'planes_assistant_daily_quota_exceeded';
  end if;
  return jsonb_build_object(
    'allowed', true, 'minute_used', v_minute_count, 'day_used', v_day_count
  );
end
$function$;

revoke all on function public.consume_planes_assistant_quota(uuid,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_planes_assistant_quota(uuid,integer,integer) to service_role;
-- Prevent any access to usage rows from anon or authenticated.
-- Housekeeping of expired buckets is a separate privileged operation.
