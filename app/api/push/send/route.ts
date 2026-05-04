import webPush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// web-push uses Node's crypto module — the Edge runtime would crash at import.
export const runtime = 'nodejs'

// Module-load time: configure web-push once. If env vars are missing the
// route returns 500 on first call rather than crashing the build.
const vapidConfigured = (() => {
  const mailto = process.env.VAPID_MAILTO
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!mailto || !pub || !priv) return false
  webPush.setVapidDetails(mailto, pub, priv)
  return true
})()

type SendBody = {
  userId: string
  title: string
  body: string
  url: string
  icon?: string
  // type + connectionId are passed through to the service worker so it can
  // suppress 'message' notifications when the recipient is currently focused
  // on that exact chat. Other types always notify.
  type?: 'message' | 'request' | 'accepted'
  connectionId?: string
}

export async function POST(request: Request) {
  if (!vapidConfigured) {
    return Response.json({ error: 'VAPID env vars not configured' }, { status: 500 })
  }

  let payload: SendBody
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId, title, body, url, icon, type, connectionId } = payload
  if (!userId || !title || !body || !url) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceUrl || !serviceKey) {
    return Response.json({ error: 'Supabase service env vars missing' }, { status: 500 })
  }

  // Service-role client bypasses RLS so we can read every device subscription
  // for the recipient. Never expose this key on the client.
  const supabase = createClient(serviceUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error) {
    console.error('[push/send] subscription fetch failed:', error.message)
    return Response.json(
      { error: 'subscription fetch failed', dbError: error.message, queriedUserId: userId },
      { status: 500 }
    )
  }

  if (!subscriptions || subscriptions.length === 0) {
    // Diagnostic echo: report exactly what we queried with and how many service-role
    // sees in total, so we can compare with the test endpoint's diagnostic.
    let serviceRoleSees: number | string = 'unknown'
    try {
      const allCount = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true })
      serviceRoleSees = allCount.count ?? `err:${allCount.error?.message ?? 'null'}`
    } catch (err) {
      serviceRoleSees = `threw:${(err as Error).message}`
    }
    return Response.json(
      {
        message: 'no subscriptions',
        queriedUserId: userId,
        queriedUserIdType: typeof userId,
        queriedUserIdLength: typeof userId === 'string' ? userId.length : -1,
        sendRouteServiceRoleSees: serviceRoleSees,
      },
      { status: 200 }
    )
  }

  const notificationPayload = JSON.stringify({ title, body, url, icon, type, connectionId })

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notificationPayload
        )
        return { endpoint: sub.endpoint, ok: true }
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode
        const message = (err as Error)?.message
        // web-push attaches the upstream provider's response body here —
        // FCM/Apple/Mozilla return useful detail (e.g. "VAPID key mismatch").
        const providerBody = (err as { body?: string })?.body
        // 404/410 = subscription is gone. Prune so we don't keep retrying it
        // on every future notification.
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        } else {
          console.warn('[push/send] sendNotification failed:', status, message, providerBody)
        }
        return { endpoint: sub.endpoint, ok: false, status, message, providerBody }
      }
    })
  )

  const summary = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { ok: false, reason: (r.reason as Error)?.message }
  )
  const delivered = summary.filter((s) => 'ok' in s && s.ok).length
  return Response.json(
    { delivered, total: summary.length, results: summary },
    { status: 200 }
  )
}
