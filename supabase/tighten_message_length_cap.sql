-- ============================================================
-- ConnectRight — Patch: tighten messages.content length cap to BETWEEN 1 AND 4000
-- Run once in Supabase Dashboard → SQL Editor → New Query
-- ============================================================
-- The earlier add_message_length_cap.sql migration installed
-- CHECK (length(content) <= 4000). This patch additionally requires
-- length >= 1 — closes the spam vector where a custom client / direct
-- PostgREST call inserts empty messages bypassing the client-side
-- `if (!trimmed) return false` guard.
--
-- PRE-FLIGHT (run first; expect empty_rows = 0):
--   SELECT
--     COUNT(*)                                       AS total_rows,
--     COUNT(*) FILTER (WHERE length(content) = 0)    AS empty_rows,
--     COUNT(*) FILTER (WHERE length(content) > 4000) AS over_4000
--   FROM public.messages;
--
-- If empty_rows > 0, DO NOT run this migration. Decide: keep them
-- (raise the lower bound to 0 in the new constraint), or scrub with
--   DELETE FROM public.messages WHERE length(content) = 0;
-- before applying.
-- ============================================================

-- Drop the old upper-bound-only constraint, replace with the tighter one.
-- A single CHECK with BETWEEN keeps pg_constraint clean rather than
-- accumulating two separate constraints on the same column.
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_content_length_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_length_check
  CHECK (length(content) BETWEEN 1 AND 4000) NOT VALID;

-- VALIDATE skips writes-blocking lock; verifies historical rows in a
-- separate pass. If any existing row violates (e.g. length = 0 that was
-- inserted before this constraint), VALIDATE fails — the constraint
-- remains in place but unenforced for legacy rows; new INSERTs are still
-- guarded.
ALTER TABLE public.messages
  VALIDATE CONSTRAINT messages_content_length_check;

-- ============================================================
-- ROLLBACK (restores the previous upper-bound-only behavior):
--
--   ALTER TABLE public.messages
--     DROP CONSTRAINT IF EXISTS messages_content_length_check;
--
--   ALTER TABLE public.messages
--     ADD CONSTRAINT messages_content_length_check
--     CHECK (length(content) <= 4000) NOT VALID;
--
--   ALTER TABLE public.messages
--     VALIDATE CONSTRAINT messages_content_length_check;
--
-- Or, to drop the constraint entirely (no length check at all):
--   ALTER TABLE public.messages
--     DROP CONSTRAINT IF EXISTS messages_content_length_check;
-- ============================================================
