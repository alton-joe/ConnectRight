-- ============================================================
-- ConnectRight — Patch: add delivery / read status to messages
-- Run once in Supabase Dashboard → SQL Editor → New Query
-- ============================================================
-- Adds two nullable timestamp columns:
--   delivered_at  set when the recipient's client receives the row
--   read_at       set when the recipient opens / is viewing the chat
-- Renders as: single tick (sent) → double tick (delivered) → blue (read)
-- ============================================================

-- 1. COLUMNS
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at      timestamptz;

-- 2. RLS — allow recipient (any participant who is not the sender) to UPDATE.
--    The trigger below restricts which columns may actually change.
DROP POLICY IF EXISTS "messages_update_recipient" ON public.messages;
CREATE POLICY "messages_update_recipient"
  ON public.messages FOR UPDATE
  USING (
    auth.uid() <> sender_id
    AND EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = connection_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  )
  WITH CHECK (
    auth.uid() <> sender_id
    AND EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = connection_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- 3. TRIGGER — only delivered_at / read_at may change on UPDATE.
--    Without this, the RLS UPDATE grant above would let a recipient
--    rewrite content / sender_id of a message they received.
CREATE OR REPLACE FUNCTION public.messages_enforce_status_only_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id            IS DISTINCT FROM OLD.id
     OR NEW.connection_id IS DISTINCT FROM OLD.connection_id
     OR NEW.sender_id  IS DISTINCT FROM OLD.sender_id
     OR NEW.content    IS DISTINCT FROM OLD.content
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'messages: only delivered_at and read_at may be updated';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_status_only_update ON public.messages;
CREATE TRIGGER messages_status_only_update
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.messages_enforce_status_only_update();

-- 4. REPLICA IDENTITY — Supabase Realtime UPDATE events need the full old row
--    to emit reliable payloads. INSERTs already work without this.
ALTER TABLE public.messages REPLICA IDENTITY FULL;
