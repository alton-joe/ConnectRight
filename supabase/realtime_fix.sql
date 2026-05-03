-- ============================================================
-- ConnectRight — Realtime + RLS patch
-- Run this once in Supabase SQL Editor. Idempotent (safe to re-run).
-- ============================================================

-- 1. Add profiles to the realtime publication so useAvailableUsers
--    receives INSERT/UPDATE/DELETE events on profiles in real time.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

-- 2. Explicit DELETE policy on connections.
--    Default-deny would already block deletes, but the declarative policy
--    documents intent and survives any future RLS-disable accident.
drop policy if exists "connections_delete_participant" on public.connections;
create policy "connections_delete_participant"
  on public.connections for delete
  using (auth.uid() = user_a or auth.uid() = user_b);
