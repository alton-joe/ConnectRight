-- ============================================================
-- ConnectRight — send_connection_request RPC
-- Run once in Supabase SQL Editor. Idempotent.
--
-- Why: connection_requests has UNIQUE(sender_id, receiver_id), so once a
-- request is declined or accepted, a plain INSERT from the sender fails
-- with 23505 forever. The receiver-only RLS UPDATE policy stops the sender
-- from reviving the row themselves. This RPC runs as security definer, so
-- it can flip a stale row back to 'pending' on the sender's behalf.
-- ============================================================

CREATE OR REPLACE FUNCTION public.send_connection_request(target_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() = target_id THEN
    RAISE EXCEPTION 'Cannot send a request to yourself';
  END IF;

  -- Block re-requesting someone you're already connected with.
  IF EXISTS (
    SELECT 1 FROM public.connections
    WHERE (user_a = auth.uid() AND user_b = target_id)
       OR (user_a = target_id AND user_b = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Already connected';
  END IF;

  INSERT INTO public.connection_requests (sender_id, receiver_id, status)
  VALUES (auth.uid(), target_id, 'pending')
  ON CONFLICT (sender_id, receiver_id)
  DO UPDATE SET status = 'pending', created_at = now()
  RETURNING id INTO req_id;

  RETURN req_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_connection_request(uuid) TO authenticated;
