'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useActiveChat } from '@/context/ActiveChatContext'
import { useInbox } from '@/hooks/useInbox'
import InboxPanel from '@/components/inbox/InboxPanel'
import { formatTime } from '@/utils/helpers'
import type { Message, ChatNotification } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

const NAV_LINKS = [
  { label: 'Home', href: '/home' },
  { label: 'Connect', href: '/home' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

const CYCLING_WORDS = ['Connect.', 'Discover.', 'Chat.', 'Network.', 'Belong.', 'Grow.']

// Only the username-setup page hides the header entirely
const HIDDEN_PATHS = ['/setup']

function TypewriterWord() {
  const [wordIndex, setWordIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing')

  useEffect(() => {
    const word = CYCLING_WORDS[wordIndex]

    if (phase === 'typing') {
      if (displayed.length < word.length) {
        const t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 110)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setPhase('pausing'), 1400)
      return () => clearTimeout(t)
    }

    if (phase === 'pausing') {
      const t = setTimeout(() => setPhase('deleting'), 200)
      return () => clearTimeout(t)
    }

    if (phase === 'deleting') {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed((d) => d.slice(0, -1)), 55)
        return () => clearTimeout(t)
      }
      setWordIndex((i) => (i + 1) % CYCLING_WORDS.length)
      setPhase('typing')
    }
  }, [displayed, phase, wordIndex])

  return (
    <span className="text-white font-bold text-3xl tracking-wide select-none">
      {displayed}
      <span className="inline-block w-[3px] h-8 bg-orange-500 ml-1 align-middle animate-pulse" />
    </span>
  )
}

