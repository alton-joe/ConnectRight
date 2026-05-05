import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { iconForAvatar } from '@/lib/notification-icon'

export const runtime = 'nodejs'

// Module-scoped service-role client cache. See app/api/push/send/route.ts
// for rationale.
let serviceClientCache: SupabaseClient | null = null
function getServiceClient(serviceUrl: string, serviceKey: string): SupabaseClient {
  if (serviceClientCache) return serviceClientCache
  serviceClientCache = createClient(serviceUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return serviceClientCache
}

type Body = {
  connectionId: string
  senderId: string
  messagePreview: string
}

export async function POST(request: Request) {
  // Verify the caller's session matches the claimed senderId. getClaims()
  // validates the JWT locally (no /auth/v1/user round-trip) — same fast path
  // middleware uses.
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

  const { connectionId, senderId, messagePreview } = body
  if (!connectionId || !senderId) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (senderId !== userId) {
    return Response.json({ error: 'senderId does not match session' }, { status: 403 })
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceUrl || !serviceKey) {
    return Response.json({ error: 'Supabase service env vars missing' }, { status: 500 })
  }

  // Service-role client: derives receiverId from the connection row and
  // looks up the sender's username — both are server-side so the client
  // doesn't have to know either.
  const supabase = getServiceClient(serviceUrl, serviceKey)

  const [connRes, senderRes] = await Promise.all([
    supabase
      .from('connections')
      .select('user_a, user_b')
      .eq('id', connectionId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', senderId)
      .maybeSingle(),
  ])

  if (connRes.error || !connRes.data) {
    console.warn('[push/new-message] connection lookup failed:', connRes.error?.message)
    return Response.json({ error: 'connection not found' }, { status: 404 })
  }

  const { user_a, user_b } = connRes.data
  const receiverId = user_a === senderId ? user_b : user_a
  if (receiverId === senderId) {
    return Response.json({ error: 'invalid connection' }, { status: 400 })
  }

  const senderUsername = senderRes.data?.username ?? 'Someone'
  const icon = iconForAvatar(senderRes.data?.avatar_url)

  const internalSecret = process.env.CR_INTERNAL_SECRET
  if (!internalSecret) {
    return Response.json({ error: 'CR_INTERNAL_SECRET not configured' }, { status: 500 })
  }

  const origin = new URL(request.url).origin
  const sendRes = await fetch(`${origin}/api/push/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cr-internal': internalSecret,
    },
    body: JSON.stringify({
      userId: receiverId,
      title: senderUsername,
      body: (messagePreview ?? '').slice(0, 60),
      url: `/chat/${connectionId}`,
      icon,
      // Carried through the SW so it can suppress this push if the
      // recipient is currently focused on this exact chat.
      type: 'message',
      connectionId,
    }),
  }).catch((err) => {
    console.warn('[push/new-message] send fetch failed:', (err as Error)?.message)
    return null
  })

  if (!sendRes || !sendRes.ok) {
    return Response.json({ ok: false }, { status: 200 })
  }
  return Response.json({ ok: true }, { status: 200 })
}
