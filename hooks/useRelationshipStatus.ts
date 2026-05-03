'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type RelationshipStatus = 'none' | 'requested' | 'pending' | 'connected'

interface UseRelationshipStatusReturn {
  status: RelationshipStatus
  loading: boolean
}

export function useRelationshipStatus(
  currentUserId: string,
  targetUserId: string
): UseRelationshipStatusReturn {
  const [status, setStatus] = useState<RelationshipStatus>('none')
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])
  const mountedRef = useRef(true)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Discard stale fetch responses so a slow visibility-change refetch can't
  // overwrite a fresher realtime-triggered refetch.
  const fetchSeqRef = useRef(0)
  const instanceId = useMemo(() => Math.random().toString(36).slice(2, 9), [])

  const fetch = useCallback(async (silent = false) => {
    if (!currentUserId || !targetUserId) {
      setLoading(false)
      return
    }
    const seq = ++fetchSeqRef.current
    if (!silent) setLoading(true)

    try {
      const [connResult, outgoingResult, incomingResult] = await Promise.race([
        Promise.all([
          supabase
            .from('connections')
            .select('id')
            .or(
              `and(user_a.eq.${currentUserId},user_b.eq.${targetUserId}),and(user_a.eq.${targetUserId},user_b.eq.${currentUserId})`
            )
            .limit(1),
          supabase
            .from('connection_requests')
            .select('id')
            .eq('sender_id', currentUserId)
            .eq('receiver_id', targetUserId)
            .eq('status', 'pending')
            .limit(1),
          supabase
            .from('connection_requests')
            .select('id')
            .eq('sender_id', targetUserId)
            .eq('receiver_id', currentUserId)
            .eq('status', 'pending')
            .limit(1),
        ]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10_000)
        ),
      ])

      if (seq !== fetchSeqRef.current || !mountedRef.current) return

      if (connResult.data && connResult.data.length > 0) {
        setStatus('connected')
      } else if (outgoingResult.data && outgoingResult.data.length > 0) {
        setStatus('requested')
      } else if (incomingResult.data && incomingResult.data.length > 0) {
        setStatus('pending')
      } else {
        setStatus('none')
      }
    } catch {
      // Timeout or network error — keep existing status
    } finally {
      if (seq === fetchSeqRef.current && mountedRef.current) setLoading(false)
    }
  }, [currentUserId, targetUserId, supabase])

  useEffect(() => {
    fetch()
  }, [fetch])

  useEffect(() => {
    if (!currentUserId || !targetUserId) return

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
        .channel(`relationship-${currentUserId}-${targetUserId}-${instanceId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connection_requests', filter: `sender_id=eq.${currentUserId}` }, () => fetch(true))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'connection_requests', filter: `sender_id=eq.${currentUserId}` }, () => fetch(true))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'connection_requests', filter: `sender_id=eq.${currentUserId}` }, () => fetch(true))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connection_requests', filter: `receiver_id=eq.${currentUserId}` }, () => fetch(true))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'connection_requests', filter: `receiver_id=eq.${currentUserId}` }, () => fetch(true))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'connection_requests', filter: `receiver_id=eq.${currentUserId}` }, () => fetch(true))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connections', filter: `user_a=eq.${currentUserId}` }, () => fetch(true))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connections', filter: `user_b=eq.${currentUserId}` }, () => fetch(true))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'connections', filter: `user_a=eq.${currentUserId}` }, () => fetch(true))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'connections', filter: `user_b=eq.${currentUserId}` }, () => fetch(true))
        .subscribe((subStatus) => {
          if ((subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') && mountedRef.current) {
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
  }, [currentUserId, targetUserId, supabase, fetch])

  return { status, loading }
}
