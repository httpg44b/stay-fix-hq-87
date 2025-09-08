-- Enable required extensions
create extension if not exists pgcrypto;

-- 1) Hotels
create table if not exists public.hotels (
  id          text primary key,
  name        text not null,
  timezone    text not null default 'Europe/Paris',
  created_at  timestamp not null default now()
);

-- 2) Users (app metadata; auth handled by Supabase Auth)
create table if not exists public.users (
  id            text primary key,            -- equals auth.uid()
  email         text unique not null,
  display_name  text not null,
  role          text not null check (role in ('ADMIN','TECNICO','RECEPCAO')),
  locale        text not null default 'pt-BR',
  is_active     boolean not null default true,
  created_at    timestamp not null default now()
);

-- 3) User ↔ Hotel link (N:M)
create table if not exists public.user_hotels (
  user_id  text references public.users(id) on delete cascade,
  hotel_id text references public.hotels(id) on delete cascade,
  primary key (user_id, hotel_id)
);

-- 4) Rooms/Areas
create table if not exists public.rooms (
  id        text primary key,
  hotel_id  text not null references public.hotels(id) on delete cascade,
  number    text not null,          -- "507" or "Lobby"
  unique (hotel_id, number)
);

-- 5) ENUM types
do $$ begin
  create type public.ticket_status as enum ('NOVO','EM_ATENDIMENTO','AGUARDANDO_PECA','CONCLUIDO','CANCELADO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_priority as enum ('LOW','MEDIUM','HIGH','URGENT');
exception when duplicate_object then null; end $$;

-- 6) Tickets
create table if not exists public.tickets (
  id           text primary key,
  hotel_id     text not null references public.hotels(id) on delete cascade,
  room_id      text references public.rooms(id) on delete set null,
  room_number  text,
  title        text not null,
  description  text,
  category     text,
  priority     public.ticket_priority not null default 'MEDIUM',
  status       public.ticket_status  not null default 'NOVO',
  creator_id   text references public.users(id),
  assignee_id  text references public.users(id),
  created_at   timestamp not null default now(),
  updated_at   timestamp not null default now(),
  closed_at    timestamp
);

-- 7) Comments
create table if not exists public.comments (
  id          text primary key,
  ticket_id   text not null references public.tickets(id) on delete cascade,
  user_id     text not null references public.users(id) on delete cascade,
  body        text not null,
  created_at  timestamp not null default now()
);

-- 8) Files (reference to Storage objects)
create table if not exists public.files (
  id           text primary key,
  hotel_id     text not null references public.hotels(id) on delete cascade,
  uploader_id  text references public.users(id),
  mime_type    text not null,
  size_bytes   bigint not null,
  storage_key  text not null,
  created_at   timestamp not null default now()
);

-- 9) Ticket ↔ File
create table if not exists public.ticket_files (
  ticket_id  text references public.tickets(id) on delete cascade,
  file_id    text references public.files(id) on delete cascade,
  primary key (ticket_id, file_id)
);

-- 10) Performance indexes
create index if not exists idx_tickets_hotel_status on public.tickets(hotel_id, status, created_at desc);
create index if not exists idx_tickets_assignee on public.tickets(assignee_id, status, updated_at desc);
create index if not exists idx_user_hotels_user on public.user_hotels(user_id);
create index if not exists idx_rooms_hotel_number on public.rooms(hotel_id, number);

-- Timestamp helper function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- Close ticket on status 'CONCLUIDO'
create or replace function public.handle_ticket_status()
returns trigger as $$
begin
  if new.status = 'CONCLUIDO' and (old.status is distinct from new.status or new.closed_at is null) then
    new.closed_at = now();
  elsif old.status = 'CONCLUIDO' and new.status <> 'CONCLUIDO' then
    new.closed_at = null;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

-- Triggers on tickets
drop trigger if exists trg_tickets_updated_at on public.tickets;
create trigger trg_tickets_updated_at
before update on public.tickets
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_tickets_status on public.tickets;
create trigger trg_tickets_status
before update on public.tickets
for each row execute function public.handle_ticket_status();

-- RLS enablement
alter table public.users        enable row level security;
alter table public.user_hotels  enable row level security;
alter table public.rooms        enable row level security;
alter table public.tickets      enable row level security;
alter table public.comments     enable row level security;
alter table public.files        enable row level security;
alter table public.ticket_files enable row level security;

-- Helper functions for roles (avoid recursion on users policies)
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb->>'role',''),
    (select u.role from public.users u where u.id = auth.uid())
  );
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_app_role() = 'ADMIN';
$$;
create or replace function public.is_tecnico() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_app_role() = 'TECNICO';
$$;
create or replace function public.is_recepcao() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_app_role() = 'RECEPCAO';
$$;

