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
  markAsRead: () => Promise<void>
  refetch: () => Promise<void>
  peerTyping: boolean
  sendTyping: (typing: boolean) => void
}

const MESSAGE_SELECT = `
  id,
  connection_id,
  sender_id,
  content,
  created_at,
  delivered_at,
  read_at,
  sender:profiles!sender_id (
    username
  )
` as const

// Module-level cache: surviving across ChatWindow re-mounts so reopening a
// chat is instant. The hook still re-fetches in the background to catch
// anything that arrived while the chat was closed, but the UI can paint
// from cache without waiting on the network.
const messageCache = new Map<string, Message[]>()

function toMessage(row: {
  id: string
  connection_id: string
  sender_id: string
  content: string
  created_at: string
  delivered_at?: string | null
  read_at?: string | null
  sender?: { username: string } | { username: string }[] | null
}): Message {
  return {
    id: row.id,
    connection_id: row.connection_id,
    sender_id: row.sender_id,
    content: row.content,
    created_at: row.created_at,
    delivered_at: row.delivered_at ?? null,
    read_at: row.read_at ?? null,
    sender: Array.isArray(row.sender)
      ? (row.sender[0] ?? undefined)
      : (row.sender ?? undefined),
  }
}

export function useMessages(
  connectionId: string | null,
  currentUserId: string | null
): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>(() =>
    connectionId ? messageCache.get(connectionId) ?? [] : []
  )
  // If we have cached messages for this connection, the UI can render
  // immediately and we treat the background re-fetch as a silent refresh.
  const [loading, setLoading] = useState(() =>
    connectionId ? !messageCache.has(connectionId) : false
  )
  const [error, setError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [peerTyping, setPeerTyping] = useState(false)
  // Auto-clears the indicator if the peer stops sending refresh signals (e.g.
  // they closed the tab without firing a stop event).
  const peerTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const mountedRef = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  // Typing lives on its own deterministic channel name (`typing-${connectionId}`)
  // so the home screen can subscribe to typing broadcasts for chats it doesn't
  // have open. The message channel uses an instance-suffixed name and so is
  // unreachable from outside this hook instance.
  const typingChannelRef = useRef<RealtimeChannel | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
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
  // Cached access token + expiry. Populated from onAuthStateChange events
  // (push-based: supabase-js fires these after releasing its internal Web Lock,
  // so reading from this cache never contends). Reading the cache at send time
  // avoids calling supabase.auth.getSession() / refreshSession() which can
  // hang for tens of seconds when the auto-refresh holds the lock after idle.
  const tokenRef = useRef<string | null>(null)
  const tokenExpiryRef = useRef<number>(0)

  // Subscribe to auth state changes once per hook instance so the token cache
  // stays up to date with whatever supabase-js's internal auto-refresh has set.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token ?? null
      tokenExpiryRef.current = session?.expires_at ?? 0
    })
    // Prime the cache once at mount. Safe here — no other auth call is in
    // flight yet, so the Web Lock is free.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        tokenRef.current = session.access_token
        tokenExpiryRef.current = session.expires_at ?? 0
      }
    }).catch(() => { /* prime is best-effort */ })
    return () => subscription.unsubscribe()
  }, [supabase])

  // Bulk-mark every inbound message in this connection that hasn't been
  // delivered yet. Cheap to call repeatedly — the .is(null) filter makes it a no-op
  // once everything is already flagged. Triggered after fetch and on each inbound INSERT.
  // Race against a 5s timeout: if the auth Web Lock is contended, the underlying
  // supabase-js call can stall indefinitely. Bailing out lets the next poll cycle
  // try again with a (likely-released) lock instead of accumulating zombie awaits.
  const markDelivered = useCallback(async () => {
    if (!connectionId || !currentUserId) return
    try {
      await Promise.race([
        supabase
          .from('messages')
          .update({ delivered_at: new Date().toISOString() })
          .eq('connection_id', connectionId)
          .neq('sender_id', currentUserId)
          .is('delivered_at', null),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('markDelivered timeout')), 5_000)
        ),
      ])
    } catch (err) {
      console.warn('[useMessages] markDelivered failed:', err)
    }
  }, [connectionId, currentUserId, supabase])

  // Bulk-mark every inbound message read. Called by ChatWindow when the chat
  // is mounted/visible. Sets delivered_at too in case it was somehow skipped.
  const markAsRead = useCallback(async () => {
    if (!connectionId || !currentUserId) return
    try {
      const now = new Date().toISOString()
      await Promise.race([
        supabase
          .from('messages')
          .update({ read_at: now, delivered_at: now })
          .eq('connection_id', connectionId)
          .neq('sender_id', currentUserId)
          .is('read_at', null),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('markAsRead timeout')), 5_000)
        ),
      ])
    } catch (err) {
      console.warn('[useMessages] markAsRead failed:', err)
    }
  }, [connectionId, currentUserId, supabase])

  const fetchMessages = useCallback(async () => {
    if (!connectionId || !currentUserId) return
    const seq = ++fetchSeqRef.current
    try {
      // Race the query against a 5s timeout. The bare supabase-js call can hang
      // indefinitely when the auth Web Lock is held by an in-flight refresh —
      // that's what was leaving the receiver stuck on a stale message list and
      // causing the sender's bubble to stay on a single tick (delivered_at
      // never got written because the receiver's poll wasn't advancing).
      const { data, error: fetchErr } = await Promise.race([
        supabase
          .from('messages')
          .select(MESSAGE_SELECT)
          .eq('connection_id', connectionId)
          .order('created_at', { ascending: true }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('fetchMessages timeout')), 5_000)
        ),
      ])

      // A newer fetch was started while this one was in-flight — discard stale result.
      if (seq !== fetchSeqRef.current) return

      if (fetchErr) {
        console.error('[useMessages] Fetch error:', fetchErr)
        if (mountedRef.current) setError('Failed to load messages.')
      } else if (mountedRef.current) {
        setError(null)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMessages((data ?? []).map((row: any) => toMessage(row)))
        // Acknowledge receipt for any inbound messages we just learned about.
        void markDelivered()
      }
    } catch (err) {
      if (seq !== fetchSeqRef.current) return
      // Timeout / Web-Lock-stall / network hiccup. Don't clobber the list with
      // an error banner — the next poll will try again. Only log.
      console.warn('[useMessages] fetchMessages skipped:', (err as Error)?.message)
    } finally {
      if (seq === fetchSeqRef.current && mountedRef.current) setLoading(false)
    }
  }, [connectionId, currentUserId, supabase, markDelivered])

  useEffect(() => {
    if (!connectionId || !currentUserId) {
      setLoading(false)
      return
    }

    mountedRef.current = true
    // Hydrate from cache if available — paint the prior message list
    // synchronously, mark loading=false, and let the fetch refresh silently.
    const cached = messageCache.get(connectionId)
    if (cached && cached.length > 0) {
      setMessages(cached)
      setLoading(false)
    } else {
      setMessages([])
      setLoading(true)
    }

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

            // Lookup username — race against 3s timeout. If the auth Web Lock
            // stalls this query, we'd otherwise drop the inbound message
            // entirely (the setMessages call below sits behind the await). On
            // timeout we fall back to no username; the next fetch will fill
            // the field in.
            let profileData: { username: string } | null = null
            try {
              const result = await Promise.race([
                supabase
                  .from('profiles')
                  .select('username')
                  .eq('id', raw.sender_id)
                  .single(),
                new Promise<{ data: null }>((resolve) =>
                  setTimeout(() => resolve({ data: null }), 3_000)
                ),
              ])
              profileData = (result.data as { username: string } | null) ?? null
            } catch {
              profileData = null
            }

            if (!mountedRef.current) return
            const msg: Message = {
              ...raw,
              sender: profileData ? { username: profileData.username } : undefined,
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })

            // Inbound message just arrived — acknowledge delivery so the sender
            // sees the tick flip to double immediately.
            if (msg.sender_id !== currentUserId) void markDelivered()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `connection_id=eq.${connectionId}`,
          },
          (payload) => {
            if (!mountedRef.current) return
            const updated = payload.new as Message
            setMessages((prev) =>
              prev.map((m) =>
                m.id === updated.id
                  ? { ...m, delivered_at: updated.delivered_at ?? null, read_at: updated.read_at ?? null }
                  : m
              )
            )
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

    // Dedicated typing channel — deterministic name so the home view can also
    // listen for typing broadcasts on connections it doesn't have open.
    const createTypingChannel = () => {
      if (!mountedRef.current) return
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current)
        typingChannelRef.current = null
      }
      const tch = supabase
        .channel(`typing-${connectionId}`, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'typing' }, (payload) => {
          if (!mountedRef.current) return
          const data = payload.payload as { user_id?: string; typing?: boolean } | undefined
          if (!data || !data.user_id || data.user_id === currentUserId) return
          if (data.typing) {
            setPeerTyping(true)
            if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current)
            peerTypingTimerRef.current = setTimeout(() => {
              if (mountedRef.current) setPeerTyping(false)
            }, 4000)
          } else {
            if (peerTypingTimerRef.current) {
              clearTimeout(peerTypingTimerRef.current)
              peerTypingTimerRef.current = null
            }
            setPeerTyping(false)
          }
        })
        .subscribe()
      typingChannelRef.current = tch
    }
    createTypingChannel()

    // Layer 2: poll every 5 s as safety net if Realtime misses an event
    pollIntervalRef.current = setInterval(() => {
      if (!sendingRef.current) fetchMessages()
    }, 5_000)

    // Layer 2b: channel-state watchdog. Realtime's .subscribe() callback only
    // fires CHANNEL_ERROR / TIMED_OUT for explicit failures. A WebSocket that
    // closes while the tab was in the background can leave the channel sitting
    // in 'closed' / 'errored' state with no callback ever firing. Without this
    // watchdog the only way to recover is a manual page refresh — which is
    // exactly the symptom we're fixing.
    const watchdog = setInterval(() => {
      if (!mountedRef.current) return
      const ch = channelRef.current
      if (!ch) return
      if (ch.state === 'closed' || ch.state === 'errored') {
        console.warn('[useMessages] watchdog: channel state =', ch.state, '— recreating')
        createChannel()
      }
    }, 15_000)

    // No manual refreshSession() interval — supabase-js already auto-refreshes
    // the JWT on the singleton client. A second timer here just fights the
    // auto-refresh for the Web Lock and stalls future inserts.

    // Layer 3: reconnect on both tab switch and app switch (they cover different OS scenarios)
    // Reads tokenRef instead of calling supabase.auth.getSession(): if the auth
    // Web Lock is held by an auto-refresh at the moment focus returns, getSession()
    // can stall for 10+ seconds and starve realtime/poll. The cached token (kept
    // fresh by onAuthStateChange) is good enough to know whether we still have a
    // session at all.
    const reconnect = async () => {
      if (!mountedRef.current || reconnectingRef.current) return
      reconnectingRef.current = true
      try {
        if (!tokenRef.current) {
          router.push('/')
          return
        }
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
      clearInterval(watchdog)
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
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current)
        typingChannelRef.current = null
      }
      if (peerTypingTimerRef.current) {
        clearTimeout(peerTypingTimerRef.current)
        peerTypingTimerRef.current = null
      }
      setPeerTyping(false)
    }
  }, [connectionId, currentUserId, instanceId, supabase, fetchMessages, router])

  const sendTyping = useCallback(
    (typing: boolean) => {
      const ch = typingChannelRef.current
      if (!ch || !currentUserId) return
      // Fire-and-forget: ephemeral signal, fine if a packet is dropped.
      void ch.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: currentUserId, typing },
      })
    },
    [currentUserId]
  )

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!connectionId || !currentUserId) {
        console.error('[useMessages] sendMessage called with missing connectionId or currentUserId')
        return false
      }

      const trimmed = content.trim()
      if (!trimmed || trimmed.length > 2000) return false

      // Client-generated UUID makes the insert idempotent: a retry after a lost
      // response collides with the original row (23505) instead of double-writing.
      const msgId = crypto.randomUUID()

      setSendError(null)
      sendingRef.current = true

      // Append the confirmed row to local state (Realtime will also deliver it,
      // but the dedupe in the channel handler makes a double-add a no-op and
      // local append avoids waiting on the round-trip).
      const appendConfirmed = (created_at: string) => {
        if (!mountedRef.current) return
        const confirmed: Message = {
          id: msgId,
          connection_id: connectionId,
          sender_id: currentUserId,
          content: trimmed,
          created_at,
        }
        setMessages((prev) =>
          prev.some((m) => m.id === msgId) ? prev : [...prev, confirmed]
        )
      }

      // One insert attempt with a short timeout. The client UUID makes a retry
      // safe (collides with 23505 if the first one actually landed).
      type InsertResult = {
        data: { id: string; created_at: string } | null
        error: { code?: string; message?: string } | null
      }
      // Bypass supabase-js's request layer for the insert. The PostgREST REST
      // call is identical, but we get full control over fetch, AbortController,
      // and timing — and avoid any blocking inside supabase-js's internal queue
      // (which has been the source of the hangs after several messages).
      const restUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/messages`
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

      // Returns a valid access token without ever blocking on the supabase-js
      // auth Web Lock. Reads from tokenRef (kept fresh by onAuthStateChange).
      // If the cached token is near expiry, attempts a refresh raced against a
      // 2s timeout — if the lock is contended the timeout wins and we ship the
      // cached token anyway (supabase-js will refresh in the background and the
      // next send will pick up the new token). On forceRefresh, same race.
      // This replaces the previous implementation, which hung indefinitely
      // when supabase-js's auto-refresh held the lock after idle.
      const REFRESH_TIMEOUT_MS = 2_000
      const refreshWithTimeout = async (): Promise<string | null> => {
        const refresh = supabase.auth.refreshSession().then(({ data, error }) => {
          if (error || !data?.session?.access_token) return null
          // Update the cache eagerly — onAuthStateChange will also fire but may
          // be later than the next send.
          tokenRef.current = data.session.access_token
          tokenExpiryRef.current = data.session.expires_at ?? 0
          return data.session.access_token
        }).catch(() => null)
        const timeout = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), REFRESH_TIMEOUT_MS)
        )
        return Promise.race([refresh, timeout])
      }

      const getValidToken = async (forceRefresh: boolean): Promise<string> => {
        const cached = tokenRef.current
        const expiresAt = tokenExpiryRef.current
        const nowSec = Math.floor(Date.now() / 1000)
        const secsToExpiry = expiresAt - nowSec

        if (forceRefresh) {
          const refreshed = await refreshWithTimeout()
          if (refreshed) return refreshed
          // Refresh timed out or failed — fall back to cached token if we have one.
          if (cached) return cached
          throw new Error('NO_SESSION')
        }

        // Cache is fresh enough (more than 60s of life) — use it directly,
        // no auth API call at all.
        if (cached && secsToExpiry >= 60) {
          return cached
        }

        // Cache is missing or near expiry — try a bounded refresh.
        const refreshed = await refreshWithTimeout()
        if (refreshed) return refreshed
        if (cached) return cached
        throw new Error('NO_SESSION')
      }

      const doInsert = async (timeoutMs: number, forceRefresh = false): Promise<InsertResult> => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs)
        const t0 = performance.now()
        let token: string
        try {
          token = await getValidToken(forceRefresh)
        } catch (err) {
          clearTimeout(timer)
          if ((err as Error)?.message === 'NO_SESSION') {
            return { data: null, error: { code: 'NO_SESSION', message: 'Session expired. Please refresh the page.' } }
          }
          throw err
        }
        try {
          const res = await fetch(restUrl, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              apikey: anonKey,
              Authorization: `Bearer ${token}`,
              Prefer: 'return=representation',
            },
            body: JSON.stringify({
              id: msgId,
              connection_id: connectionId,
              sender_id: currentUserId,
              content: trimmed,
            }),
          })
          const elapsed = Math.round(performance.now() - t0)
          if (res.ok) {
            const rows = (await res.json()) as Array<{ id: string; created_at: string }>
            const row = rows[0]
            if (row) {
              return { data: { id: row.id, created_at: row.created_at }, error: null }
            }
            return { data: null, error: { code: 'EMPTY', message: 'insert returned no row' } }
          }
          const body = await res.text().catch(() => '')
          let parsed: { code?: string; message?: string } = {}
          try { parsed = JSON.parse(body) } catch { parsed = { message: body } }
          console.warn(`[useMessages] insert HTTP ${res.status} in ${elapsed}ms:`, parsed)
          return { data: null, error: { code: parsed.code ?? `HTTP_${res.status}`, message: parsed.message ?? `HTTP ${res.status}` } }
        } catch (err) {
          const elapsed = Math.round(performance.now() - t0)
          const isAbort = (err as Error)?.name === 'AbortError'
          const message = isAbort ? `aborted after ${timeoutMs}ms (network or supabase unreachable)` : (err as Error)?.message ?? 'fetch failed'
          console.warn(`[useMessages] insert threw after ${elapsed}ms:`, message)
          return { data: null, error: { code: isAbort ? 'TIMEOUT' : 'FETCH_ERROR', message } }
        } finally {
          clearTimeout(timer)
        }
      }

      const verifyRowInDb = async (): Promise<{ created_at: string } | null> => {
        try {
          const result = await Promise.race([
            supabase
              .from('messages')
              .select('created_at')
              .eq('id', msgId)
              .maybeSingle(),
            new Promise<{ data: null }>((resolve) =>
              setTimeout(() => resolve({ data: null }), 10_000)
            ),
          ])
          return (result.data as { created_at: string } | null) ?? null
        } catch {
          return null
        }
      }

      try {
        // Attempt 1 — generous 12s window. Supabase free tier can occasionally
        // take 5-10s on cold queries; killing too early causes spurious failures.
        let { data, error } = await doInsert(12_000)

        if (!error && data) {
          appendConfirmed(data.created_at)
          void fetchMessages()
          return true
        }

        // No usable session at all — short-circuit with a clear message.
        // No point retrying: nothing has changed between attempts.
        if (error?.code === 'NO_SESSION') {
          if (mountedRef.current) {
            setSendError('Session expired. Please refresh the page.')
          }
          return false
        }

        let verified = await verifyRowInDb()
        if (verified) {
          appendConfirmed(verified.created_at)
          void fetchMessages()
          return true
        }

        // 401 from PostgREST means our JWT was rejected — force a fresh refresh
        // (raced against 2s timeout inside getValidToken) and retry once.
        if (error?.code === 'HTTP_401') {
          console.warn('[useMessages] insert returned 401, refreshing session and retrying')
          ;({ data, error } = await doInsert(12_000, true))

          if (!error && data) {
            appendConfirmed(data.created_at)
            void fetchMessages()
            return true
          }

          verified = await verifyRowInDb()
          if (verified) {
            appendConfirmed(verified.created_at)
            void fetchMessages()
            return true
          }
        }

        console.warn('[useMessages] first attempt failed, retrying:', error?.code, error?.message)

        // Attempt 2 — same window. The client UUID makes a 23505 from a
        // lost-response collision safe; verifyRowInDb catches that case.
        ;({ data, error } = await doInsert(12_000))

        if (!error && data) {
          appendConfirmed(data.created_at)
          void fetchMessages()
          return true
        }

        verified = await verifyRowInDb()
        if (verified) {
          appendConfirmed(verified.created_at)
          void fetchMessages()
          return true
        }

        console.error('[useMessages] send failed after retry:', error?.code, error?.message)
        if (mountedRef.current) {
          setSendError(
            error?.message
              ? `Failed to send: ${error.message}`
              : 'Message failed to send. Please try again.'
          )
        }
        return false
      } catch (err) {
        console.error('[useMessages] unexpected send error:', err)
        const verified = await verifyRowInDb()
        if (verified) {
          appendConfirmed(verified.created_at)
          void fetchMessages()
          return true
        }
        if (mountedRef.current) {
          setSendError('Message failed to send. Please try again.')
        }
        return false
      } finally {
        sendingRef.current = false
      }
    },
    [connectionId, currentUserId, supabase, fetchMessages]
  )

  // Keep the module-level cache in sync with state so the next open paints
  // from cache without waiting on the network.
  useEffect(() => {
    if (connectionId) messageCache.set(connectionId, messages)
  }, [connectionId, messages])

  return { messages, loading, error, sendError, sendMessage, markAsRead, refetch: fetchMessages, peerTyping, sendTyping }
}
