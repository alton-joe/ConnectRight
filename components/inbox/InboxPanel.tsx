'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import RequestCard from './RequestCard'
import type { ConnectionRequest } from '@/types'

interface InboxPanelProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
}

export default function InboxPanel({ isOpen, onClose, currentUserId }: InboxPanelProps) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const fetchRequests = useCallback(async () => {
    if (!currentUserId) return
    setLoading(true)
    const { data } = await supabase
      .from('connection_requests')
      .select(
        `*, sender:profiles!connection_requests_sender_id_fkey(id, username, email, avatar_url, last_active, created_at)`
      )
      .eq('receiver_id', currentUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    setRequests((data as ConnectionRequest[]) ?? [])
    setLoading(false)
  }, [currentUserId, supabase])

  useEffect(() => {
    if (isOpen) fetchRequests()
  }, [isOpen, fetchRequests])

  // While the panel is open, listen for new incoming requests in real-time
  useEffect(() => {
    if (!isOpen || !currentUserId) return

    const ch = supabase
      .channel('inbox-live-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_requests',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => fetchRequests()
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [isOpen, currentUserId, supabase, fetchRequests])

  const handleRemove = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`
          fixed right-0 top-24 h-[calc(100vh-96px)] w-80 bg-zinc-900 border-l border-white/10 z-40
          flex flex-col transform transition-transform duration-300
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <h2 className="text-white font-semibold">Inbox</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close inbox"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-white/40 text-sm text-center mt-8">Loading...</p>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 mt-12 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p className="text-white/40 text-sm">No pending requests</p>
            </div>
          ) : (
            requests.map((req) => (
              <RequestCard key={req.id} request={req} onRemove={handleRemove} />
            ))
          )}
        </div>
      </div>
    </>
  )
}
