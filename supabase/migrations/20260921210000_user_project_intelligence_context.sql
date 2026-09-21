create table if not exists public.user_project_intelligence_context (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  module_counts jsonb not null default '{}'::jsonb,
  topic_counts jsonb not null default '{}'::jsonb,
  recent_actions jsonb not null default '[]'::jsonb,
  last_module text null,
  last_topic text null,
  preferred_mode text null check (preferred_mode is null or preferred_mode in ('touch','text','voice','system')),
  total_interactions integer not null default 0 check (total_interactions >= 0),
  last_interaction_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

alter table public.user_project_intelligence_context enable row level security;

grant select, insert, update, delete on public.user_project_intelligence_context to authenticated;
grant select, insert, update, delete on public.user_project_intelligence_context to service_role;

drop policy if exists user_project_intelligence_context_select_own on public.user_project_intelligence_context;
create policy user_project_intelligence_context_select_own
on public.user_project_intelligence_context
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and (select private.can_access_project(project_id))
);

drop policy if exists user_project_intelligence_context_insert_own on public.user_project_intelligence_context;
create policy user_project_intelligence_context_insert_own
on public.user_project_intelligence_context
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (select private.can_access_project(project_id))
);

drop policy if exists user_project_intelligence_context_update_own on public.user_project_intelligence_context;
create policy user_project_intelligence_context_update_own
on public.user_project_intelligence_context
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and (select private.can_access_project(project_id))
)
with check (
  (select auth.uid()) = user_id
  and (select private.can_access_project(project_id))
);

drop policy if exists user_project_intelligence_context_delete_own on public.user_project_intelligence_context;
create policy user_project_intelligence_context_delete_own
on public.user_project_intelligence_context
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and (select private.can_access_project(project_id))
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_project_intelligence_context'
  ) then
    alter publication supabase_realtime add table public.user_project_intelligence_context;
  end if;
end
$$;
