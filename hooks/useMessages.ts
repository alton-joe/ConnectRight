'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseMessagesReturn {
  messages: Message[]
  loading: boolean
  error: string | null
  sendError: string | null
  sendMessage: (content: string) => Promise<boolean>
  refetch: () => Promise<void>
}

const MESSAGE_SELECT = `
  id,
  connection_id,
  sender_id,
  content,
  created_at,
  sender:profiles!sender_id (
    username
  )
` as const

function toMessage(row: {
  id: string
  connection_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: { username: string } | { username: string }[] | null
}): Message {
  return {
    id: row.id,
    connection_id: row.connection_id,
    sender_id: row.sender_id,
    content: row.content,
    created_at: row.created_at,
    sender: Array.isArray(row.sender)
      ? (row.sender[0] ?? undefined)
      : (row.sender ?? undefined),
  }
}

export function useMessages(
  connectionId: string | null,
  currentUserId: string | null
): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const mountedRef = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionKeepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Blocks poll from overwriting state while an insert is in-flight
  const sendingRef = useRef(false)
  // Prevents simultaneous reconnection attempts from focus + visibilitychange both firing
  const reconnectingRef = useRef(false)
  // Monotonically increasing counter ensures each channel gets a unique name on reconnect
  const channelCounterRef = useRef(0)
  // Sequence counter: only the fetch with the highest seq may update state.
  // Prevents a stale reconnect-fetch (started before a send) from overwriting the
  // fresh post-send fetch when the stale response arrives late.
  const fetchSeqRef = useRef(0)
  const instanceId = useMemo(() => Math.random().toString(36).slice(2, 9), [])

  const fetchMessages = useCallback(async () => {
    if (!connectionId || !currentUserId) return
    const seq = ++fetchSeqRef.current
    try {
      const { data, error: fetchErr } = await supabase
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: true })

      // A newer fetch was started while this one was in-flight — discard stale result.
      if (seq !== fetchSeqRef.current) return

      if (fetchErr) {
        console.error('[useMessages] Fetch error:', fetchErr)
        if (mountedRef.current) setError('Failed to load messages.')
      } else if (mountedRef.current) {
        setError(null)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMessages((data ?? []).map((row: any) => toMessage(row)))
      }
    } catch (err) {
      if (seq !== fetchSeqRef.current) return
      console.error('[useMessages] Unexpected fetch error:', err)
      if (mountedRef.current) setError('Failed to load messages.')
    } finally {
      if (seq === fetchSeqRef.current && mountedRef.current) setLoading(false)
    }
  }, [connectionId, currentUserId, supabase])

  useEffect(() => {
    if (!connectionId || !currentUserId) {
      setLoading(false)
      return
    }

    mountedRef.current = true
    setLoading(true)

    fetchMessages()

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

      const channelName = `messages-${connectionId}-${instanceId}-${++channelCounterRef.current}`
      const ch = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `connection_id=eq.${connectionId}`,
          },
          async (payload) => {
            if (!mountedRef.current) return
            const raw = payload.new as Message

            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', raw.sender_id)
              .single()

            const msg: Message = {
              ...raw,
              sender: profileData ? { username: profileData.username } : undefined,
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
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

    // Layer 2: poll every 5 s as safety net if Realtime misses an event
    pollIntervalRef.current = setInterval(() => {
      if (!sendingRef.current) fetchMessages()
    }, 5_000)

    // Layer 4: keep auth session alive every 10 minutes so idle users stay authenticated
    sessionKeepaliveRef.current = setInterval(async () => {
      if (!mountedRef.current) return
      try {
        await supabase.auth.refreshSession()
      } catch {
        // Suppress Web Lock contention if sendMessage happens to refresh concurrently
      }
    }, 10 * 60 * 1000)

    // Layer 3: reconnect on both tab switch and app switch (they cover different OS scenarios)
    const reconnect = async () => {
      if (!mountedRef.current || reconnectingRef.current) return
      reconnectingRef.current = true
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/')
          return
        }
        // Do NOT call refreshSession() here — the keepalive interval owns that responsibility.
        // Calling it concurrently with the keepalive causes Web Lock contention errors.
        createChannel()
        await fetchMessages()
      } finally {
        reconnectingRef.current = false
      }
    }

    // visibilitychange: switching between browser tabs
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      reconnect()
    }

    // focus: switching from another application back to the browser
    const handleFocus = () => {
      reconnect()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      mountedRef.current = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      if (sessionKeepaliveRef.current) {
        clearInterval(sessionKeepaliveRef.current)
        sessionKeepaliveRef.current = null
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
  }, [connectionId, currentUserId, instanceId, supabase, fetchMessages, router])

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!connectionId || !currentUserId) {
        console.error('[useMessages] sendMessage called with missing connectionId or currentUserId')
        return false
      }

      const trimmed = content.trim()
      if (!trimmed || trimmed.length > 2000) return false

      // Client-generated UUID makes the insert idempotent: if the first attempt
      // succeeded but the network response was lost, the retry gets a 23505 conflict
      // instead of inserting a duplicate row.
      const msgId = crypto.randomUUID()
      const optimistic: Message = {
        id: msgId,
        connection_id: connectionId,
        sender_id: currentUserId,
        content: trimmed,
        created_at: new Date().toISOString(),
      }

      // Show the message instantly so the sender never sees a blank gap.
      // Realtime and fetchMessages deduplicate by id, so no double-render.
      setSendError(null)
      setMessages((prev) => {
        if (prev.some((m) => m.id === msgId)) return prev
        return [...prev, optimistic]
      })
      sendingRef.current = true

      const doInsert = () =>
        supabase.from('messages')
          .insert({
            id: msgId,
            connection_id: connectionId,
            sender_id: currentUserId,
            content: trimmed,
          })
          .select('id, created_at')
          .single()

      try {
        let { data, error } = await doInsert()

        if (error) {
          // Expired JWT / stale RLS / network blip — refresh session and retry once.
          // Wrap refreshSession in try/catch: after a tab switch Supabase's own
          // auto-refresh fires at the same time and may steal the Web Lock, causing
          // refreshSession to throw. The catch is safe — the auto-refresh already
          // obtained a fresh token we can use for the retry.
          console.warn('[useMessages] Insert failed, refreshing session and retrying:', error.message, error.code)
          try { await supabase.auth.refreshSession() } catch { /* lock contention ok */ }
          ;({ data, error } = await doInsert())
        }

        if (error) {
          if (error.code === '23505') {
            // Unique conflict: first attempt succeeded but the response was lost.
            // The row is already in the DB — sync the server timestamp and move on.
            const { data: existing } = await supabase
              .from('messages')
              .select('id, created_at')
              .eq('id', msgId)
              .single()
            if (existing && mountedRef.current) {
              setMessages((prev) =>
                prev.map((m) => (m.id === msgId ? { ...optimistic, created_at: existing.created_at } : m))
              )
            }
            return true
          }
          console.error('[useMessages] Insert failed after retry:', error.message, error.code, error.details)
          if (mountedRef.current) {
            setMessages((prev) => prev.filter((m) => m.id !== msgId))
            setSendError('Message failed to send. Please try again.')
          }
          return false
        }

        // Sync server-generated timestamp onto the optimistic row.
        if (data && mountedRef.current) {
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...optimistic, created_at: data.created_at } : m))
          )
        }

        // Fire-and-forget fetch to hydrate sender profile and confirm DB consistency.
        // Not awaited — optimistic row already shows the message; this is a background sync.
        void fetchMessages()
        return true
      } catch (err) {
        console.error('[useMessages] Unexpected send error:', err)
        if (mountedRef.current) {
          setMessages((prev) => prev.filter((m) => m.id !== msgId))
          setSendError('Message failed to send. Please try again.')
        }
        return false
      } finally {
        sendingRef.current = false
      }
    },
    [connectionId, currentUserId, supabase, fetchMessages]
  )

  return { messages, loading, error, sendError, sendMessage, refetch: fetchMessages }
}