-- USERS policies (ADMIN sees all; user sees self)
create policy if not exists users_admin_select on public.users
for select using ( current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN' );
create policy if not exists users_self_select on public.users
for select using ( id = auth.uid() );
-- (Optional) ADMIN can manage users
create policy if not exists users_admin_all on public.users
for all using ( public.is_admin() ) with check ( public.is_admin() );

-- USER_HOTELS policies
create policy if not exists uh_admin_all on public.user_hotels
for all using ( public.is_admin() ) with check ( public.is_admin() );
create policy if not exists uh_self_select on public.user_hotels
for select using ( user_id = auth.uid() );

-- ROOMS policies
create policy if not exists rooms_admin_all on public.rooms
for all using ( public.is_admin() ) with check ( public.is_admin() );
create policy if not exists rooms_admin_select on public.rooms
for select using ( public.is_admin() );
create policy if not exists rooms_user_select on public.rooms
for select using (
  exists (
    select 1 from public.user_hotels uh
    where uh.user_id = auth.uid() and uh.hotel_id = rooms.hotel_id
  )
);

-- TICKETS policies
create policy if not exists tickets_admin_all on public.tickets
for all using ( public.is_admin() ) with check ( true );
create policy if not exists tickets_admin_select on public.tickets
for select using ( public.is_admin() );
create policy if not exists tickets_user_select on public.tickets
for select using (
  exists (
    select 1 from public.user_hotels uh
    where uh.user_id = auth.uid() and uh.hotel_id = tickets.hotel_id
  )
);
-- INSERT: only RECEPCAO linked to the hotel can create
create policy if not exists tickets_recep_insert on public.tickets
for insert with check (
  public.is_recepcao()
  and creator_id = auth.uid()
  and exists (
    select 1 from public.user_hotels uh
    where uh.user_id = auth.uid() and uh.hotel_id = tickets.hotel_id
  )
);
-- UPDATE: TECNICO with hotel link; can only update if unassigned or self-assigned
create policy if not exists tickets_tech_update on public.tickets
for update using (
  public.is_tecnico()
  and exists (
    select 1 from public.user_hotels uh
    where uh.user_id = auth.uid() and uh.hotel_id = tickets.hotel_id
  )
  and ( assignee_id is null or assignee_id = auth.uid() )
);
-- UPDATE: RECEPCAO with hotel link (cancel/reopen etc.)
create policy if not exists tickets_recep_update on public.tickets
for update using (
  public.is_recepcao()
  and exists (
    select 1 from public.user_hotels uh
    where uh.user_id = auth.uid() and uh.hotel_id = tickets.hotel_id
  )
);

-- COMMENTS policies
create policy if not exists comments_admin_all on public.comments
for all using ( public.is_admin() ) with check ( public.is_admin() );
create policy if not exists comments_select on public.comments
for select using (
  exists (
    select 1 from public.tickets t
    join public.user_hotels uh on uh.hotel_id = t.hotel_id
    where t.id = comments.ticket_id and uh.user_id = auth.uid()
  )
);
create policy if not exists comments_insert on public.comments
for insert with check (
  exists (
    select 1 from public.tickets t
    join public.user_hotels uh on uh.hotel_id = t.hotel_id
    where t.id = comments.ticket_id and uh.user_id = auth.uid()
  )
);

-- FILES policies
create policy if not exists files_admin_all on public.files
for all using ( public.is_admin() ) with check ( public.is_admin() );
create policy if not exists files_select on public.files
for select using (
  exists (
    select 1 from public.user_hotels uh
    where uh.user_id = auth.uid() and uh.hotel_id = files.hotel_id
  )
);
create policy if not exists files_insert on public.files
for insert with check (
  exists (
    select 1 from public.user_hotels uh
    where uh.user_id = auth.uid() and uh.hotel_id = files.hotel_id
  )
);

-- TICKET_FILES policies
create policy if not exists tf_admin_all on public.ticket_files
for all using ( public.is_admin() ) with check ( public.is_admin() );
create policy if not exists tf_select on public.ticket_files
for select using (
  exists (
    select 1 from public.tickets t
    join public.user_hotels uh on uh.hotel_id = t.hotel_id
    where t.id = ticket_files.ticket_id and uh.user_id = auth.uid()
  )
);
create policy if not exists tf_insert on public.ticket_files
for insert with check (
  exists (
    select 1 from public.tickets t
    join public.user_hotels uh on uh.hotel_id = t.hotel_id
    where t.id = ticket_files.ticket_id and uh.user_id = auth.uid()
  )
);

-- 3) Storage bucket 'tickets'
insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', false)
on conflict (id) do nothing;

-- Storage policies: authenticated can upload/manage within 'tickets' bucket.
create policy if not exists "Authenticated can upload to tickets"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'tickets' );

create policy if not exists "Authenticated can update tickets objects"
  on storage.objects for update to authenticated
  using ( bucket_id = 'tickets' )
  with check ( bucket_id = 'tickets' );

create policy if not exists "Authenticated can delete tickets objects"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'tickets' );

-- NOTE: No SELECT policy -> force access via signed URLs only.

-- 4) RPCs (Security Definer), enforce business rules explicitly

