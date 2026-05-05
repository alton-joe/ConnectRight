-- ============================================================
-- ConnectRight — Patch: cap messages.content length at 4000 chars
-- Run once in Supabase Dashboard → SQL Editor → New Query
-- ============================================================
-- The client (hooks/useMessages.ts) already rejects content longer than
-- 2000 chars before sending. This DB-side CHECK is the safety net for any
-- client that bypasses that cap (custom client, replay attack, future bug).
-- 4000 is 2x the client cap so a small client-side bump won't require a
-- second migration.
--
-- PRE-FLIGHT (run first; expect over_4000 = 0):
--   SELECT
--     COUNT(*)                                      AS total_rows,
--     COALESCE(MAX(length(content)), 0)             AS max_len,
--     COUNT(*) FILTER (WHERE length(content) > 4000) AS over_4000
--   FROM public.messages;
--
-- If over_4000 > 0, DO NOT run the migration. Decide: raise the cap, or
-- truncate offenders with a one-time UPDATE.
-- ============================================================

ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_length_check
  CHECK (length(content) <= 4000) NOT VALID;

-- NOT VALID skips the existing-row scan, so the migration is instant. The
-- VALIDATE step below verifies historical rows in a separate, lower-priority
-- pass (won't block writes). If it fails, the constraint stays in place
-- but unenforced for legacy rows — new INSERTs are still capped.
ALTER TABLE public.messages
  VALIDATE CONSTRAINT messages_content_length_check;

-- ============================================================
-- ROLLBACK (if this somehow breaks something):
--   ALTER TABLE public.messages DROP CONSTRAINT messages_content_length_check;
-- ============================================================
