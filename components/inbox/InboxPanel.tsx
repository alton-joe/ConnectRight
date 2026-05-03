'use client'

import { useEffect, useState } from 'react'
import { useRealtime } from '@/providers/RealtimeProvider'
import RequestCard from './RequestCard'

interface InboxPanelProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
}

export default function InboxPanel({ isOpen, onClose, currentUserId: _currentUserId }: InboxPanelProps) {
  const { inboxRequests: hookRequests, refetchInbox: refetch } = useRealtime()

  // Optimistic removal overlay: IDs removed locally before the hook re-fetches.
  // Once the hook re-fetches (triggered by the UPDATE/DELETE realtime event),
  // the actioned request is gone from hookRequests too, so removedIds becomes stale
  // but harmless. InboxPanel unmounts on close, resetting this to empty automatically.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const visibleRequests = hookRequests.filter((r) => !removedIds.has(r.id))

  // Ensure data is fresh the moment the panel opens
  useEffect(() => {
    if (isOpen) refetch()
  }, [isOpen, refetch])

  const handleRemove = (id: string) => {
    setRemovedIds((prev) => new Set([...prev, id]))
  }

  return (
    <>
      {/* Backdrop — click outside the panel to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/40"
          onClick={onClose}
        />
      )}

      {/* Panel — full-screen on mobile, fixed-width right drawer on md+ */}
      <div
        className={`
          fixed right-0 top-16 md:top-24
          h-[calc(100dvh-64px)] md:h-[calc(100vh-96px)]
          w-full md:w-80 bg-zinc-900 md:border-l md:border-white/10 z-[60]
          flex flex-col transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <h2 className="text-white font-semibold">Inbox</h2>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center w-11 h-11 md:w-auto md:h-auto md:p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close inbox"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content — always renders immediately, no loading spinner */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {visibleRequests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 mt-12 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p className="text-white/40 text-sm">No pending requests</p>
            </div>
          ) : (
            visibleRequests.map((req) => (
              <RequestCard key={req.id} request={req} onRemove={handleRemove} />
            ))
          )}
        </div>
      </div>
    </>
  )
}
