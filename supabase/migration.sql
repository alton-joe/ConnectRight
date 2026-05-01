-- ============================================================
-- ConnectRight — Full Database Migration
-- Run this entire block once in Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- 1. PROFILES
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  email       text not null,
  avatar_url  text,
  region      text,
  last_active timestamptz default now(),
  created_at  timestamptz default now()
);

-- Run this if the table already exists:
-- alter table public.profiles add column if not exists region text;
alter table public.profiles enable row level security;

create policy "profiles_select_any"
  on public.profiles for select using (true);

create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

-- 2. CONNECTION_REQUESTS
create table if not exists public.connection_requests (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'pending'
              check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz default now(),
  unique (sender_id, receiver_id)
);
alter table public.connection_requests enable row level security;

create policy "requests_select_participant"
  on public.connection_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "requests_insert_sender"
  on public.connection_requests for insert
  with check (auth.uid() = sender_id);

create policy "requests_update_receiver"
  on public.connection_requests for update
  using (auth.uid() = receiver_id);

-- 3. CONNECTIONS
create table if not exists public.connections (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references public.profiles(id) on delete cascade,
  user_b     uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_a, user_b)
);
alter table public.connections enable row level security;

create policy "connections_select_participant"
  on public.connections for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "connections_insert_participant"
  on public.connections for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- 4. MESSAGES
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  content       text not null,
  created_at    timestamptz default now()
);
alter table public.messages enable row level security;

create policy "messages_select_participant"
  on public.messages for select
  using (
    exists (
      select 1 from public.connections c
      where c.id = connection_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "messages_insert_participant"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.connections c
      where c.id = connection_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

-- 5. REALTIME: enable tables for live updates
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.connections;
alter publication supabase_realtime add table public.connection_requests;

-- 6. RPC: accept_connection_request
-- Uses security definer so the function can insert into connections on behalf of the receiver.
-- Without this, RLS on connections would block the insert since the receiver is not user_a or user_b
-- at insert time when we don't know the ordering ahead of time.
create or replace function public.accept_connection_request(request_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  req public.connection_requests%rowtype;
begin
  select * into req
  from public.connection_requests
  where id = request_id
    and receiver_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'Request not found or not authorized';
  end if;

  update public.connection_requests
  set status = 'accepted'
  where id = request_id;

  insert into public.connections (user_a, user_b)
  values (req.sender_id, req.receiver_id)
  on conflict do nothing;
end;
$$;

-- 7. RPC: update_last_active (called from Next.js middleware, fire-and-forget)
create or replace function public.update_last_active()
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set last_active = now()
  where id = auth.uid();
end;
$$;

-- 8. Indexes for common query patterns
create index if not exists idx_connection_requests_receiver
  on public.connection_requests(receiver_id) where status = 'pending';

create index if not exists idx_messages_connection_id
  on public.messages(connection_id, created_at asc);

create index if not exists idx_connections_user_a
  on public.connections(user_a);

create index if not exists idx_connections_user_b
  on public.connections(user_b);
