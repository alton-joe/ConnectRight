import { createClient } from '@supabase/supabase-js'
import { iconForAvatar } from '@/lib/notification-icon'

export const runtime = 'nodejs'

type Body = {
  senderId: string
  receiverId: string
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { senderId, receiverId } = body
  if (!senderId || !receiverId) {
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

  const { data: sender } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', senderId)
    .maybeSingle()

  const senderUsername = sender?.username ?? 'Someone'
  const icon = iconForAvatar(sender?.avatar_url)

  const origin = new URL(request.url).origin
  const sendRes = await fetch(`${origin}/api/push/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: receiverId,
      title: 'New Connection Request',
      body: `${senderUsername} wants to connect with you`,
      url: '/home',
      icon,
      type: 'request',
    }),
  }).catch((err) => {
    console.warn('[push/new-request] send fetch failed:', (err as Error)?.message)
    return null
  })

  if (!sendRes || !sendRes.ok) {
    return Response.json({ ok: false }, { status: 200 })
  }
  return Response.json({ ok: true }, { status: 200 })
}
