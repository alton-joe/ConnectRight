import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type Body = {
  acceptorId: string
  requesterId: string
}

export async function POST(request: Request) {
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

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceUrl || !serviceKey) {
    return Response.json({ error: 'Supabase service env vars missing' }, { status: 500 })
  }

  const supabase = createClient(serviceUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: acceptor } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', acceptorId)
    .maybeSingle()

  const acceptorUsername = acceptor?.username ?? 'Someone'

  const origin = new URL(request.url).origin
  const sendRes = await fetch(`${origin}/api/push/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: requesterId,
      title: 'Connection Accepted',
      body: `${acceptorUsername} accepted your connection request`,
      url: '/home',
      icon: '/icons/icon-192x192.png',
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
