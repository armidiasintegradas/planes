\set ON_ERROR_STOP on
-- Test fixtures only: no Planes production connection and no live credentials.
do $test$
declare
  a uuid := '11111111-1111-4111-8111-111111111111';
  b uuid := '22222222-2222-4222-8222-222222222222';
  c uuid := '33333333-3333-4333-8333-333333333333';
  r jsonb;
  daily_denied boolean := false;
  count_after integer;
begin
  if has_function_privilege('anon', 'public.consume_planes_assistant_quota(uuid,integer,integer)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.consume_planes_assistant_quota(uuid,integer,integer)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.consume_planes_assistant_quota(uuid,integer,integer)', 'EXECUTE') then
    raise exception 'quota RPC grants are unsafe';
  end if;

  r := public.consume_planes_assistant_quota(a,2,100);
  if r->>'allowed' <> 'true' or (r->>'minute_used')::int <> 1 then
    raise exception 'first quota acquire failed: %', r;
  end if;
  r := public.consume_planes_assistant_quota(a,2,100);
  if r->>'allowed' <> 'true' or (r->>'minute_used')::int <> 2 then
    raise exception 'second quota acquire failed: %', r;
  end if;
  r := public.consume_planes_assistant_quota(a,2,100);
  if r->>'allowed' <> 'false' or r->>'reason' <> 'minute_limit' then
    raise exception 'minute quota bypass: %', r;
  end if;

  r := public.consume_planes_assistant_quota(b,2,100);
  if r->>'allowed' <> 'true' then
    raise exception 'quota not isolated by user: %', r;
  end if;

  r := public.consume_planes_assistant_quota(c,5,1);
  if r->>'allowed' <> 'true' then
    raise exception 'daily first permit failed: %', r;
  end if;
  begin
    perform public.consume_planes_assistant_quota(c,5,1);
  exception when sqlstate 'P0001' then
    daily_denied := true;
  end;
  if not daily_denied then
    raise exception 'daily quota was bypassed';
  end if;
  select requests into count_after
  from private.planes_assistant_usage
  where user_id=c and bucket='minute';
  if count_after <> 1 then
    raise exception 'daily rejection consumed minute quota unexpectedly: %', count_after;
  end if;

  if exists(select 1 from private.planes_assistant_usage where requests < 0) then
    raise exception 'quota underflow';
  end if;
  raise notice 'PASS: minute/day limits, rollback, role grants, user isolation';
end
$test$;
