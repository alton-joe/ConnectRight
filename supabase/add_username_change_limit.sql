-- Allows a user to change their username at most ONE time after signup.
-- Run once against the existing database.

alter table public.profiles
  add column if not exists username_change_count integer not null default 0;

-- Trigger: enforce the cap and auto-increment so the client cannot lie about it.
create or replace function public.profiles_username_change_guard()
returns trigger language plpgsql as $$
begin
  if new.username is distinct from old.username then
    if old.username_change_count >= 1 then
      raise exception 'username can only be changed once';
    end if;
    new.username_change_count := old.username_change_count + 1;
  else
    -- Block manual tampering with the counter.
    new.username_change_count := old.username_change_count;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_username_change_guard_trg on public.profiles;
create trigger profiles_username_change_guard_trg
  before update on public.profiles
  for each row execute function public.profiles_username_change_guard();
