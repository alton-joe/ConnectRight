-- ============================================================
-- ConnectRight — Patch: add missing unique constraints + RLS policies
-- Run this once in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. UNIQUE CONSTRAINTS
-- Without these, duplicate rows accumulate and .single() queries
-- return an error ("multiple rows"), making checkStatus always fail.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'connection_requests_sender_receiver_unique'
  ) THEN
    ALTER TABLE public.connection_requests
      ADD CONSTRAINT connection_requests_sender_receiver_unique
      UNIQUE (sender_id, receiver_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'connections_user_pair_unique'
  ) THEN
    ALTER TABLE public.connections
      ADD CONSTRAINT connections_user_pair_unique
      UNIQUE (user_a, user_b);
  END IF;
END $$;

-- 2. RLS POLICIES — connection_requests
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- Both sender and receiver can read the request
DROP POLICY IF EXISTS "requests_select_participant" ON public.connection_requests;
CREATE POLICY "requests_select_participant"
  ON public.connection_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Only the sender can create a request
DROP POLICY IF EXISTS "requests_insert_sender" ON public.connection_requests;
CREATE POLICY "requests_insert_sender"
  ON public.connection_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Only the receiver can update (accept / decline)
DROP POLICY IF EXISTS "requests_update_receiver" ON public.connection_requests;
CREATE POLICY "requests_update_receiver"
  ON public.connection_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

-- 3. RLS POLICIES — connections
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connections_select_participant" ON public.connections;
CREATE POLICY "connections_select_participant"
  ON public.connections FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "connections_insert_participant" ON public.connections;
CREATE POLICY "connections_insert_participant"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- 4. RLS POLICIES — profiles (read-only for everyone, own row writable)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_any" ON public.profiles;
CREATE POLICY "profiles_select_any"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5. RLS POLICIES — messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = connection_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = connection_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- 6. REALTIME — enable tables for live updates (skip if already a member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'connections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'connection_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_requests;
  END IF;
END $$;

-- 7. RPC — accept_connection_request (security definer bypasses RLS for the insert)
CREATE OR REPLACE FUNCTION public.accept_connection_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req public.connection_requests%rowtype;
BEGIN
  SELECT * INTO req
  FROM public.connection_requests
  WHERE id = request_id
    AND receiver_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not authorized';
  END IF;

  UPDATE public.connection_requests
  SET status = 'accepted'
  WHERE id = request_id;

  INSERT INTO public.connections (user_a, user_b)
  VALUES (req.sender_id, req.receiver_id)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 8. RPC — update_last_active
CREATE OR REPLACE FUNCTION public.update_last_active()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_active = now()
  WHERE id = auth.uid();
END;
$$;

-- 9. INDEXES
CREATE INDEX IF NOT EXISTS idx_connection_requests_receiver
  ON public.connection_requests(receiver_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_messages_connection_id
  ON public.messages(connection_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_connections_user_a ON public.connections(user_a);
CREATE INDEX IF NOT EXISTS idx_connections_user_b ON public.connections(user_b);