-- Create Ticket
create or replace function public.rpc_create_ticket(
  _hotel_id    text,
  _room_id     text,
  _room_number text,
  _title       text,
  _description text,
  _category    text,
  _priority    public.ticket_priority,
  _photo_keys  text[]
) returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  new_ticket public.tickets;
  uid text := auth.uid();
  tid text := gen_random_uuid()::text;
  fid text;
  key text;
begin
  if not public.is_recepcao() and not public.is_admin() then
    raise exception 'Only RECEPCAO or ADMIN can create tickets';
  end if;

  if not exists (
    select 1 from public.user_hotels uh
    where uh.user_id = uid and uh.hotel_id = _hotel_id
  ) then
    raise exception 'User has no access to this hotel';
  end if;

  insert into public.tickets (id, hotel_id, room_id, room_number, title, description, category, priority, status, creator_id)
  values (tid, _hotel_id, _room_id, _room_number, _title, _description, _category, coalesce(_priority, 'MEDIUM'), 'NOVO', uid)
  returning * into new_ticket;

  if _photo_keys is not null then
    foreach key in array _photo_keys loop
      fid := gen_random_uuid()::text;
      insert into public.files (id, hotel_id, uploader_id, mime_type, size_bytes, storage_key)
      values (fid, _hotel_id, uid, 'application/octet-stream', 0, key);
      insert into public.ticket_files (ticket_id, file_id) values (tid, fid);
    end loop;
  end if;

  return new_ticket;
end;
$$;

-- Assign Ticket
create or replace function public.rpc_assign_ticket(
  _ticket_id text
) returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid();
  t public.tickets;
begin
  select * into t from public.tickets where id = _ticket_id;
  if not found then
    raise exception 'Ticket not found';
  end if;

  if not public.is_tecnico() and not public.is_admin() then
    raise exception 'Only TECNICO or ADMIN can assign tickets';
  end if;

  if not exists (
    select 1 from public.user_hotels uh where uh.user_id = uid and uh.hotel_id = t.hotel_id
  ) then
    raise exception 'User has no access to this hotel';
  end if;

  if t.assignee_id is not null and t.assignee_id <> uid then
    raise exception 'Ticket already assigned';
  end if;

  update public.tickets
  set assignee_id = uid,
      status = 'EM_ATENDIMENTO',
      updated_at = now()
  where id = _ticket_id
  returning * into t;

  return t;
end;
$$;

-- Update Ticket Status
create or replace function public.rpc_update_ticket_status(
  _ticket_id text,
  _new_status public.ticket_status
) returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid();
  t public.tickets;
begin
  select * into t from public.tickets where id = _ticket_id;
  if not found then
    raise exception 'Ticket not found';
  end if;

  if not public.is_tecnico() and not public.is_admin() then
    raise exception 'Only TECNICO or ADMIN can update status';
  end if;

  if not exists (
    select 1 from public.user_hotels uh where uh.user_id = uid and uh.hotel_id = t.hotel_id
  ) then
    raise exception 'User has no access to this hotel';
  end if;

  if _new_status not in ('EM_ATENDIMENTO','AGUARDANDO_PECA','CONCLUIDO') then
    raise exception 'Invalid status for TECNICO';
  end if;

  update public.tickets
  set status = _new_status,
      closed_at = case when _new_status = 'CONCLUIDO' then now() else null end,
      updated_at = now()
  where id = _ticket_id
  returning * into t;

  return t;
end;
$$;

-- Reopen Ticket
create or replace function public.rpc_reopen_ticket(
  _ticket_id text
) returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid();
  t public.tickets;
begin
  select * into t from public.tickets where id = _ticket_id;
  if not found then
    raise exception 'Ticket not found';
  end if;

  if not public.is_recepcao() and not public.is_admin() then
    raise exception 'Only RECEPCAO or ADMIN can reopen tickets';
  end if;

  if not exists (
    select 1 from public.user_hotels uh where uh.user_id = uid and uh.hotel_id = t.hotel_id
  ) then
    raise exception 'User has no access to this hotel';
  end if;

  update public.tickets
  set status = 'NOVO',
      assignee_id = null,
      closed_at = null,
      updated_at = now()
  where id = _ticket_id
  returning * into t;

  return t;
end;
$$;

-- Cancel Ticket
create or replace function public.rpc_cancel_ticket(
  _ticket_id text
) returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid();
  t public.tickets;
begin
  select * into t from public.tickets where id = _ticket_id;
  if not found then
    raise exception 'Ticket not found';
  end if;

  if not public.is_recepcao() and not public.is_admin() then
    raise exception 'Only RECEPCAO or ADMIN can cancel tickets';
  end if;

  if not exists (
    select 1 from public.user_hotels uh where uh.user_id = uid and uh.hotel_id = t.hotel_id
  ) then
    raise exception 'User has no access to this hotel';
  end if;

  update public.tickets
  set status = 'CANCELADO',
      closed_at = now(),
      updated_at = now()
  where id = _ticket_id
  returning * into t;

  return t;
end;
$$;