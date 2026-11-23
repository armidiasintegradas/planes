\set ON_ERROR_STOP on
-- Discarded CI database only: all users, projects, tokens are fictitious.
create schema if not exists auth;
create schema if not exists private;
create role authenticated nologin;
create role anon nologin;
create or replace function auth.uid() returns uuid language sql stable
as $fn$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $fn$;
create table public.profiles(id uuid primary key, status text not null);
create table public.projects(id uuid primary key);
create table public.project_tasks(
 id uuid primary key default gen_random_uuid(),project_id uuid not null,
 title text not null,responsible text not null default '',
 deadline_text text not null default '',done boolean not null default false
);
create or replace function private.can_edit_project_field_operations(p_project_id uuid)
returns boolean language sql stable
as $fn$ select p_project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
 and auth.uid()='11111111-1111-4111-8111-111111111111'::uuid $fn$;
insert into public.profiles(id,status) values
 ('11111111-1111-4111-8111-111111111111','approved'),
 ('22222222-2222-4222-8222-222222222222','approved'),
 ('33333333-3333-4333-8333-333333333333','pending');
insert into public.projects(id) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
\i supabase/staging-only/planes_universal_task_actions.sql
do $tests$
declare
 v jsonb; action_id uuid; task_id uuid; denied boolean; original_count integer;
begin
 perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
 v:=public.prepare_planes_create_task('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Verificar formas','Engenharia','Amanhã');
 if v->>'state'<>'prepared' or v->>'executed'<>'false' then
   raise exception 'prepare modified records or returned bad state: %',v;
 end if;
 if (select count(*) from public.project_tasks)<>0 then
   raise exception 'prepare must not insert task';
 end if;
 action_id:=(v->>'action_id')::uuid;
 v:=public.confirm_planes_create_task(action_id,true);
 if v->>'state'<>'completed' or v->>'executed'<>'true' then
   raise exception 'confirmation failed: %',v;
 end if;
 task_id:=(v->>'task_id')::uuid;
 v:=public.confirm_planes_create_task(action_id,true);
 if v->>'duplicate'<>'true' or v->>'task_id'<>task_id::text then
   raise exception 'idempotency failed: %',v;
 end if;
 if (select count(*) from public.project_tasks)<>1 then
   raise exception 'duplicate confirmation inserted extra task';
 end if;
 v:=public.prepare_planes_create_task('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Cancelar registro');
 action_id:=(v->>'action_id')::uuid;
 v:=public.confirm_planes_create_task(action_id,false);
 if v->>'state'<>'cancelled' then raise exception 'cancel failed';end if;
 denied:=false;
 begin perform public.confirm_planes_create_task(action_id,true);
 exception when sqlstate '22023' then denied:=true;
 end;
 if not denied then raise exception 'cancelled action re-confirmed';end if;
 v:=public.prepare_planes_create_task('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Validação de expiração');
 action_id:=(v->>'action_id')::uuid;
 update private.planes_pending_actions set expires_at=now()-interval '1 minute' where id=action_id;
 denied:=false;
 begin perform public.confirm_planes_create_task(action_id,true);
 exception when sqlstate '22023' then denied:=true;
 end;
 if not denied then raise exception 'expired action confirmed';end if;
 denied:=false;
 begin perform public.prepare_planes_create_task('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Obra B');
 exception when sqlstate '42501' then denied:=true;
 end;
 if not denied then raise exception 'cross-project creation allowed';end if;
 perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
 denied:=false;
 begin perform public.confirm_planes_create_task(action_id,true);
 exception when sqlstate '42501' then denied:=true;
 end;
 if not denied then raise exception 'foreign pending action exposed';end if;
 denied:=false;
 begin perform public.prepare_planes_create_task('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Unauthorized');
 exception when sqlstate '42501' then denied:=true;
 end;
 if not denied then raise exception 'unauthorized prepare allowed';end if;
 perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
 denied:=false;
 begin perform public.prepare_planes_create_task('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Pending user');
 exception when sqlstate '42501' then denied:=true;
 end;
 if not denied then raise exception 'pending user allowed';end if;
 if has_function_privilege('anon','public.prepare_planes_create_task(uuid,text,text,text)','EXECUTE')
   or has_function_privilege('anon','public.confirm_planes_create_task(uuid,boolean)','EXECUTE') then
   raise exception 'anonymous RPC execution allowed';
 end if;
 raise notice 'PASS: prepare/confirm, idempotency, cancellation, expiration, role/project boundaries';
end $tests$;
