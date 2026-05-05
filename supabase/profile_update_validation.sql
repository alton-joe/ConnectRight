-- ============================================================
-- ConnectRight — Patch: validate profile fields on UPDATE
-- Run once in Supabase Dashboard → SQL Editor → New Query
-- ============================================================
-- Signup validates username/region in app/setup/actions.ts, but profile
-- UPDATEs (region edit, username change) currently rely on client-side
-- checks only. Under RLS, an authenticated user can PATCH their own row
-- with arbitrary text. This trigger re-applies the same regex/length
-- rules from the signup action on UPDATE only — it does NOT fire on
-- INSERT, so the signup path is untouched.
--
-- The regexes here are byte-for-byte the same as in app/setup/actions.ts:
--   username: 3..20 chars, [a-zA-Z0-9_]
--   region:   <=30 chars, [A-Za-z, ]+ (or empty)
-- ============================================================

CREATE OR REPLACE FUNCTION public.profiles_update_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Username — only validate when it actually changed (matches the existing
  -- profiles_username_change_guard trigger semantics).
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    IF NEW.username IS NULL OR length(NEW.username) < 3 OR length(NEW.username) > 20 THEN
      RAISE EXCEPTION 'username must be 3-20 characters';
    END IF;
    IF NEW.username !~ '^[a-zA-Z0-9_]+$' THEN
      RAISE EXCEPTION 'username can only contain letters, numbers, and underscores';
    END IF;
  END IF;

  -- Region — optional. NULL and empty string are both valid. When set, it
  -- must match the same charset rule the signup action enforces.
  IF NEW.region IS DISTINCT FROM OLD.region THEN
    IF NEW.region IS NOT NULL AND length(NEW.region) > 30 THEN
      RAISE EXCEPTION 'region must be 30 characters or less';
    END IF;
    IF NEW.region IS NOT NULL AND NEW.region <> '' AND NEW.region !~ '^[A-Za-z, ]+$' THEN
      RAISE EXCEPTION 'region can only contain letters, spaces, and commas';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- BEFORE UPDATE only — INSERTs (signup path) are NOT validated here.
-- The signup server action in app/setup/actions.ts is the single source
-- of truth for INSERT validation.
DROP TRIGGER IF EXISTS profiles_update_validate_trg ON public.profiles;
CREATE TRIGGER profiles_update_validate_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_update_validate();

-- ============================================================
-- ROLLBACK (if this rejects a legitimate edit):
--   DROP TRIGGER IF EXISTS profiles_update_validate_trg ON public.profiles;
--   DROP FUNCTION IF EXISTS public.profiles_update_validate();
-- ============================================================
