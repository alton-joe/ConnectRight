'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UserCard from '@/components/users/UserCard'
import WelcomePopup from '@/components/auth/WelcomePopup'
import ConnectedCard from './ConnectedCard'
import ChatWindow from '@/components/chat/ChatWindow'
import { useConnections } from '@/hooks/useConnections'
import SiteFooter from '@/components/layout/SiteFooter'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/ui/UserAvatar'
import { useActiveChat } from '@/context/ActiveChatContext'
import type { Profile, Message } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface HomeClientProps {
  currentUserId: string
  initialProfiles: Profile[]
  initialPendingCount: number
  initialChatId: string | null
}

export default function HomeClient({
  currentUserId,
  initialProfiles,
  initialPendingCount: _initialPendingCount,
  initialChatId,
}: HomeClientProps) {
  const router = useRouter()
  const { connections, loading: connectionsLoading } = useConnections(currentUserId)
  const { setActiveChatConnectionId } = useActiveChat()
  // chatPanelOpen drives the CSS animation (grid column size + opacity/transform)
  const [chatPanelOpen, setChatPanelOpen] = useState(false)
  const [fullscreenChat, setFullscreenChat] = useState(false)
  // selectedConnectionId persists through the close animation so ChatWindow stays mounted
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [lastMessageAt, setLastMessageAt] = useState<Record<string, string>>({})
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restoredFromUrl = useRef(false)

  const supabase = useMemo(() => createClient(), [])
  const homeChannelRef = useRef<RealtimeChannel | null>(null)
  const homeRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openChat = (id: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setSelectedConnectionId(id)
    setChatPanelOpen(true)
    setActiveChatConnectionId(id)
    router.replace(`/home?chat=${id}`, { scroll: false })
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
    const connectionIds = connections.map((c) => c.id)
    // Limit rows fetched: ordered DESC so first hit per connection_id is the latest.
    // Cap at connections*10 (min 50) so we reliably cover every connection without
    // pulling unbounded rows when message history is large.
    const rowLimit = Math.max(connections.length * 10, 50)
    const { data } = await supabase
      .from('messages')
      .select('connection_id, created_at')
      .in('connection_id', connectionIds)
      .order('created_at', { ascending: false })
      .limit(rowLimit)

    if (data) {
      const map: Record<string, string> = {}
      ;(data as Pick<Message, 'connection_id' | 'created_at'>[]).forEach((msg) => {
        if (!map[msg.connection_id]) map[msg.connection_id] = msg.created_at
      })
      setLastMessageAt(map)
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
              setLastMessageAt((prev) => ({
                ...prev,
                [msg.connection_id]: msg.created_at,
              }))
            }
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
      const timeA = lastMessageAt[a.id] ?? a.created_at
      const timeB = lastMessageAt[b.id] ?? b.created_at
      return new Date(timeB).getTime() - new Date(timeA).getTime()
    })
  }, [connections, lastMessageAt])

  const connectedIds = useMemo(
    () => new Set([...connections.map((c) => c.user_a), ...connections.map((c) => c.user_b)]),
    [connections]
  )

  const availableProfiles = useMemo(
    () => initialProfiles.filter((p) => !connectedIds.has(p.id)),
    [initialProfiles, connectedIds]
  )

  const selectedConnection = connections.find((c) => c.id === selectedConnectionId)

  return (
    <div className="bg-black flex flex-col pt-24">
      <div className="h-[calc(100vh-96px)] max-w-6xl w-full mx-auto px-4 py-6 flex flex-col">
        {/*
          Always render 3 grid columns so grid-template-columns can interpolate
          between the two states. The third column transitions from 0px → 2fr.
        */}
        <div
          className="flex-1 min-h-0 grid gap-6"
          style={{
            gridTemplateColumns: chatPanelOpen ? '1fr 1fr 2fr' : '1.1fr 1.9fr 0px',
            transition: 'grid-template-columns 350ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >

          {/* LEFT — Available Users */}
          <section className="bg-zinc-900 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 overflow-hidden">
            <h2 className="text-white font-semibold text-base shrink-0">Available Users</h2>
            {availableProfiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p className="text-white/30 text-sm">No other users yet.</p>
                <p className="text-white/20 text-xs">Invite someone to join!</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
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
          <section className="bg-zinc-900 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 overflow-hidden">
            <h2 className="text-white font-semibold text-base shrink-0">Connected</h2>
            {connectionsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/30 text-sm">Loading...</p>
              </div>
            ) : connections.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <p className="text-white/30 text-sm">No users connected with yet.</p>
                <p className="text-white/20 text-xs">Send a connection request to get started.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                {sortedConnections.map((conn) => (
                  <ConnectedCard
                    key={conn.id}
                    connection={conn}
                    isSelected={conn.id === selectedConnectionId && chatPanelOpen}
                    onChat={() => openChat(conn.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/*
            RIGHT — Chat panel. Always in the DOM so CSS transitions work.
            overflow-hidden on the wrapper clips content during the column collapse.
            The inner section fades + slides in/out independently.
          */}
          <div className="overflow-hidden min-w-0">
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
                    <button
                      onClick={() => setFullscreenChat(f => !f)}
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
    </div>
  )
}
