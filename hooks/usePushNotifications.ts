'use client'

import { useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export interface UsePushNotificationsReturn {
  isSupported: boolean
  getPermission: () => PushPermission
  subscribe: () => Promise<{ ok: true } | { ok: false; reason: string }>
  unsubscribe: () => Promise<boolean>
}

// Web Push subscriptions encode the VAPID public key as the
// `applicationServerKey`. The browser API requires it as a Uint8Array of the
// raw 65 bytes, not the base64url string we ship in env.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  // Construct on a real ArrayBuffer (not ArrayBufferLike) so the result is
  // accepted as BufferSource by pushManager.subscribe under TS strict typing.
  const buffer = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function usePushNotifications(userId: string | null): UsePushNotificationsReturn {
  const supabase = useMemo(() => createClient(), [])
  const isSupported = isPushSupported()

  const getPermission = useCallback((): PushPermission => {
    if (!isSupported) return 'unsupported'
    return Notification.permission as PushPermission
  }, [isSupported])

  const subscribe = useCallback(async (): Promise<{ ok: true } | { ok: false; reason: string }> => {
    if (!isSupported) return { ok: false, reason: 'unsupported' }
    if (!userId) return { ok: false, reason: 'not signed in' }
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return { ok: false, reason: 'VAPID key missing' }

    try {
      // Must be triggered from a user gesture on iOS Safari, otherwise
      // requestPermission() resolves with 'default' silently. The profile
      // page button satisfies that — this hook is only safe to call from
      // a click handler.
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        return { ok: false, reason: permission }
      }

      const registration = await navigator.serviceWorker.ready

      // If a subscription already exists for this device, reuse it. Calling
      // subscribe() with the same key when one exists is a no-op in spec but
      // some browsers throw — guard explicitly.
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
      }

      const sub = subscription.toJSON()
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
        return { ok: false, reason: 'subscription missing fields' }
      }

      // Upsert by endpoint — re-subscribing on the same device updates the
      // user_id (e.g. user logged out and back in as someone else) instead
      // of creating a duplicate row.
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: userId,
            endpoint: sub.endpoint,
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
          { onConflict: 'endpoint' }
        )

      if (error) {
        console.error('[usePushNotifications] upsert failed:', error.message)
        return { ok: false, reason: error.message }
      }

      return { ok: true }
    } catch (err) {
      console.error('[usePushNotifications] subscribe threw:', err)
      return { ok: false, reason: (err as Error)?.message ?? 'unknown error' }
    }
  }, [isSupported, supabase, userId])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) return true

      const endpoint = subscription.endpoint
      const ok = await subscription.unsubscribe()
      if (ok) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
      }
      return ok
    } catch (err) {
      console.error('[usePushNotifications] unsubscribe threw:', err)
      return false
    }
  }, [isSupported, supabase])

  return { isSupported, getPermission, subscribe, unsubscribe }
}
