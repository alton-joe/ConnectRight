import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// Diagnostic endpoint: sends a push to the calling user's own subscriptions.
// Bypasses every trigger-route lookup, so a failure here points squarely at
// VAPID env vars, key mismatch, or service-role config — not at the trigger
// derivation logic.

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => { /* read-only here */ },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'not signed in' }, { status: 401 })
  }

  const origin = new URL(request.url).origin
  const sendRes = await fetch(`${origin}/api/push/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      title: 'ConnectRight test',
      body: 'If you see this, push delivery is working.',
      url: '/profile',
      icon: '/icons/icon-192x192.png',
      type: 'request',
    }),
  })

  // Surface the send route's actual response so a failure is visible to
  // the caller — unlike the production trigger routes which swallow errors.
  const sendBody = await sendRes.json().catch(() => ({}))
  return Response.json(
    { sendStatus: sendRes.status, sendBody },
    { status: sendRes.ok ? 200 : 500 }
  )
}
