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
  acceptorId: string
  requesterId: string
}

export async function POST(request: Request) {
  // Verify the caller's session matches the claimed acceptorId. getClaims()
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

  const { acceptorId, requesterId } = body
  if (!acceptorId || !requesterId) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (acceptorId !== userId) {
    return Response.json({ error: 'acceptorId does not match session' }, { status: 403 })
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceUrl || !serviceKey) {
    return Response.json({ error: 'Supabase service env vars missing' }, { status: 500 })
  }

  const supabase = getServiceClient(serviceUrl, serviceKey)

  // H12: verify the connection_requests row was actually flipped to
  // 'accepted' by this acceptor. Cleaner than checking the connections
  // table because it ties the event to the specific acceptor identity
  // (`receiver_id = acceptorId`) — connections has no notion of who
  // initiated the accept.
  const { data: acceptedRow } = await supabase
    .from('connection_requests')
    .select('id')
    .eq('sender_id', requesterId)
    .eq('receiver_id', acceptorId)
    .eq('status', 'accepted')
    .limit(1)
    .maybeSingle()
  if (!acceptedRow) {
    return Response.json({ ok: false, reason: 'event_not_found' }, { status: 200 })
  }

  const { data: acceptor } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', acceptorId)
    .maybeSingle()

  const acceptorUsername = acceptor?.username ?? 'Someone'
  const icon = iconForAvatar(acceptor?.avatar_url)

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
      userId: requesterId,
      title: 'Connection Accepted',
      body: `${acceptorUsername} accepted your connection request`,
      url: '/home',
      icon,
      type: 'accepted',
    }),
  }).catch((err) => {
    console.warn('[push/request-accepted] send fetch failed:', (err as Error)?.message)
    return null
  })

  if (!sendRes || !sendRes.ok) {
    return Response.json({ ok: false }, { status: 200 })
  }
  return Response.json({ ok: true }, { status: 200 })
}
