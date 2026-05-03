-- Adds the `interests` column used by the setup flow's interests step.
-- Run once against the existing database.
alter table public.profiles
  add column if not exists interests text[];
