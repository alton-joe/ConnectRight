'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toaster'
import type { Connection, ConnectionRequest, Profile } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface RawConnection {
  id: string
  user_a: string
  user_b: string
  created_at: string
  profile_a: Profile | null
  profile_b: Profile | null
}

interface RealtimeContextValue {
  inboxRequests: ConnectionRequest[]
  inboxCount: number
  connections: Connection[]
  loading: { inbox: boolean; connections: boolean }
  refetchInbox: () => Promise<void>
  refetchConnections: () => Promise<void>
  refetchAll: () => Promise<void>
}

const NOOP_VALUE: RealtimeContextValue = {
  inboxRequests: [],
  inboxCount: 0,
  connections: [],
  loading: { inbox: false, connections: false },
  refetchInbox: async () => {},
  refetchConnections: async () => {},
  refetchAll: async () => {},
}

const RealtimeContext = createContext<RealtimeContextValue>(NOOP_VALUE)

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext)
}

interface RealtimeProviderProps {
  userId: string | null
  children: React.ReactNode
}

export function RealtimeProvider({ userId, children }: RealtimeProviderProps) {
  const supabase = useMemo(() => createClient(), [])
  const { showToast } = useToast()
  const [inboxRequests, setInboxRequests] = useState<ConnectionRequest[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [inboxLoading, setInboxLoading] = useState(false)
  const [connectionsLoading, setConnectionsLoading] = useState(false)

  const mountedRef = useRef(true)
  // Track which inbox request IDs we've already surfaced to avoid re-toasting
  // on every poll/refetch. Initialized lazily on first fetch so the user
  // doesn't get spammed with toasts for requests that were pending before
  // they loaded the page.
  const seenInboxIdsRef = useRef<Set<string> | null>(null)
  // Dedupe "your request was accepted" toasts — a single accept can produce
  // multiple UPDATE events as RLS / triggers settle.
  const notifiedAcceptedIdsRef = useRef<Set<string>>(new Set())
  const inboxChannelRef = useRef<RealtimeChannel | null>(null)
  const connectionsChannelRef = useRef<RealtimeChannel | null>(null)
  const outgoingChannelRef = useRef<RealtimeChannel | null>(null)
  const inboxRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectionsRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const outgoingRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inboxPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const connectionsPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectingRef = useRef(false)
  const inboxSeqRef = useRef(0)
  const connectionsSeqRef = useRef(0)
  const instanceId = useMemo(() => Math.random().toString(36).slice(2, 9), [])

  const fetchInbox = useCallback(async () => {
    if (!userId) {
      setInboxRequests([])
      setInboxLoading(false)
      return
    }
    const seq = ++inboxSeqRef.current
    setInboxLoading(true)
    try {
      const { data } = await Promise.race([
        supabase
          .from('connection_requests')
          .select(`
            *,
            sender:profiles!connection_requests_sender_id_fkey(
              id, username, email, avatar_url, region, interests, last_active, created_at
            )
          `)
          .eq('receiver_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10_000)
        ),
      ])
      if (seq !== inboxSeqRef.current || !mountedRef.current) return
      const next = (data as ConnectionRequest[]) ?? []
      if (seenInboxIdsRef.current === null) {
        // First fetch — establish baseline without toasting existing requests.
        seenInboxIdsRef.current = new Set(next.map((r) => r.id))
      } else {
        const seen = seenInboxIdsRef.current
        for (const req of next) {
          if (!seen.has(req.id)) {
            seen.add(req.id)
            const name = req.sender?.username
            showToast(
              name ? `@${name} sent you a connection request` : 'New connection request',
              'info'
            )
          }
        }
        // Drop ids that no longer exist (declined/accepted) so re-pending
        // (rare but possible via the RPC) re-toasts.
        const nextIdSet = new Set(next.map((r) => r.id))
        seen.forEach((id) => { if (!nextIdSet.has(id)) seen.delete(id) })
      }
      setInboxRequests(next)
    } catch {
      // Timeout or network error — keep existing state
    } finally {
      if (seq === inboxSeqRef.current && mountedRef.current) setInboxLoading(false)
    }
  }, [userId, supabase, showToast])

  const fetchConnections = useCallback(async () => {
    if (!userId) {
      setConnections([])
      setConnectionsLoading(false)
      return
    }
    const seq = ++connectionsSeqRef.current
    setConnectionsLoading(true)
    try {
      const { data } = await Promise.race([
        supabase
          .from('connections')
          .select(`
            id,
            user_a,
            user_b,
            created_at,
            profile_a:profiles!connections_user_a_fkey(id, username, email, avatar_url, region, interests, last_active, created_at),
            profile_b:profiles!connections_user_b_fkey(id, username, email, avatar_url, region, interests, last_active, created_at)
          `)
          .or(`user_a.eq.${userId},user_b.eq.${userId}`),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10_000)
        ),
      ])
      if (seq !== connectionsSeqRef.current || !mountedRef.current) return
      if (data) {
        const mapped: Connection[] = (data as unknown as RawConnection[]).map((row) => ({
          id: row.id,
          user_a: row.user_a,
          user_b: row.user_b,
          created_at: row.created_at,
          other_user:
            row.user_a === userId
              ? (row.profile_b ?? undefined)
              : (row.profile_a ?? undefined),
        }))
        setConnections(mapped)
      }
    } catch {
      // Timeout or network error — keep existing state
    } finally {
      if (seq === connectionsSeqRef.current && mountedRef.current) {
        setConnectionsLoading(false)
      }
    }
  }, [userId, supabase])

  const refetchAll = useCallback(async () => {
    await Promise.all([fetchInbox(), fetchConnections()])
  }, [fetchInbox, fetchConnections])

  useEffect(() => {
    mountedRef.current = true
    // Reset toast baseline so a fresh login establishes its own; otherwise
    // requests pending for the new user could spam toasts.
    seenInboxIdsRef.current = null
    notifiedAcceptedIdsRef.current = new Set()
    if (!userId) {
      setInboxRequests([])
      setConnections([])
      return () => {
        mountedRef.current = false
      }
    }

    const createInboxChannel = () => {
      if (!mountedRef.current) return
      if (inboxRetryRef.current) {
        clearTimeout(inboxRetryRef.current)
        inboxRetryRef.current = null
      }
      if (inboxChannelRef.current) {
        supabase.removeChannel(inboxChannelRef.current)
        inboxChannelRef.current = null
      }
      const ch = supabase
        .channel(`realtime-inbox-${userId}-${instanceId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'connection_requests', filter: `receiver_id=eq.${userId}` },
          () => fetchInbox()
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'connection_requests', filter: `receiver_id=eq.${userId}` },
          () => fetchInbox()
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'connection_requests', filter: `receiver_id=eq.${userId}` },
          () => fetchInbox()
        )
        .subscribe((status) => {
          if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && mountedRef.current) {
            supabase.removeChannel(ch)
            inboxChannelRef.current = null
            inboxRetryRef.current = setTimeout(createInboxChannel, 2000)
          }
        })
      inboxChannelRef.current = ch
    }

    const createConnectionsChannel = () => {
      if (!mountedRef.current) return
      if (connectionsRetryRef.current) {
        clearTimeout(connectionsRetryRef.current)
        connectionsRetryRef.current = null
      }
      if (connectionsChannelRef.current) {
        supabase.removeChannel(connectionsChannelRef.current)
        connectionsChannelRef.current = null
      }
      // Realtime filter syntax doesn't support OR across columns, so subscribe
      // to all connections changes and filter client-side. Volume is low.
      const ch = supabase
        .channel(`realtime-connections-${userId}-${instanceId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'connections' },
          (payload) => {
            const row = payload.new as { user_a: string; user_b: string }
            if (row.user_a === userId || row.user_b === userId) fetchConnections()
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'connections' },
          (payload) => {
            const row = payload.new as { user_a: string; user_b: string }
            if (row.user_a === userId || row.user_b === userId) fetchConnections()
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'connections' },
          () => {
            // payload.old only contains `id` without REPLICA IDENTITY FULL — refetch unconditionally
            fetchConnections()
          }
        )
        .subscribe((status) => {
          if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && mountedRef.current) {
            supabase.removeChannel(ch)
            connectionsChannelRef.current = null
            connectionsRetryRef.current = setTimeout(createConnectionsChannel, 2000)
          }
        })
      connectionsChannelRef.current = ch
    }

    const createOutgoingAcceptedChannel = () => {
      if (!mountedRef.current) return
      if (outgoingRetryRef.current) {
        clearTimeout(outgoingRetryRef.current)
        outgoingRetryRef.current = null
      }
      if (outgoingChannelRef.current) {
        supabase.removeChannel(outgoingChannelRef.current)
        outgoingChannelRef.current = null
      }
      // Listen for the receiver flipping our outgoing request to 'accepted',
      // then fetch the receiver's username for the toast copy.
      const ch = supabase
        .channel(`realtime-outgoing-${userId}-${instanceId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'connection_requests', filter: `sender_id=eq.${userId}` },
          async (payload) => {
            const row = payload.new as { id: string; status: string; receiver_id: string }
            if (row.status !== 'accepted') return
            if (notifiedAcceptedIdsRef.current.has(row.id)) return
            notifiedAcceptedIdsRef.current.add(row.id)
            const { data: receiver } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', row.receiver_id)
              .maybeSingle()
            if (!mountedRef.current) return
            const name = receiver?.username
            showToast(
              name ? `@${name} accepted your connection request` : 'Your connection request was accepted',
              'success'
            )
          }
        )
        .subscribe((status) => {
          if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && mountedRef.current) {
            supabase.removeChannel(ch)
            outgoingChannelRef.current = null
            outgoingRetryRef.current = setTimeout(createOutgoingAcceptedChannel, 2000)
          }
        })
      outgoingChannelRef.current = ch
    }

    fetchInbox()
    fetchConnections()
    createInboxChannel()
    createConnectionsChannel()
    createOutgoingAcceptedChannel()

    inboxPollRef.current = setInterval(() => {
      if (mountedRef.current) fetchInbox()
    }, 10_000)
    connectionsPollRef.current = setInterval(() => {
      if (mountedRef.current) fetchConnections()
    }, 10_000)

    // Channel-state watchdog: Realtime's CHANNEL_ERROR / TIMED_OUT callback
    // doesn't fire when a WebSocket closes silently while the tab was hidden.
    // Without this, the inbox / connections lists go stale until the user
    // refreshes the page.
    const watchdog = setInterval(() => {
      if (!mountedRef.current) return
      const inboxCh = inboxChannelRef.current
      if (inboxCh && (inboxCh.state === 'closed' || inboxCh.state === 'errored')) {
        console.warn('[RealtimeProvider] inbox channel state =', inboxCh.state, '— recreating')
        createInboxChannel()
      }
      const connCh = connectionsChannelRef.current
      if (connCh && (connCh.state === 'closed' || connCh.state === 'errored')) {
        console.warn('[RealtimeProvider] connections channel state =', connCh.state, '— recreating')
        createConnectionsChannel()
      }
      const outCh = outgoingChannelRef.current
      if (outCh && (outCh.state === 'closed' || outCh.state === 'errored')) {
        console.warn('[RealtimeProvider] outgoing channel state =', outCh.state, '— recreating')
        createOutgoingAcceptedChannel()
      }
    }, 15_000)

    // No manual refreshSession() timer — supabase-js auto-refreshes the JWT
    // on the singleton browser client. A second refresher here causes Web Lock
    // contention with the auto-refresh and stalls subsequent requests.

    const reconnect = () => {
      if (!mountedRef.current || reconnectingRef.current) return
      reconnectingRef.current = true
      try {
        fetchInbox()
        fetchConnections()
        createInboxChannel()
        createConnectionsChannel()
        createOutgoingAcceptedChannel()
      } finally {
        reconnectingRef.current = false
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') reconnect()
    }
    const handleFocus = () => reconnect()

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      mountedRef.current = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      clearInterval(watchdog)
      if (inboxPollRef.current) {
        clearInterval(inboxPollRef.current)
        inboxPollRef.current = null
      }
      if (connectionsPollRef.current) {
        clearInterval(connectionsPollRef.current)
        connectionsPollRef.current = null
      }
      if (inboxRetryRef.current) {
        clearTimeout(inboxRetryRef.current)
        inboxRetryRef.current = null
      }
      if (connectionsRetryRef.current) {
        clearTimeout(connectionsRetryRef.current)
        connectionsRetryRef.current = null
      }
      if (outgoingRetryRef.current) {
        clearTimeout(outgoingRetryRef.current)
        outgoingRetryRef.current = null
      }
      if (inboxChannelRef.current) {
        supabase.removeChannel(inboxChannelRef.current)
        inboxChannelRef.current = null
      }
      if (connectionsChannelRef.current) {
        supabase.removeChannel(connectionsChannelRef.current)
        connectionsChannelRef.current = null
      }
      if (outgoingChannelRef.current) {
        supabase.removeChannel(outgoingChannelRef.current)
        outgoingChannelRef.current = null
      }
    }
  }, [userId, supabase, instanceId, fetchInbox, fetchConnections, showToast])

  const value = useMemo<RealtimeContextValue>(
    () => ({
      inboxRequests,
      inboxCount: inboxRequests.length,
      connections,
      loading: { inbox: inboxLoading, connections: connectionsLoading },
      refetchInbox: fetchInbox,
      refetchConnections: fetchConnections,
      refetchAll,
    }),
    [inboxRequests, connections, inboxLoading, connectionsLoading, fetchInbox, fetchConnections, refetchAll]
  )

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}
