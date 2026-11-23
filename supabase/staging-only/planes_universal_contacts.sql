-- Planes Universal Assistant contact directory, STAGING ONLY.
-- Owned personal contacts; no shared or unrestricted contact directory.
create table if not exists public.planes_user_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  phone_e164 text not null check (phone_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists planes_user_contacts_owner_name_idx on public.planes_user_contacts(user_id,display_name);
alter table public.planes_user_contacts enable row level security;
revoke all on public.planes_user_contacts from anon;
grant select,insert,update,delete on public.planes_user_contacts to authenticated;
drop policy if exists "planes_contact_owner_read" on public.planes_user_contacts;
drop policy if exists "planes_contact_owner_insert" on public.planes_user_contacts;
drop policy if exists "planes_contact_owner_update" on public.planes_user_contacts;
drop policy if exists "planes_contact_owner_delete" on public.planes_user_contacts;
create policy "planes_contact_owner_read" on public.planes_user_contacts
 for select to authenticated using (user_id=(select auth.uid()));
create policy "planes_contact_owner_insert" on public.planes_user_contacts
 for insert to authenticated with check (user_id=(select auth.uid()));
create policy "planes_contact_owner_update" on public.planes_user_contacts
 for update to authenticated
 using (user_id=(select auth.uid()))
 with check (user_id=(select auth.uid()));
create policy "planes_contact_owner_delete" on public.planes_user_contacts
 for delete to authenticated using (user_id=(select auth.uid()));
