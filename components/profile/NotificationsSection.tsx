'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toaster'
import { usePushNotifications, type PushPermission } from '@/hooks/usePushNotifications'

interface NotificationsSectionProps {
  userId: string
}

export default function NotificationsSection({ userId }: NotificationsSectionProps) {
  const { isSupported, getPermission, subscribe } = usePushNotifications(userId)
  const { showToast } = useToast()
  const [permission, setPermission] = useState<PushPermission>('default')
  const [enabling, setEnabling] = useState(false)
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/push/test', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast('Test sent — check your notification tray', 'success')
      } else {
        // Surface the actual failure reason so the diagnostic isn't silent.
        const reason = body?.sendBody?.error ?? body?.error ?? `HTTP ${res.status}`
        showToast(`Test failed: ${reason}`, 'error')
        console.error('[push test] failed:', body)
      }
    } catch (err) {
      showToast(`Test threw: ${(err as Error).message}`, 'error')
    } finally {
      setTesting(false)
    }
  }

  // Notification.permission has no change event; re-read on mount (after the
  // browser API is available) and again after every action.
  useEffect(() => {
    setPermission(getPermission())
  }, [getPermission])

  const handleEnable = async () => {
    setEnabling(true)
    const result = await subscribe()
    setEnabling(false)
    setPermission(getPermission())
    if (result.ok) {
      showToast('Notifications enabled', 'success')
    } else if (result.reason === 'denied') {
      showToast('Permission denied. Enable in browser settings.', 'error')
    } else if (result.reason === 'unsupported') {
      showToast('Push notifications are not supported on this device.', 'error')
    } else {
      showToast('Could not enable notifications. Try again.', 'error')
    }
  }

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl">
      <div className="px-4 py-3">
        <p className="text-white/40 text-xs mb-2">Notifications</p>

        {!isSupported || permission === 'unsupported' ? (
          <p className="text-white/30 text-sm">
            Push notifications aren&apos;t supported on this device.
          </p>
        ) : permission === 'granted' ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
              <p className="text-white text-sm">Notifications are enabled</p>
            </div>
            <div>
              <button
                onClick={handleTest}
                disabled={testing}
                className="text-xs text-orange-400 hover:text-orange-300 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {testing ? 'Sending…' : 'Send test notification'}
              </button>
            </div>
          </div>
        ) : permission === 'denied' ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
              <p className="text-white text-sm">Notifications are blocked</p>
            </div>
            <p className="text-white/40 text-xs">
              Enable them in your browser settings, then reload this page.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-white/55 text-sm">
              Get notified about new messages and connection requests, even when the app is closed.
            </p>
            <div>
              <button
                onClick={handleEnable}
                disabled={enabling}
                className="text-xs bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white px-3 py-1 rounded-lg cursor-pointer transition-colors"
              >
                {enabling ? 'Enabling…' : 'Enable Notifications'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
