'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Connection, Profile } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface RawConnection {
  id: string
  user_a: string
  user_b: string
  created_at: string
  profile_a: Profile | null
  profile_b: Profile | null
}

interface UseConnectionsReturn {
  connections: Connection[]
  loading: boolean
  refetch: () => void
}

export function useConnections(currentUserId: string | undefined): UseConnectionsReturn {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const mountedRef = useRef(true)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // silent=true skips the loading spinner — used for background refreshes so existing
  // data stays visible while the update happens in the background.
  // Loading is always cleared at the end to fix stuck states from suspended fetches.
  const fetch = useCallback(async (silent = false) => {
    if (!currentUserId) {
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)

    try {
      const { data } = await supabase
        .from('connections')
        .select(`
          id,
          user_a,
          user_b,
          created_at,
          profile_a:profiles!connections_user_a_fkey(id, username, email, avatar_url, last_active, created_at),
          profile_b:profiles!connections_user_b_fkey(id, username, email, avatar_url, last_active, created_at)
        `)
        .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`)

      if (!mountedRef.current) return

      if (data) {
        const mapped: Connection[] = (data as unknown as RawConnection[]).map((row) => ({
          id: row.id,
          user_a: row.user_a,
          user_b: row.user_b,
          created_at: row.created_at,
          other_user:
            row.user_a === currentUserId
              ? (row.profile_b ?? undefined)
              : (row.profile_a ?? undefined),
        }))
        setConnections(mapped)
      }
    } finally {
      // Always clear loading — runs even if the fetch throws or returns early
      setLoading(false)
    }
  }, [currentUserId, supabase])

  useEffect(() => {
    fetch()
  }, [fetch])

  useEffect(() => {
    if (!currentUserId) return

    mountedRef.current = true

    const createChannel = () => {
      if (!mountedRef.current) return

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      const ch = supabase
        .channel('connections-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'connections' },
          (payload) => {
            const row = payload.new as { user_a: string; user_b: string }
            if (row.user_a === currentUserId || row.user_b === currentUserId) {
              fetch(true)
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'connections' },
          (payload) => {
            const row = payload.new as { user_a: string; user_b: string }
            if (row.user_a === currentUserId || row.user_b === currentUserId) {
              fetch(true)
            }
          }
        )
        .subscribe((status) => {
          if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && mountedRef.current) {
            supabase.removeChannel(ch)
            channelRef.current = null
            retryTimerRef.current = setTimeout(createChannel, 2000)
          }
        })

      channelRef.current = ch
    }

    createChannel()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetch(true)
        createChannel()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mountedRef.current = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [currentUserId, supabase, fetch])

  return { connections, loading, refetch: fetch }
}
