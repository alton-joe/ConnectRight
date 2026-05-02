'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ConnectionRequest } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseInboxReturn {
  requests: ConnectionRequest[]
  loading: boolean
  refetch: () => void
}

export function useInbox(currentUserId: string): UseInboxReturn {
  const [requests, setRequests] = useState<ConnectionRequest[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const mountedRef = useRef(true)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Unique per hook instance so two useInbox callers on the same singleton Supabase
  // client (e.g. GlobalHeader + InboxPanel) don't collide on the same channel name.
  const instanceId = useMemo(() => Math.random().toString(36).slice(2, 9), [])

  const fetch = useCallback(async (silent = false) => {
    if (!currentUserId) {
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)

    try {
      const { data } = await Promise.race([
        supabase
          .from('connection_requests')
          .select(`
            *,
            sender:profiles!connection_requests_sender_id_fkey(
              id, username, email, avatar_url, last_active, created_at
            )
          `)
          .eq('receiver_id', currentUserId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10_000)
        ),
      ])

      if (!mountedRef.current) return
      setRequests((data as ConnectionRequest[]) ?? [])
    } catch {
      // Timeout or network error — keep existing state
    } finally {
      if (mountedRef.current) setLoading(false)
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
        .channel(`inbox-${currentUserId}-${instanceId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'connection_requests', filter: `receiver_id=eq.${currentUserId}` },
          () => fetch(true)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'connection_requests', filter: `receiver_id=eq.${currentUserId}` },
          () => fetch(true)
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'connection_requests', filter: `receiver_id=eq.${currentUserId}` },
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

    pollIntervalRef.current = setInterval(() => fetch(true), 10_000)

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
  }, [currentUserId, supabase, fetch])

  return { requests, loading, refetch: fetch }
}
