revoke all on function public.admin_review_access_request(
  uuid, uuid, text, public.planes_user_role, uuid[], uuid[], text, text
) from public;

revoke all on function public.admin_review_access_request(
  uuid, uuid, text, public.planes_user_role, uuid[], uuid[], text, text
) from anon;

grant execute on function public.admin_review_access_request(
  uuid, uuid, text, public.planes_user_role, uuid[], uuid[], text, text
) to authenticated;

grant execute on function public.admin_review_access_request(
  uuid, uuid, text, public.planes_user_role, uuid[], uuid[], text, text
) to service_role;