export default function GlobalHeader() {
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const { activeChatConnectionId } = useActiveChat()
  const [inboxOpen, setInboxOpen] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  const { requests: pendingRequests } = useInbox(user?.id ?? '')
  const pendingCount = pendingRequests.length

  // Chat notification state
  const [chatNotifications, setChatNotifications] = useState<ChatNotification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const notifPanelRef = useRef<HTMLDivElement>(null)
  const activeChatRef = useRef<string | null>(null)
  const notifChannelRef = useRef<RealtimeChannel | null>(null)
  const notifRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Map of connectionId → { username, avatarUrl }
  const [connectionsMap, setConnectionsMap] = useState<Map<string, { username: string; avatarUrl: string | null }> | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchConnectionsMap = useCallback(async () => {
    if (!user || pathname === '/') return
    try {
      const { data } = await Promise.race([
        supabase
          .from('connections')
          .select(`
            id, user_a, user_b,
            profile_a:profiles!connections_user_a_fkey(username, avatar_url),
            profile_b:profiles!connections_user_b_fkey(username, avatar_url)
          `)
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10_000)
        ),
      ])
      if (data) {
        const map = new Map<string, { username: string; avatarUrl: string | null }>()
        ;(data as any[]).forEach((row) => {
          const rawOther = row.user_a === user.id ? row.profile_b : row.profile_a
          const other = Array.isArray(rawOther) ? rawOther[0] : rawOther
          if (other) map.set(row.id, { username: other.username, avatarUrl: other.avatar_url ?? null })
        })
        setConnectionsMap(map)
      }
    } catch {
      // Timeout or network error — keep current map
    }
  }, [user, pathname, supabase])

  // Fetch connections to build connectionId → other-user map, and refresh whenever
  // a new connection row is inserted (i.e. a request was accepted).
  useEffect(() => {
    if (!user || pathname === '/') return

    fetchConnectionsMap()

    // Refresh the map whenever the current user gains a new connection
    const ch = supabase
      .channel(`header-connections-map-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'connections' },
        (payload) => {
          const row = payload.new as { user_a: string; user_b: string }
          if (row.user_a === user.id || row.user_b === user.id) {
            fetchConnectionsMap()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [user, pathname, supabase, fetchConnectionsMap])

  // Refresh connections map when tab becomes visible after idle
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchConnectionsMap()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchConnectionsMap])

  // Keep activeChatRef in sync so the subscription callback always reads the latest value
  useEffect(() => {
    activeChatRef.current = activeChatConnectionId
    // Clear any buffered notifications for the chat the user just opened
    if (activeChatConnectionId) {
      setChatNotifications((prev) => prev.filter((n) => n.connectionId !== activeChatConnectionId))
    }
  }, [activeChatConnectionId])

  // Subscribe to all new messages and surface them as notifications when appropriate.
  // Includes reconnect logic so the channel recovers after network errors.
  useEffect(() => {
    if (!user || !connectionsMap) return

    const createNotifChannel = () => {
      if (notifRetryTimerRef.current) {
        clearTimeout(notifRetryTimerRef.current)
        notifRetryTimerRef.current = null
      }
      if (notifChannelRef.current) {
        supabase.removeChannel(notifChannelRef.current)
        notifChannelRef.current = null
      }

      const channel = supabase
        .channel(`header-chat-notifications-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const msg = payload.new as Message
            // Ignore own messages
            if (msg.sender_id === user.id) return
            // Ignore messages from the chat the user is currently viewing
            if (msg.connection_id === activeChatRef.current) return
            // Ignore messages from connections we don't know about
            const other = connectionsMap.get(msg.connection_id)
            if (!other) return

            setChatNotifications((prev) =>
              [
                {
                  id: msg.id,
                  connectionId: msg.connection_id,
                  senderUsername: other.username,
                  senderAvatarUrl: other.avatarUrl,
                  content: msg.content,
                  created_at: msg.created_at,
                },
                ...prev,
              ].slice(0, 20)
            )
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            supabase.removeChannel(channel)
            notifChannelRef.current = null
            notifRetryTimerRef.current = setTimeout(createNotifChannel, 2000)
          }
        })

      notifChannelRef.current = channel
    }

    createNotifChannel()

    return () => {
      if (notifRetryTimerRef.current) {
        clearTimeout(notifRetryTimerRef.current)
        notifRetryTimerRef.current = null
      }
      if (notifChannelRef.current) {
        supabase.removeChannel(notifChannelRef.current)
        notifChannelRef.current = null
      }
    }
  }, [user, connectionsMap, supabase])

  // Close notification panel when clicking outside
  useEffect(() => {
    if (!notifOpen) return
    const handleClick = (e: MouseEvent) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  if (HIDDEN_PATHS.includes(pathname)) return null

  const handleSignUp = async () => {
    setSigningIn(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    setSigningIn(false)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-24 bg-black border-b border-white/10 flex items-center justify-between px-6 z-40">
        {/* Brand */}
        <Link
          href="/"
          className="font-bold text-3xl tracking-tight hover:opacity-80 transition-opacity shrink-0 flex items-center"
        >
          <span className="text-white">Connect</span>
          <span className="text-orange-500">Right</span>
          <span className="text-white ml-1">.</span>
        </Link>

        {/* Center — typewriter on landing, nav links elsewhere */}
        <div className="absolute left-1/2 -translate-x-1/2">
          {pathname === '/' ? (
            <TypewriterWord />
          ) : (
            <nav className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="px-3 py-1.5 text-base text-white/60 hover:text-white rounded-lg transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* Right side — guest vs authenticated */}
        <div className="flex items-center gap-2 shrink-0">
          {authLoading ? null : !user ? (
            <button
              onClick={handleSignUp}
              disabled={signingIn}
              className="inline-flex items-center gap-2 bg-white text-black font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {signingIn ? 'Redirecting...' : 'Sign Up'}
            </button>
          ) : (
            <>
              {/* Chat message notifications */}
              <div className="relative" ref={notifPanelRef}>
                <button
                  onClick={() => setNotifOpen((o) => !o)}
                  className="relative p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Chat notifications"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {chatNotifications.length > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {chatNotifications.length > 99 ? '99+' : chatNotifications.length}
                    </span>
                  )}
                </button>

                {/* Notification dropdown */}
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <span className="text-white text-sm font-semibold">Messages</span>
                      {chatNotifications.length > 0 && (
                        <button
                          onClick={() => setChatNotifications([])}
                          className="text-white/40 hover:text-white text-xs transition-colors"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {chatNotifications.length === 0 ? (
                      <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <p className="text-white/30 text-sm">No new messages</p>
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                        {chatNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            className="flex items-start gap-3 px-4 py-3"
                          >
                            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0 mt-0.5">
                              {notif.senderUsername.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-white text-sm font-medium truncate">{notif.senderUsername}</span>
                                <span className="text-white/30 text-[11px] shrink-0">{formatTime(notif.created_at)}</span>
                              </div>
                              <p className="text-white/50 text-xs truncate mt-0.5">{notif.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Connection request inbox */}
              <button
                onClick={() => setInboxOpen(true)}
                className="relative p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Open inbox"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {pendingCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </button>

              <Link
                href="/profile"
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="View profile"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Link>
            </>
          )}
        </div>
      </header>

      {user && (
        <InboxPanel
          isOpen={inboxOpen}
          onClose={() => setInboxOpen(false)}
          currentUserId={user.id}
        />
      )}
    </>
  )
}
