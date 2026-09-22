create or replace function private.admin_review_access_request_impl(
  p_actor_id uuid,
  p_request_id uuid,
  p_decision text,
  p_role public.planes_user_role default null,
  p_project_ids uuid[] default '{}'::uuid[],
  p_work_ids uuid[] default '{}'::uuid[],
  p_rejection_reason text default null,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_request public.access_requests%rowtype;
  v_actor public.profiles%rowtype;
  v_now timestamptz := now();
  v_auth_uid uuid := auth.uid();
begin
  if v_auth_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_actor_id is distinct from v_auth_uid then
    raise exception 'Actor/session mismatch' using errcode = '42501';
  end if;

  select * into v_actor
  from public.profiles
  where id = v_auth_uid
  for share;

  if v_actor.id is null
     or v_actor.status <> 'approved'
     or v_actor.role not in ('super_admin','admin') then
    raise exception 'Administrator authorization required' using errcode = '42501';
  end if;

  select * into v_request
  from public.access_requests
  where id = p_request_id
  for update;

  if v_request.id is null then raise exception 'Access request not found'; end if;
  if v_request.status <> 'pending' then raise exception 'Access request is no longer pending'; end if;
  if p_decision not in ('approve','reject') then raise exception 'Invalid decision'; end if;

  if p_decision = 'approve' then
    if p_role is null then raise exception 'Role is required for approval'; end if;

    update public.profiles
      set status='approved',
          role=p_role,
          approved_at=v_now,
          approved_by=v_auth_uid,
          updated_at=v_now
      where id=v_request.user_id;

    update public.access_requests
      set status='approved',
          reviewed_at=v_now,
          reviewed_by=v_auth_uid,
          rejection_reason=null,
          admin_notes=p_admin_notes
      where id=p_request_id;

    delete from public.user_project_access where user_id=v_request.user_id;
    if coalesce(array_length(p_project_ids,1),0) > 0 then
      insert into public.user_project_access(user_id,project_id,created_by)
      select v_request.user_id, x, v_auth_uid from unnest(p_project_ids) x
      on conflict do nothing;
    end if;

    delete from public.user_work_access where user_id=v_request.user_id;
    if coalesce(array_length(p_work_ids,1),0) > 0 then
      insert into public.user_work_access(user_id,work_id,created_by)
      select v_request.user_id, x, v_auth_uid from unnest(p_work_ids) x
      on conflict do nothing;
    end if;

    insert into public.notifications(user_id,kind,title,body,metadata)
    values(
      v_request.user_id,
      'access_approved',
      'Acesso aprovado',
      'Seu acesso ao Planes OS foi aprovado.',
      jsonb_build_object('role',p_role)
    );

    insert into public.audit_logs(actor_id,target_user_id,action,metadata)
    values(
      v_auth_uid,
      v_request.user_id,
      'ACCESS_APPROVED',
      jsonb_build_object(
        'request_id',p_request_id,
        'role',p_role,
        'project_ids',p_project_ids,
        'work_ids',p_work_ids
      )
    );
  else
    if coalesce(trim(p_rejection_reason),'') = '' then
      raise exception 'Rejection reason is required';
    end if;

    update public.profiles
      set status='rejected',
          role=null,
          approved_at=null,
          approved_by=null,
          updated_at=v_now
      where id=v_request.user_id;

    update public.access_requests
      set status='rejected',
          reviewed_at=v_now,
          reviewed_by=v_auth_uid,
          rejection_reason=p_rejection_reason,
          admin_notes=p_admin_notes
      where id=p_request_id;

    delete from public.user_project_access where user_id=v_request.user_id;
    delete from public.user_work_access where user_id=v_request.user_id;

    insert into public.notifications(user_id,kind,title,body,metadata)
    values(
      v_request.user_id,
      'access_rejected',
      'Solicitação analisada',
      'Sua solicitação de acesso ao Planes OS não foi aprovada.',
      jsonb_build_object('reason',p_rejection_reason)
    );

    insert into public.audit_logs(actor_id,target_user_id,action,metadata)
    values(
      v_auth_uid,
      v_request.user_id,
      'ACCESS_REJECTED',
      jsonb_build_object('request_id',p_request_id,'reason',p_rejection_reason)
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'request_id',p_request_id,
    'user_id',v_request.user_id,
    'status',case when p_decision='approve' then 'approved' else 'rejected' end
  );
end;
$function$;

revoke all on function private.admin_review_access_request_impl(
  uuid, uuid, text, public.planes_user_role, uuid[], uuid[], text, text
) from public, anon, authenticated;

grant usage on schema private to authenticated;
grant execute on function private.admin_review_access_request_impl(
  uuid, uuid, text, public.planes_user_role, uuid[], uuid[], text, text
) to authenticated, service_role;

create or replace function public.admin_review_access_request(
  p_actor_id uuid,
  p_request_id uuid,
  p_decision text,
  p_role public.planes_user_role default null,
  p_project_ids uuid[] default '{}'::uuid[],
  p_work_ids uuid[] default '{}'::uuid[],
  p_rejection_reason text default null,
  p_admin_notes text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.admin_review_access_request_impl(
    p_actor_id,
    p_request_id,
    p_decision,
    p_role,
    p_project_ids,
    p_work_ids,
    p_rejection_reason,
    p_admin_notes
  );
$function$;

revoke all on function public.admin_review_access_request(
  uuid, uuid, text, public.planes_user_role, uuid[], uuid[], text, text
) from public, anon;

grant execute on function public.admin_review_access_request(
  uuid, uuid, text, public.planes_user_role, uuid[], uuid[], text, text
) to authenticated, service_role;
