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

// Module-level cache so multiple useAuth callers (GlobalHeader, ProfileClient,
// ...) share the latest known user/profile instead of each refetching. This is
// what makes Home → Profile navigation render the profile body immediately
// rather than flashing the skeleton while a duplicate fetch completes.
let cachedUser: User | null = null
let cachedProfile: Profile | null = null
let cachedLoading = true
const listeners = new Set<() => void>()

const setCache = (next: { user?: User | null; profile?: Profile | null; loading?: boolean }) => {
  if ('user' in next) cachedUser = next.user ?? null
  if ('profile' in next) cachedProfile = next.profile ?? null
  if ('loading' in next) cachedLoading = next.loading ?? false
  listeners.forEach((l) => l())
}

let initialized = false

export function useAuth(): UseAuthReturn {
  const [, force] = useState(0)
  const mountedRef = useRef(true)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    mountedRef.current = true
    const rerender = () => { if (mountedRef.current) force((n) => n + 1) }
    listeners.add(rerender)

    // Bootstrap once across the whole app — subscribe to auth state changes,
    // fetch profile on sign-in, and replay cached values to all consumers.
    if (!initialized) {
      initialized = true

      const fetchProfile = async (userId: string) => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        setCache({ profile: data ?? null })
      }

      supabase.auth.onAuthStateChange((_, session) => {
        const u = session?.user ?? null
        setCache({ user: u, loading: false })
        if (u) {
          // Don't clobber a freshly-set profile from another path; only fetch
          // if it's empty or belongs to a different user.
          if (!cachedProfile || cachedProfile.id !== u.id) {
            fetchProfile(u.id)
          }
        } else {
          setCache({ profile: null })
        }
      })

      const handleProfileUpdated = () => {
        if (cachedUser) fetchProfile(cachedUser.id)
      }
      window.addEventListener('connectright:profile-updated', handleProfileUpdated)
    }

    return () => {
      mountedRef.current = false
      listeners.delete(rerender)
    }
  }, [supabase])

  return { user: cachedUser, profile: cachedProfile, loading: cachedLoading }
}
