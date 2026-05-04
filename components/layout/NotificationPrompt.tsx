'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePushNotifications } from '@/hooks/usePushNotifications'

// Per-app-launch flag — once shown (or dismissed) this session, don't show it
// again until the user fully closes the PWA and re-opens it. Refreshes within
// the same session do NOT re-trigger the prompt because sessionStorage
// survives soft reloads but is cleared when the standalone app is closed.
const SESSION_KEY = 'connectright_notif_prompt_handled'

function wasHandledThisSession(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function markHandled() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // ignore
  }
}

export default function NotificationPrompt() {
  const { user, loading: authLoading } = useAuth()
  const { isSupported, getPermission } = usePushNotifications(user?.id ?? null)
  const pathname = usePathname()
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  // Track whether we've already prefetched /profile so we don't spam the
  // router on every render — prefetching once is enough to warm the bundle.
  const prefetchedRef = useRef(false)

  // Only show when: signed-in, push is supported, permission is 'default'
  // (granted users don't need it; denied users have to fix browser settings),
  // pathname isn't /profile (we'd be linking to the same page) or /setup
  // (don't interrupt onboarding), and we haven't already shown/dismissed it
  // this app session.
  useEffect(() => {
    if (authLoading || !user) { setVisible(false); return }
    if (!isSupported) { setVisible(false); return }
    if (pathname === '/profile' || pathname === '/setup') { setVisible(false); return }
    if (getPermission() !== 'default') { setVisible(false); return }
    if (wasHandledThisSession()) { setVisible(false); return }
    setVisible(true)
  }, [authLoading, user, isSupported, getPermission, pathname])

  // Warm the /profile route bundle the moment the prompt becomes visible so
  // tapping "Enable" navigates without paying the JS-load cost.
  useEffect(() => {
    if (visible && !prefetchedRef.current) {
      prefetchedRef.current = true
      router.prefetch('/profile')
    }
  }, [visible, router])

  if (!visible) return null

  const handleEnable = () => {
    markHandled()
    setVisible(false)
    router.push('/profile#notifications')
  }

  const handleDismiss = () => {
    markHandled()
    setVisible(false)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(env(safe-area-inset-bottom),12px)] pointer-events-none">
      <div
        role="dialog"
        aria-label="Enable notifications"
        className="pointer-events-auto mx-auto max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl px-4 py-3"
      >
        {/* Top row: icon + title on the left, action buttons on the right.
            Mobile description sits on its own row below so it can use the
            full width and wrap to two lines instead of squeezing into the
            narrow column between icon and buttons. */}
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-orange-500/15 text-orange-400 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <p className="flex-1 min-w-0 text-white text-sm font-medium leading-tight">
            Enable app notifications
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleDismiss}
              className="text-white/60 hover:text-white text-xs font-medium border border-white/15 hover:border-white/30 hover:bg-white/5 px-3 py-1.5 rounded-lg transition-colors"
            >
              Not now
            </button>
            <button
              onClick={handleEnable}
              className="text-xs bg-orange-500 hover:bg-orange-400 text-white font-medium border border-orange-500 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              Enable
            </button>
          </div>
        </div>
        {/* pl-12 = icon column (w-9 = 36px) + gap-3 (12px), so the description
            aligns with the start of the "Enable app notifications" title
            instead of slipping under the icon. */}
        <p className="text-white/50 text-xs mt-2 leading-snug pl-12">
          Stay updated on new messages and connection requests.
        </p>
      </div>
    </div>
  )
}
