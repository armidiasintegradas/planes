-- Planes Universal Assistant — staging ONLY. Requires a fully reconciled Planes schema.
-- Never run against production without separate change approval.
-- A two-phase, transactional task action. SQL (rather than LLM) enforces identity,
-- permissions, expiration and single execution.
create schema if not exists private;

create table if not exists private.planes_pending_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  kind text not null check (kind = 'create_task'),
  title text not null,
  responsible text not null default '',
  deadline_text text not null default '',
  state text not null default 'prepared' check (state in ('prepared','completed','cancelled')),
  created_task_id uuid null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  completed_at timestamptz null
);
create index if not exists planes_pending_actions_owner_idx
  on private.planes_pending_actions(user_id, created_at desc);
alter table private.planes_pending_actions enable row level security;
revoke all on private.planes_pending_actions from public, anon, authenticated;

create or replace function public.prepare_planes_create_task(
  p_project_id uuid, p_title text, p_responsible text default '',
  p_deadline_text text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $fn$
declare v_uid uuid := auth.uid();
  v_id uuid;
  v_title text := btrim(coalesce(p_title,''));
  v_responsible text := btrim(coalesce(p_responsible,''));
  v_deadline text := btrim(coalesce(p_deadline_text,''));
begin
  if v_uid is null then raise exception using errcode='28000',message='authentication_required'; end if;
  if p_project_id is null or length(v_title) < 3 or length(v_title) > 180
    or length(v_responsible)>120 or length(v_deadline)>100 then
    raise exception using errcode='22023',message='invalid_task_payload';
  end if;
  if not exists(select 1 from public.profiles
      where id=v_uid and status='approved')
      or not coalesce(private.can_edit_project_field_operations(p_project_id),false) then
    raise exception using errcode='42501',message='task_permission_denied';
  end if;
  insert into private.planes_pending_actions
    (user_id,project_id,kind,title,responsible,deadline_text)
  values (v_uid,p_project_id,'create_task',v_title,v_responsible,v_deadline)
  returning id into v_id;
  return jsonb_build_object('action_id',v_id,'state','prepared',
    'summary',jsonb_build_object('title',v_title,'responsible',v_responsible,
      'deadline_text',v_deadline,'project_id',p_project_id),
    'expires_in_seconds',600,'executed',false);
end $fn$;

create or replace function public.confirm_planes_create_task(
  p_action_id uuid, p_confirm boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $fn$
declare v_uid uuid := auth.uid();
  v_action private.planes_pending_actions%rowtype;
  v_task_id uuid;
begin
  if v_uid is null then raise exception using errcode='28000',message='authentication_required'; end if;
  if p_action_id is null or p_confirm is null then
    raise exception using errcode='22023',message='confirmation_required';
  end if;
  -- Row lock serializes duplicate clicks and concurrent confirmations.
  select * into v_action from private.planes_pending_actions
    where id=p_action_id and user_id=v_uid for update;
  if not found then raise exception using errcode='42501',message='action_not_accessible'; end if;
  if v_action.state='completed' then
    return jsonb_build_object('state','completed','executed',true,
      'task_id',v_action.created_task_id,'duplicate',true);
  end if;
  if v_action.state<>'prepared' or v_action.expires_at <= now() then
    raise exception using errcode='22023',message='action_not_confirmable';
  end if;
  if p_confirm=false then
    update private.planes_pending_actions set state='cancelled' where id=p_action_id;
    return jsonb_build_object('state','cancelled','executed',false);
  end if;
  if not exists(select 1 from public.profiles
      where id=v_uid and status='approved')
      or not coalesce(private.can_edit_project_field_operations(v_action.project_id),false) then
    raise exception using errcode='42501',message='task_permission_denied';
  end if;
  insert into public.project_tasks(project_id,title,responsible,deadline_text,done)
    values(v_action.project_id,v_action.title,v_action.responsible,
      v_action.deadline_text,false) returning id into v_task_id;
  update private.planes_pending_actions set state='completed',
      created_task_id=v_task_id,completed_at=now() where id=p_action_id;
  return jsonb_build_object('state','completed','executed',true,'task_id',v_task_id,
    'duplicate',false);
end $fn$;

revoke all on function public.prepare_planes_create_task(uuid,text,text,text) from public,anon;
revoke all on function public.confirm_planes_create_task(uuid,boolean) from public,anon;
grant execute on function public.prepare_planes_create_task(uuid,text,text,text) to authenticated;
grant execute on function public.confirm_planes_create_task(uuid,boolean) to authenticated;
-- No table permissions: every action passes through its audited, constrained RPC.
