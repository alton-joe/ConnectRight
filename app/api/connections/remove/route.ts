import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

let serviceClientCache: SupabaseClient | null = null
function getServiceClient(serviceUrl: string, serviceKey: string): SupabaseClient {
  if (serviceClientCache) return serviceClientCache
  serviceClientCache = createClient(serviceUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return serviceClientCache
}

type Body = { connectionId: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const sessionClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => { /* read-only */ },
      },
    }
  )
  const { data: claimsData } = await sessionClient.auth.getClaims()
  const userId = claimsData?.claims?.sub ?? null
  if (!userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { connectionId } = body
  if (!connectionId || typeof connectionId !== 'string' || !UUID_RE.test(connectionId)) {
    return Response.json({ error: 'invalid_connection_id' }, { status: 400 })
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceUrl || !serviceKey) {
    return Response.json({ error: 'Supabase service env vars missing' }, { status: 500 })
  }

  const supabase = getServiceClient(serviceUrl, serviceKey)

  // Verify the caller is part of this connection before doing anything destructive.
  const { data: conn, error: connErr } = await supabase
    .from('connections')
    .select('id, user_a, user_b')
    .eq('id', connectionId)
    .maybeSingle()
  if (connErr) {
    return Response.json({ error: 'lookup_failed' }, { status: 500 })
  }
  if (!conn) {
    return Response.json({ error: 'not_found' }, { status: 404 })
  }
  if (conn.user_a !== userId && conn.user_b !== userId) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const otherId = conn.user_a === userId ? conn.user_b : conn.user_a

  // messages.connection_id has no ON DELETE CASCADE, so messages must go first
  // or the connection delete will fail with a FK violation.
  const { error: msgErr } = await supabase
    .from('messages')
    .delete()
    .eq('connection_id', connectionId)
  if (msgErr) {
    return Response.json({ error: 'messages_delete_failed' }, { status: 500 })
  }

  const { error: connDelErr } = await supabase
    .from('connections')
    .delete()
    .eq('id', connectionId)
  if (connDelErr) {
    return Response.json({ error: 'connection_delete_failed' }, { status: 500 })
  }

  // Clean slate: drop every request row between the pair regardless of status,
  // so a future request from either side isn't blocked by leftover rows.
  const { error: reqDelErr } = await supabase
    .from('connection_requests')
    .delete()
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`
    )
  if (reqDelErr) {
    // Non-fatal — connection is already gone; log and continue.
    console.warn('[connections/remove] request rows delete failed:', reqDelErr.message)
  }

  return Response.json({ ok: true }, { status: 200 })
}
