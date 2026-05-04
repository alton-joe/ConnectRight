import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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

  // Diagnostic: instantiate the same service-role client the send route uses
  // and count ALL rows in push_subscriptions. The DB definitely has rows
  // (verified out-of-band). If this count is 0, the SUPABASE_SERVICE_ROLE_KEY
  // configured on the deploy isn't a real service-role JWT — probably the
  // anon key by mistake — and RLS is silently filtering the result to empty.
  let serviceRoleSees: number | string = 'unknown'
  let serviceRoleForCurrentUser: number | string = 'unknown'
  try {
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const allCount = await serviceClient
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
    serviceRoleSees = allCount.count ?? `err:${allCount.error?.message ?? 'null'}`

    const userCount = await serviceClient
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    serviceRoleForCurrentUser = userCount.count ?? `err:${userCount.error?.message ?? 'null'}`
  } catch (err) {
    serviceRoleSees = `threw:${(err as Error).message}`
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
  const delivered: number = sendBody?.delivered ?? 0
  const total: number = sendBody?.total ?? 0
  // Pull the most informative failure reason (FCM/Apple body) so the toast
  // can show "VAPID key mismatch" or similar instead of a generic HTTP code.
  const firstFailure = (sendBody?.results ?? []).find(
    (r: { ok?: boolean }) => r && r.ok === false
  )
  return Response.json(
    {
      sendStatus: sendRes.status,
      // Surfaced so we can confirm the route's session matches the user_id
      // stored in push_subscriptions. A mismatch means the phone PWA is
      // logged in as a different account than the subscription was made for.
      authUserId: user.id,
      // If serviceRoleSees < total rows in DB, the deployed SUPABASE_SERVICE_ROLE_KEY
      // env var is not a valid service_role JWT (likely the anon key) and RLS
      // is filtering the read down to zero.
      serviceRoleSees,
      serviceRoleForCurrentUser,
      delivered,
      total,
      firstFailure,
      sendBody,
    },
    { status: 200 }
  )
}
