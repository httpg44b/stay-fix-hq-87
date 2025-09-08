-- Create users table with required fields
create table if not exists public.users (
  id text primary key,
  email text unique not null,
  display_name text not null,
  role text not null check (role in ('ADMIN','TECNICO','RECEPCAO')),
  locale text not null default 'pt-BR',
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Policies
-- Admin can do everything on users
create policy if not exists "users_admin_all"
  on public.users
  for all
  using ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'ADMIN')
  with check (true);

-- Users can read their own row
create policy if not exists "users_self_select"
  on public.users
  for select
  using (id = auth.uid());

-- Users can insert their own row (e.g., profile bootstrap)
create policy if not exists "users_self_insert"
  on public.users
  for insert
  with check (id = auth.uid());

-- Users can update their own row
create policy if not exists "users_self_update"
  on public.users
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Optionally allow users to delete their own row (commented out). Keep admin-only delete for safety.
-- create policy if not exists "users_self_delete"
--   on public.users
--   for delete
--   using (id = auth.uid());
