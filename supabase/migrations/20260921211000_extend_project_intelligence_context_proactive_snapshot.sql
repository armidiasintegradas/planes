alter table public.user_project_intelligence_context
  add column if not exists last_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists last_seen_at timestamptz null;
