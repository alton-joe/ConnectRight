'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseAvailableUsersReturn {
  users: Profile[]
  loading: boolean
}

export function useAvailableUsers(
  currentUserId: string,
  initialData: Profile[] = []
): UseAvailableUsersReturn {
  const [users, setUsers] = useState<Profile[]>(initialData)
  const [loading, setLoading] = useState(initialData.length === 0)
  const supabase = useMemo(() => createClient(), [])
  const mountedRef = useRef(true)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Discard stale fetch responses so a slow poll can't overwrite a fresher
  // visibility-change refetch.
  const fetchSeqRef = useRef(0)
  const instanceId = useMemo(() => Math.random().toString(36).slice(2, 9), [])

  const fetch = useCallback(async (silent = false) => {
    if (!currentUserId) {
      setLoading(false)
      return
    }
    const seq = ++fetchSeqRef.current
    if (!silent) setLoading(true)

    try {
      const { data } = await Promise.race([
        supabase
          .from('profiles')
          .select('*')
          .neq('id', currentUserId)
          .order('created_at', { ascending: false }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10_000)
        ),
      ])

      if (seq !== fetchSeqRef.current || !mountedRef.current) return
      setUsers((data as Profile[]) ?? [])
    } catch {
      // Timeout or network error — keep existing state
    } finally {
      if (seq === fetchSeqRef.current && mountedRef.current) setLoading(false)
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
        .channel(`available-users-${currentUserId}-${instanceId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'profiles' },
          () => fetch(true)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles' },
          () => fetch(true)
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'profiles' },
          () => fetch(true)
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

    pollIntervalRef.current = setInterval(() => fetch(true), 15_000)

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
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [currentUserId, supabase, fetch, instanceId])

  return { users, loading }
}
