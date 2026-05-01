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
      async (_, session) => {
        if (!mountedRef.current) return
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        if (mountedRef.current) setLoading(false)
      }
    )

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [supabase])

  return { user, profile, loading }
}
