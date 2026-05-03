'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ActiveChatProvider } from '@/context/ActiveChatContext'
import { RealtimeProvider } from '@/providers/RealtimeProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let currentUserId: string | null = null

    const updateLastActive = () => {
      if (!currentUserId) return
      void supabase.rpc('update_last_active')
    }

    // onAuthStateChange fires INITIAL_SESSION on mount, giving us the user ID
    // without a separate getSession() call. Also handles sign-in after page load.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      currentUserId = session?.user?.id ?? null
      setUserId(currentUserId)
      if (currentUserId) updateLastActive()
    })

    // 2-minute heartbeat: keeps last_active fresh while a user sits idle in an
    // open tab. Middleware only updates on navigation, so without this an idle
    // user's "Active now" indicator drops to offline after 5 min.
    const heartbeat = setInterval(updateLastActive, 2 * 60 * 1000)

    // visibilitychange covers tab switches inside the same browser window
    // (focus does not fire for those). Both events are needed to cover all
    // scenarios: tab switch (visibilitychange), app switch / minimize (focus).
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') updateLastActive()
    }

    window.addEventListener('focus', updateLastActive)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      clearInterval(heartbeat)
      window.removeEventListener('focus', updateLastActive)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [supabase])

  return (
    <RealtimeProvider userId={userId}>
      <ActiveChatProvider>{children}</ActiveChatProvider>
    </RealtimeProvider>
  )
}
