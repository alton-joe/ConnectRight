'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface UseAuthReturn {
  user: User | null
  profile: Profile | null
  loading: boolean
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    mountedRef.current = true
    let currentUserId: string | null = null

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (mountedRef.current) setProfile(data ?? null)
    }

    // onAuthStateChange fires INITIAL_SESSION immediately, covering the initial
    // load without a second getUser() HTTP round-trip.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        if (!mountedRef.current) return
        setUser(session?.user ?? null)
        currentUserId = session?.user?.id ?? null
        // Resolve loading as soon as we know auth state — don't block on the
        // profile fetch, so consumers can render auth-gated UI immediately.
        setLoading(false)
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    // Re-fetch profile when the setup wizard signals it just created/updated
    // the row. Auth state hasn't changed at that point (same user), so without
    // this the GlobalHeader keeps the stale profile=null until a hard refresh.
    const handleProfileUpdated = () => {
      if (currentUserId) fetchProfile(currentUserId)
    }
    window.addEventListener('connectright:profile-updated', handleProfileUpdated)

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
      window.removeEventListener('connectright:profile-updated', handleProfileUpdated)
    }
  }, [supabase])

  return { user, profile, loading }
}
