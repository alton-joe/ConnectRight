'use client'

import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UserCard from '@/components/users/UserCard'
import ViewProfileModal from '@/components/users/ViewProfileModal'
import WelcomePopup from '@/components/auth/WelcomePopup'
import ConnectedCard from './ConnectedCard'
import ChatWindow from '@/components/chat/ChatWindow'
import { useRealtime } from '@/providers/RealtimeProvider'
import { useAvailableUsers } from '@/hooks/useAvailableUsers'
import SiteFooter from '@/components/layout/SiteFooter'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/ui/UserAvatar'
import { useActiveChat } from '@/context/ActiveChatContext'
import { useTypingForConnections } from '@/hooks/useTypingForConnections'
import type { Profile, Message } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { INTERESTS, MAX_INTERESTS, getInterest } from '@/lib/interests'

interface LastMessageInfo {
  created_at: string
  sender_id: string
  read_at: string | null
}

interface HomeClientProps {
  currentUserId: string
  initialProfiles: Profile[]
  initialPendingCount: number
  initialChatId: string | null
  initialFullscreen: boolean
}

export default function HomeClient({
  currentUserId,
  initialProfiles,
  initialPendingCount: _initialPendingCount,
  initialChatId,
  initialFullscreen,
}: HomeClientProps) {
  const router = useRouter()
  const { connections } = useRealtime()
  const { users: allOtherProfiles } = useAvailableUsers(currentUserId, initialProfiles)
  const { setActiveChatConnectionId } = useActiveChat()
  const [chatPanelOpen, setChatPanelOpen] = useState(false)
  const [fullscreenChat, setFullscreenChat] = useState(initialFullscreen && !!initialChatId)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [connectedFilter, setConnectedFilter] = useState<'all' | 'unread'>('all')
  const [interestFilter, setInterestFilter] = useState<string[]>([])
  const [interestFilterOpen, setInterestFilterOpen] = useState(false)
  const interestFilterRef = useRef<HTMLDivElement>(null)
  // selectedConnectionId persists through the close animation so ChatWindow stays mounted
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [lastMessageInfo, setLastMessageInfo] = useState<Record<string, LastMessageInfo>>({})
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restoredFromUrl = useRef(false)

  // Track desktop breakpoint (md+) so the inline grid-template-columns animation
  // only runs on desktop. On mobile we stack vertically instead.
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const supabase = useMemo(() => createClient(), [])
  const homeChannelRef = useRef<RealtimeChannel | null>(null)
  const homeRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Discard stale fetch responses (e.g. a poll that started before a visibility-
  // change refetch) so the slower response can't overwrite the newer one.
  const fetchSeqRef = useRef(0)

  const openChat = (id: string) => {
    // On mobile, route to the standalone chat page so it opens full-screen
    // with its own back-button. The desktop two-pane experience is preserved
    // on md+ via the inline chat panel.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      router.push(`/chat/${id}`)
      return
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setSelectedConnectionId(id)
    setChatPanelOpen(true)
    setActiveChatConnectionId(id)
    const fsSuffix = fullscreenChat ? '&fs=1' : ''
    router.replace(`/home?chat=${id}${fsSuffix}`, { scroll: false })
  }

  const closeChat = () => {
    setFullscreenChat(false)
    setChatPanelOpen(false)
    setActiveChatConnectionId(null)
    router.replace('/home', { scroll: false })
    // Keep ChatWindow mounted until the close animation finishes
    closeTimerRef.current = setTimeout(() => {
      setSelectedConnectionId(null)
      closeTimerRef.current = null
    }, 380)
  }

  const toggleFullscreen = () => {
    setFullscreenChat((prev) => {
      const next = !prev
      if (selectedConnectionId) {
        const fsSuffix = next ? '&fs=1' : ''
        router.replace(`/home?chat=${selectedConnectionId}${fsSuffix}`, { scroll: false })
      }
      return next
    })
  }

  // Restore chat panel from URL on load (once connections are available)
  useEffect(() => {
    if (restoredFromUrl.current || !initialChatId || connections.length === 0) return
    const conn = connections.find((c) => c.id === initialChatId)
    if (conn) {
      restoredFromUrl.current = true
      openChat(initialChatId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections])

  // Clean up pending timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const fetchLatestMessages = useCallback(async () => {
    if (connections.length === 0) return
    const seq = ++fetchSeqRef.current
    const connectionIds = connections.map((c) => c.id)
    // Limit rows fetched: ordered DESC so first hit per connection_id is the latest.
    // Cap at connections*10 (min 50) so we reliably cover every connection without
    // pulling unbounded rows when message history is large.
    const rowLimit = Math.max(connections.length * 10, 50)
    const { data } = await supabase
      .from('messages')
      .select('id, connection_id, created_at, sender_id, read_at')
      .in('connection_id', connectionIds)
      .order('created_at', { ascending: false })
      .limit(rowLimit)

    // A newer fetch was started while this one was in-flight — discard stale result.
    if (seq !== fetchSeqRef.current) return

    if (data) {
      const map: Record<string, LastMessageInfo> = {}
      ;(data as Pick<Message, 'connection_id' | 'created_at' | 'sender_id' | 'read_at'>[]).forEach((msg) => {
        if (!map[msg.connection_id]) {
          map[msg.connection_id] = {
            created_at: msg.created_at,
            sender_id: msg.sender_id,
            read_at: msg.read_at ?? null,
          }
        }
      })
      setLastMessageInfo(map)
    }
  }, [connections, supabase])

  useEffect(() => {
    fetchLatestMessages()
  }, [fetchLatestMessages])

  // Subscribe to all new messages to keep ordering up to date, with reconnection
  useEffect(() => {
    if (connections.length === 0) return

    const connectionIds = new Set(connections.map((c) => c.id))

    const createChannel = () => {
      if (homeRetryTimerRef.current) {
        clearTimeout(homeRetryTimerRef.current)
        homeRetryTimerRef.current = null
      }

      if (homeChannelRef.current) {
        supabase.removeChannel(homeChannelRef.current)
        homeChannelRef.current = null
      }

      const ch = supabase
        .channel('home-messages-order')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const msg = payload.new as Message
            if (connectionIds.has(msg.connection_id)) {
              setLastMessageInfo((prev) => ({
                ...prev,
                [msg.connection_id]: {
                  created_at: msg.created_at,
                  sender_id: msg.sender_id,
                  read_at: msg.read_at ?? null,
                },
              }))
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
          (payload) => {
            // Read-receipts flip read_at — clear "unread" state on the affected
            // connection. We only have access to the updated row's connection_id,
            // and a row only matters if it's *this connection's most recent* row.
            const msg = payload.new as Message
            if (!connectionIds.has(msg.connection_id)) return
            setLastMessageInfo((prev) => {
              const cur = prev[msg.connection_id]
              if (!cur) return prev
              // Only react if this update is for the message we're tracking as
              // "latest" (created_at matches) — older rows being updated don't
              // change our unread state.
              if (cur.created_at !== msg.created_at) return prev
              if (cur.read_at === (msg.read_at ?? null)) return prev
              return {
                ...prev,
                [msg.connection_id]: { ...cur, read_at: msg.read_at ?? null },
              }
            })
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            supabase.removeChannel(ch)
            homeChannelRef.current = null
            homeRetryTimerRef.current = setTimeout(createChannel, 2000)
          }
        })

      homeChannelRef.current = ch
    }

    createChannel()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestMessages()
        createChannel()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (homeRetryTimerRef.current) {
        clearTimeout(homeRetryTimerRef.current)
        homeRetryTimerRef.current = null
      }
      if (homeChannelRef.current) {
        supabase.removeChannel(homeChannelRef.current)
        homeChannelRef.current = null
      }
    }
  }, [connections, supabase, fetchLatestMessages])

  const sortedConnections = useMemo(() => {
    return [...connections].sort((a, b) => {
      const timeA = lastMessageInfo[a.id]?.created_at ?? a.created_at
      const timeB = lastMessageInfo[b.id]?.created_at ?? b.created_at
      return new Date(timeB).getTime() - new Date(timeA).getTime()
    })
  }, [connections, lastMessageInfo])

  // Clear the unread flag for whichever chat is open — markAsRead in
  // useMessages hits the DB, the UPDATE subscription above propagates that
  // back, but doing it locally too removes the round-trip latency.
  useEffect(() => {
    if (!selectedConnectionId) return
    setLastMessageInfo((prev) => {
      const cur = prev[selectedConnectionId]
      if (!cur || cur.sender_id === currentUserId || cur.read_at) return prev
      return {
        ...prev,
        [selectedConnectionId]: { ...cur, read_at: new Date().toISOString() },
      }
    })
  }, [selectedConnectionId, currentUserId])

  // Per-connection typing indicators for the connected list.
  const connectionIdsList = useMemo(() => connections.map((c) => c.id), [connections])
  const typingMap = useTypingForConnections(currentUserId, connectionIdsList)

  // FLIP: animate cards smoothly when their position in the list changes.
  // The actual slide-from-bottom-to-top happens when a new inbound message
  // bumps a card to position 0.
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const prevRectsRef = useRef(new Map<string, DOMRect>())
  useLayoutEffect(() => {
    const newRects = new Map<string, DOMRect>()
    cardRefs.current.forEach((el, id) => {
      if (el) newRects.set(id, el.getBoundingClientRect())
    })
    newRects.forEach((rect, id) => {
      const prev = prevRectsRef.current.get(id)
      if (!prev) return
      const dy = prev.top - rect.top
      if (dy === 0) return
      const el = cardRefs.current.get(id)
      if (!el || typeof el.animate !== 'function') return
      el.animate(
        [
          { transform: `translateY(${dy}px)` },
          { transform: 'translateY(0)' },
        ],
        { duration: 360, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
      )
    })
    prevRectsRef.current = newRects
  }, [sortedConnections])

  const connectedIds = useMemo(
    () => new Set([...connections.map((c) => c.user_a), ...connections.map((c) => c.user_b)]),
    [connections]
  )

  const availableProfiles = useMemo(
    () => {
      const base = allOtherProfiles.filter((p) => !connectedIds.has(p.id))
      if (interestFilter.length === 0) return base
      // OR semantics — any matching interest qualifies the profile.
      return base.filter((p) => p.interests?.some((id) => interestFilter.includes(id)))
    },
    [allOtherProfiles, connectedIds, interestFilter]
  )

  useEffect(() => {
    if (!interestFilterOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (interestFilterRef.current && !interestFilterRef.current.contains(e.target as Node)) {
        setInterestFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [interestFilterOpen])

  const toggleInterestFilter = (id: string) => {
    setInterestFilter((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_INTERESTS) return prev
      return [...prev, id]
    })
  }

  const selectedConnection = connections.find((c) => c.id === selectedConnectionId)

  return (
    <div className="bg-black flex flex-col pt-16 md:pt-24">
      {/* On mobile: natural document flow, sections stack and content scrolls.
          On md+: fixed-height workspace so the three-pane grid fills the viewport. */}
      <div className="md:h-[calc(100vh-96px)] max-w-6xl w-full mx-auto px-4 py-4 md:py-6 flex flex-col">
        {/*
          Mobile: single-column flex layout — Available stacks above Connected, full page scrolls.
          md+: keep the original three-column interpolating grid (Available | Connected | Chat panel).
        */}
        <div
          className="flex-1 min-h-0 flex flex-col md:grid gap-4 md:gap-6"
          style={
            isDesktop
              ? {
                  gridTemplateColumns: chatPanelOpen ? '1fr 1fr 2fr' : '1.1fr 1.9fr 0px',
                  transition: 'grid-template-columns 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                }
              : undefined
          }
        >

          {/* LEFT — Available Users */}
          <section className="bg-zinc-900 border border-white/10 rounded-2xl p-4 md:p-5 flex flex-col gap-4 md:overflow-hidden">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <h2 className="text-white font-semibold text-base">Available Users</h2>
              <div className="flex items-center gap-2">
                <div className="relative" ref={interestFilterRef}>
                  <button
                    onClick={() => setInterestFilterOpen((v) => !v)}
                    className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 cursor-pointer transition-colors ${
                      interestFilter.length > 0
                        ? 'bg-white/10 text-white border border-white/30'
                        : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                    aria-label="Filter by interests"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                    </svg>
                    Filter
                    {interestFilter.length > 0 && (
                      <span className="bg-white text-black text-[10px] font-bold rounded-full px-1.5 py-0 leading-tight">
                        {interestFilter.length}
                      </span>
                    )}
                  </button>
                  {interestFilterOpen && (
                    <div className="absolute right-0 top-full mt-2 z-30 w-[min(18rem,calc(100vw-2rem))] bg-zinc-950 border border-white/10 rounded-xl shadow-2xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/60 text-xs">Filter by interest <span className="text-white/30">(max 5)</span></p>
                        <span className={`text-[11px] tabular-nums ${interestFilter.length >= MAX_INTERESTS ? 'text-white' : 'text-white/40'}`}>
                          {interestFilter.length}/{MAX_INTERESTS}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto">
                        {INTERESTS.map((it) => {
                          const selected = interestFilter.includes(it.id)
                          const atLimit = interestFilter.length >= MAX_INTERESTS && !selected
                          return (
                            <button
                              key={it.id}
                              onClick={() => toggleInterestFilter(it.id)}
                              disabled={atLimit}
                              className={`inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border transition-colors ${
                                selected
                                  ? 'border-white bg-white/10 text-white cursor-pointer'
                                  : atLimit
                                  ? 'border-white/5 bg-white/3 text-white/25 cursor-not-allowed'
                                  : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white cursor-pointer'
                              }`}
                            >
                              <span className="shrink-0">{it.icon}</span>
                              {it.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {interestFilter.length > 0 && (
                  <button
                    onClick={() => setInterestFilter([])}
                    aria-label="Clear filters"
                    className="group relative p-1.5 rounded-full bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    <span className="pointer-events-none absolute right-0 top-full mt-1.5 whitespace-nowrap text-[11px] bg-zinc-950 border border-white/10 text-white/80 rounded px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      Clear
                    </span>
                  </button>
                )}
              </div>
            </div>

            {interestFilter.length > 0 && (
              <div className="flex flex-wrap gap-1.5 shrink-0">
                {interestFilter.map((id) => {
                  const it = getInterest(id)
                  if (!it) return null
                  return (
                    <button
                      key={id}
                      onClick={() => toggleInterestFilter(id)}
                      className="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 border border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                    >
                      {it.label}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )
                })}
              </div>
            )}

            {availableProfiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {interestFilter.length > 0 ? (
                  <>
                    <p className="text-white/30 text-sm">No users match these interests.</p>
                    <button
                      onClick={() => setInterestFilter([])}
                      className="text-white/80 hover:text-white text-xs cursor-pointer transition-colors underline"
                    >
                      Clear filters
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-white/30 text-sm">No other users yet.</p>
                    <p className="text-white/20 text-xs">Invite someone to join!</p>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 md:flex-1 md:overflow-y-auto">
                {availableProfiles.map((profile) => (
                  <UserCard
                    key={profile.id}
                    profile={profile}
                    currentUserId={currentUserId}
                    compact={chatPanelOpen}
                  />
                ))}
              </div>
            )}
          </section>

          {/* MIDDLE (or RIGHT when no chat) — Connected list */}
          <section className="bg-zinc-900 border border-white/10 rounded-2xl p-4 md:p-5 flex flex-col gap-4 md:overflow-hidden">
            <h2 className="text-white font-semibold text-base shrink-0">Connected</h2>
            {connections.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <p className="text-white/30 text-sm">No users connected with yet.</p>
                <p className="text-white/20 text-xs">Send a connection request to get started.</p>
              </div>
            ) : (
              <>
                {/* Filter toggle */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setConnectedFilter('all')}
                    aria-pressed={connectedFilter === 'all'}
                    className={`text-xs font-medium rounded-full px-3 py-1 transition-colors ${
                      connectedFilter === 'all'
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setConnectedFilter('unread')}
                    aria-pressed={connectedFilter === 'unread'}
                    className={`text-xs font-medium rounded-full px-3 py-1 transition-colors ${
                      connectedFilter === 'unread'
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    Unread
                  </button>
                </div>

                <div className="flex flex-col gap-3 md:flex-1 md:overflow-y-auto">
                  {(() => {
                    const visible = sortedConnections
                      .map((conn) => {
                        const info = lastMessageInfo[conn.id]
                        const hasUnread = !!(info && info.sender_id !== currentUserId && !info.read_at)
                        return { conn, hasUnread }
                      })
                      .filter(({ hasUnread }) => connectedFilter === 'all' || hasUnread)

                    if (visible.length === 0 && connectedFilter === 'unread') {
                      return (
                        <p className="text-white/30 text-sm mt-6 text-center">No unread chats.</p>
                      )
                    }

                    return visible.map(({ conn, hasUnread }) => (
                      <ConnectedCard
                        key={conn.id}
                        ref={(el: HTMLDivElement | null) => {
                          if (el) cardRefs.current.set(conn.id, el)
                          else cardRefs.current.delete(conn.id)
                        }}
                        connection={conn}
                        isSelected={conn.id === selectedConnectionId && chatPanelOpen}
                        isTyping={!!typingMap[conn.id]}
                        hasUnread={hasUnread}
                        onChat={() => openChat(conn.id)}
                      />
                    ))
                  })()}
                </div>
              </>
            )}
          </section>

          {/*
            RIGHT — Chat panel. Hidden on mobile; on mobile the chat opens
            full-screen via /chat/[connectionId]. md+ keeps the desktop slide-in.
            overflow-hidden on the wrapper clips content during the column collapse.
            The inner section fades + slides in/out independently.
          */}
          <div className="hidden md:block overflow-hidden min-w-0">
            <section
              className="bg-zinc-900 border border-white/10 flex flex-col overflow-hidden"
              style={fullscreenChat ? {
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                borderRadius: 0,
                opacity: 1,
                transform: 'none',
                pointerEvents: 'auto',
              } : {
                width: '100%',
                height: '100%',
                borderRadius: '1rem',
                opacity: chatPanelOpen ? 1 : 0,
                transform: chatPanelOpen ? 'translateX(0)' : 'translateX(20px)',
                transition: 'opacity 280ms ease-out, transform 280ms ease-out',
                pointerEvents: chatPanelOpen ? 'auto' : 'none',
              }}
            >
              {selectedConnectionId && (
                <>
                  {/* Chat header */}
                  <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 shrink-0">
                    <button
                      onClick={closeChat}
                      className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                      aria-label="Close chat"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (selectedConnection?.other_user) setProfileModalOpen(true) }}
                      disabled={!selectedConnection?.other_user}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-white/5 transition-colors cursor-pointer disabled:cursor-default disabled:hover:bg-transparent"
                      aria-label="View profile"
                    >
                      <div className="relative shrink-0">
                        <UserAvatar
                          username={selectedConnection?.other_user?.username ?? '?'}
                          avatarUrl={selectedConnection?.other_user?.avatar_url}
                          size={32}
                        />
                        {selectedConnection?.other_user && Date.now() - new Date(selectedConnection.other_user.last_active).getTime() < 5 * 60 * 1000 && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-zinc-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">
                          {selectedConnection?.other_user?.username ?? 'Unknown'}
                        </p>
                        {selectedConnection?.other_user && Date.now() - new Date(selectedConnection.other_user.last_active).getTime() < 5 * 60 * 1000 && (
                          <p className="text-green-500 text-[11px] leading-none mt-0.5">Active now</p>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={toggleFullscreen}
                      className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 ml-auto shrink-0"
                      aria-label={fullscreenChat ? 'Exit fullscreen' : 'Fullscreen chat'}
                    >
                      {fullscreenChat ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="4 14 10 14 10 20"/>
                          <polyline points="20 10 14 10 14 4"/>
                          <line x1="10" y1="14" x2="3" y2="21"/>
                          <line x1="21" y1="3" x2="14" y2="10"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 3 21 3 21 9"/>
                          <polyline points="9 21 3 21 3 15"/>
                          <line x1="21" y1="3" x2="14" y2="10"/>
                          <line x1="3" y1="21" x2="10" y2="14"/>
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Chat body */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    <ChatWindow
                      connectionId={selectedConnectionId}
                      currentUserId={currentUserId}
                    />
                  </div>
                </>
              )}
            </section>
          </div>

        </div>
      </div>

      <SiteFooter />
      <WelcomePopup />
      {selectedConnection?.other_user && (
        <ViewProfileModal
          profile={selectedConnection.other_user}
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
        />
      )}
    </div>
  )
}
