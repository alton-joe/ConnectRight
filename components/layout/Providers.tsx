'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ActiveChatProvider } from '@/context/ActiveChatContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let userId: string | null = null

    const updateLastActive = () => {
      if (!userId) return
      void supabase.rpc('update_last_active')
    }

    // onAuthStateChange fires INITIAL_SESSION on mount, giving us the user ID
    // without a separate getSession() call. Also handles sign-in after page load.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      userId = session?.user?.id ?? null
      if (userId) updateLastActive()
    })

    window.addEventListener('focus', updateLastActive)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('focus', updateLastActive)
    }
  }, [supabase])

  return <ActiveChatProvider>{children}</ActiveChatProvider>
}
