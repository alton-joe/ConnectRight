'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ChatWindow from '@/components/chat/ChatWindow'
import ActiveChatSetter from './ActiveChatSetter'
import ChatUserHeader from './ChatUserHeader'
import { useAuth } from '@/hooks/useAuth'
import { useRealtime } from '@/providers/RealtimeProvider'

export default function ChatPageClient({ connectionId }: { connectionId: string }) {
  const { user, loading: authLoading } = useAuth()
  const { connections, loading: realtimeLoading } = useRealtime()
  const router = useRouter()

  // Same trick as BackButton on /profile: prefer router.back() so the browser
  // restores the previous /home page from its in-memory cache (no server
  // round-trip, no data refetch). Fall back to a fresh push if there's no
  // history entry — e.g. the chat URL was opened directly.
  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/home')
    }
  }

  const connection = useMemo(
    () => connections.find((c) => c.id === connectionId) ?? null,
    [connections, connectionId]
  )

  // If the realtime list has loaded and this connection is missing, the user
  // doesn't own it (or it was just deleted) — bounce them back to /home.
  useEffect(() => {
    if (!realtimeLoading.connections && connections.length > 0 && !connection) {
      router.replace('/home')
    }
  }, [realtimeLoading.connections, connections.length, connection, router])

  // Auth gate — middleware should have prevented us from getting here without
  // a user, but in case the cookie expired client-side, push back to landing.
  useEffect(() => {
    if (!authLoading && !user) router.replace('/')
  }, [authLoading, user, router])

  const otherUser = connection?.other_user ?? null

  return (
    <div className="flex flex-col h-screen-dvh bg-black pt-16 md:pt-24">
      <div className="shrink-0 h-12 border-b border-white/10 flex items-center gap-2 px-3 md:px-4">
        <a
          href="/home"
          onClick={handleBack}
          className="inline-flex items-center justify-center w-11 h-11 md:w-auto md:h-auto md:p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Back to home"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </a>
        <ChatUserHeader otherUser={otherUser} />
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <ActiveChatSetter connectionId={connectionId} />
        {user && (
          <ChatWindow connectionId={connectionId} currentUserId={user.id} />
        )}
      </div>
    </div>
  )
}
