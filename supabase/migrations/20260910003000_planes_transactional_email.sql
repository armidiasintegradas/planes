-- Planes OS transactional email infrastructure.
-- Delivery is intentionally decoupled from IAM state changes.

create schema if not exists private;

create table if not exists private.email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'access_request_received', 'admin_access_request', 'access_approved',
    'access_rejected', 'access_suspended'
  )),
  recipient_user_id uuid references public.profiles(id) on delete set null,
  to_email text not null check (position('@' in to_email) > 1),
  template_key text not null check (template_key in (
    'access_request_received', 'admin_access_request', 'access_approved',
    'access_rejected', 'access_suspended'
  )),
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_outbox_dispatch_idx
  on private.email_outbox(status, next_attempt_at, created_at);

alter table private.email_outbox enable row level security;
revoke all on table private.email_outbox from public, anon, authenticated;

create or replace function private.enqueue_email(
  p_event_type text,
  p_to_email text,
  p_template_key text,
  p_payload jsonb,
  p_dedupe_key text,
  p_recipient_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text;
  v_id uuid;
begin
  if coalesce(trim(p_to_email),'') = '' then return null; end if;

  v_subject := case p_template_key
    when 'access_request_received' then 'Recebemos sua solicitação de acesso ao Planes OS'
    when 'admin_access_request' then 'Nova solicitação de acesso ao Planes OS'
    when 'access_approved' then 'Seu acesso ao Planes OS foi aprovado'
    when 'access_rejected' then 'Sua solicitação de acesso ao Planes OS foi analisada'
    when 'access_suspended' then 'Seu acesso ao Planes OS foi suspenso'
    else null
  end;
  if v_subject is null then raise exception 'Unsupported email template: %', p_template_key; end if;

  insert into private.email_outbox(
    event_type, recipient_user_id, to_email, template_key, subject, payload, dedupe_key
  ) values (
    p_event_type, p_recipient_user_id, lower(trim(p_to_email)), p_template_key,
    v_subject, coalesce(p_payload,'{}'::jsonb), p_dedupe_key
  )
  on conflict (dedupe_key) do update set dedupe_key = excluded.dedupe_key
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function private.enqueue_email(text,text,text,jsonb,text,uuid) from public, anon, authenticated;

create or replace function private.enqueue_access_request_received_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles where id = new.user_id;
  if v_profile.id is not null and v_profile.email is not null then
    perform private.enqueue_email(
      'access_request_received', v_profile.email, 'access_request_received',
      jsonb_build_object(
        'full_name', v_profile.full_name,
        'email', v_profile.email,
        'request_id', new.id,
        'requested_at', new.requested_at,
        'app_url', 'https://armidiasintegradas.github.io/planes/'
      ),
      'access_request_received:' || new.id::text,
      v_profile.id
    );
  end if;
  return new;
end;
$$;

create or replace function private.enqueue_notification_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient public.profiles%rowtype;
  v_requester public.profiles%rowtype;
  v_requester_id uuid;
  v_project_names jsonb := '[]'::jsonb;
  v_work_names jsonb := '[]'::jsonb;
  v_template text;
  v_event text;
  v_payload jsonb;
begin
  if new.kind not in ('access_request','access_approved','access_rejected') then return new; end if;

  select * into v_recipient from public.profiles where id = new.user_id;
  if v_recipient.id is null or v_recipient.email is null then return new; end if;

  if new.kind = 'access_request' then
    begin
      v_requester_id := nullif(new.metadata->>'user_id','')::uuid;
      select * into v_requester from public.profiles where id = v_requester_id;
    exception when invalid_text_representation then
      v_requester_id := null;
      v_requester := null;
    end;
    v_event := 'admin_access_request';
    v_template := 'admin_access_request';
    v_payload := jsonb_build_object(
      'admin_name', v_recipient.full_name,
      'requester_user_id', v_requester_id,
      'requester_name', v_requester.full_name,
      'requester_email', v_requester.email,
      'provider', coalesce(new.metadata->>'provider','google'),
      'request_id', new.metadata->>'request_id',
      'app_url', 'https://armidiasintegradas.github.io/planes/'
    );
  elsif new.kind = 'access_approved' then
    select coalesce(jsonb_agg(p.name order by p.name), '[]'::jsonb)
      into v_project_names
      from public.user_project_access upa
      join public.projects p on p.id = upa.project_id
      where upa.user_id = new.user_id;
    select coalesce(jsonb_agg(w.name order by w.name), '[]'::jsonb)
      into v_work_names
      from public.user_work_access uwa
      join public.works w on w.id = uwa.work_id
      where uwa.user_id = new.user_id;
    v_event := 'access_approved';
    v_template := 'access_approved';
    v_payload := jsonb_build_object(
      'full_name', v_recipient.full_name,
      'email', v_recipient.email,
      'role', coalesce(new.metadata->>'role', v_recipient.role::text),
      'projects', v_project_names,
      'works', v_work_names,
      'app_url', 'https://armidiasintegradas.github.io/planes/'
    );
  else
    v_event := 'access_rejected';
    v_template := 'access_rejected';
    v_payload := jsonb_build_object(
      'full_name', v_recipient.full_name,
      'email', v_recipient.email,
      'reason', new.metadata->>'reason',
      'app_url', 'https://armidiasintegradas.github.io/planes/'
    );
  end if;

  perform private.enqueue_email(
    v_event, v_recipient.email, v_template, v_payload,
    v_event || ':notification:' || new.id::text,
    v_recipient.id
  );
  return new;
end;
$$;

create or replace function private.enqueue_suspension_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status and new.status = 'suspended' and new.email is not null then
    perform private.enqueue_email(
      'access_suspended', new.email, 'access_suspended',
      jsonb_build_object(
        'full_name', new.full_name,
        'email', new.email,
        'app_url', 'https://armidiasintegradas.github.io/planes/'
      ),
      'access_suspended:' || new.id::text || ':' || new.updated_at::text,
      new.id
    );
  end if;
  return new;
end;
$$;

revoke all on function private.enqueue_access_request_received_email() from public, anon, authenticated;
revoke all on function private.enqueue_notification_email() from public, anon, authenticated;
revoke all on function private.enqueue_suspension_email() from public, anon, authenticated;

drop trigger if exists trg_enqueue_access_request_emails on public.access_requests;
create trigger trg_enqueue_access_request_emails
after insert on public.access_requests
for each row execute function private.enqueue_access_request_received_email();

drop trigger if exists trg_enqueue_access_decision_email on public.notifications;
create trigger trg_enqueue_access_decision_email
after insert on public.notifications
for each row execute function private.enqueue_notification_email();

drop trigger if exists trg_enqueue_suspension_email on public.profiles;
create trigger trg_enqueue_suspension_email
after update of status on public.profiles
for each row execute function private.enqueue_suspension_email();

create or replace function public.private_email_claim_batch(p_worker text, p_limit integer default 10)
returns table(id uuid,to_email text,subject text,template_key text,payload jsonb,attempt_count integer)
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(trim(p_worker),'') = '' then raise exception 'worker id is required'; end if;
  return query
  with candidates as (
    select eo.id from private.email_outbox eo
    where eo.attempt_count < 5 and (
      (eo.status in ('pending','failed') and eo.next_attempt_at <= now())
      or (eo.status = 'sending' and eo.locked_at < now() - interval '10 minutes')
    )
    order by eo.created_at for update skip locked
    limit greatest(1, least(coalesce(p_limit,10), 25))
  ), claimed as (
    update private.email_outbox eo
    set status='sending', locked_at=now(), locked_by=p_worker,
        attempt_count=eo.attempt_count+1, updated_at=now()
    from candidates c where eo.id=c.id
    returning eo.id,eo.to_email,eo.subject,eo.template_key,eo.payload,eo.attempt_count
  )
  select c.id,c.to_email,c.subject,c.template_key,c.payload,c.attempt_count from claimed c;
end;
$$;

create or replace function public.private_email_claim_for_user(p_user_id uuid,p_worker text,p_limit integer default 5)
returns table(id uuid,to_email text,subject text,template_key text,payload jsonb,attempt_count integer)
language plpgsql security definer set search_path = ''
as $$
begin
  if p_user_id is null or coalesce(trim(p_worker),'') = '' then raise exception 'user id and worker id are required'; end if;
  return query
  with candidates as (
    select eo.id from private.email_outbox eo
    where eo.attempt_count < 5
      and (eo.recipient_user_id=p_user_id or (eo.template_key='admin_access_request' and eo.payload->>'requester_user_id'=p_user_id::text))
      and ((eo.status in ('pending','failed') and eo.next_attempt_at<=now()) or (eo.status='sending' and eo.locked_at<now()-interval '10 minutes'))
    order by eo.created_at for update skip locked
    limit greatest(1, least(coalesce(p_limit,5),10))
  ), claimed as (
    update private.email_outbox eo
    set status='sending',locked_at=now(),locked_by=p_worker,attempt_count=eo.attempt_count+1,updated_at=now()
    from candidates c where eo.id=c.id
    returning eo.id,eo.to_email,eo.subject,eo.template_key,eo.payload,eo.attempt_count
  )
  select c.id,c.to_email,c.subject,c.template_key,c.payload,c.attempt_count from claimed c;
end;
$$;

create or replace function public.private_email_mark_sent(p_id uuid,p_worker text,p_provider_message_id text default null)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_updated integer;
begin
  update private.email_outbox set status='sent',provider_message_id=nullif(trim(p_provider_message_id),''),sent_at=now(),locked_at=null,locked_by=null,last_error=null,updated_at=now()
  where id=p_id and status='sending' and locked_by=p_worker;
  get diagnostics v_updated=row_count;
  return v_updated=1;
end;
$$;

create or replace function public.private_email_mark_failed(p_id uuid,p_worker text,p_error text,p_retry_after_seconds integer default null)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_updated integer;
begin
  update private.email_outbox
  set status='failed',
      next_attempt_at=now()+make_interval(secs=>least(greatest(coalesce(p_retry_after_seconds,(30*power(2,greatest(attempt_count-1,0)))::integer),30),3600)),
      locked_at=null,locked_by=null,last_error=left(coalesce(p_error,'unknown delivery error'),1000),updated_at=now()
  where id=p_id and status='sending' and locked_by=p_worker;
  get diagnostics v_updated=row_count;
  return v_updated=1;
end;
$$;

revoke all on function public.private_email_claim_batch(text,integer) from public,anon,authenticated;
revoke all on function public.private_email_claim_for_user(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.private_email_mark_sent(uuid,text,text) from public,anon,authenticated;
revoke all on function public.private_email_mark_failed(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.private_email_claim_batch(text,integer) to service_role;
grant execute on function public.private_email_claim_for_user(uuid,text,integer) to service_role;
grant execute on function public.private_email_mark_sent(uuid,text,text) to service_role;
grant execute on function public.private_email_mark_failed(uuid,text,text,integer) to service_role;
