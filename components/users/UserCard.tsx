'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import UserAvatar from '@/components/ui/UserAvatar'
import ViewProfileModal from './ViewProfileModal'
import type { Profile } from '@/types'

interface UserCardProps {
  profile: Profile
  currentUserId: string
  compact?: boolean
}

type RequestStatus = 'none' | 'pending' | 'accepted'

export default function UserCard({ profile, currentUserId, compact = false }: UserCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('none')
  const [sending, setSending] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const checkStatus = async () => {

      // Check existing connection
      const { data: conn } = await supabase
        .from('connections')
        .select('id')
        .or(
          `and(user_a.eq.${currentUserId},user_b.eq.${profile.id}),and(user_a.eq.${profile.id},user_b.eq.${currentUserId})`
        )
        .single()

      if (conn) {
        setRequestStatus('accepted')
        return
      }

      // Check existing request
      const { data: req } = await supabase
        .from('connection_requests')
        .select('status')
        .eq('sender_id', currentUserId)
        .eq('receiver_id', profile.id)
        .single()

      if (req?.status === 'pending') setRequestStatus('pending')
    }

    checkStatus()
  }, [currentUserId, profile.id, supabase])

  // Live updates: when the other user accepts or declines our request, reflect it instantly
  useEffect(() => {
    if (requestStatus !== 'pending') return

    const ch = supabase
      .channel(`request-status-${currentUserId}-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connection_requests',
          filter: `sender_id=eq.${currentUserId}`,
        },
        (payload) => {
          const row = payload.new as { sender_id: string; receiver_id: string; status: string }
          if (row.sender_id !== currentUserId || row.receiver_id !== profile.id) return
          if (row.status === 'declined') setRequestStatus('none')
          if (row.status === 'accepted') setRequestStatus('accepted')
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [requestStatus, currentUserId, profile.id, supabase])

  const handleConnect = async () => {
    setSending(true)
    const { error } = await supabase.from('connection_requests').insert({
      sender_id: currentUserId,
      receiver_id: profile.id,
    })
    if (!error) setRequestStatus('pending')
    setSending(false)
  }

  return (
    <>
      <Card className="flex items-center gap-3">
        {/* Avatar */}
        <UserAvatar username={profile.username} avatarUrl={profile.avatar_url} size={40} />

        {/* Username + actions — stacked when compact (chat open), inline otherwise */}
        <div className={`flex-1 min-w-0 ${compact ? 'flex flex-col gap-1' : 'flex items-center gap-2'}`}>
          <p className="text-white font-medium truncate flex-1 min-w-0" title={profile.username}>
            {profile.username}
          </p>

          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setModalOpen(true)}
              aria-label="View profile"
              className={`rounded-lg border border-white/20 text-white/60 hover:text-white hover:bg-white/10 transition-colors ${compact ? 'p-1' : 'p-1.5'}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>

            {requestStatus === 'accepted' ? (
              <Button variant="ghost" size="sm" className={compact ? '!py-0.5 !text-xs' : ''} disabled>Connected</Button>
            ) : requestStatus === 'pending' ? (
              <Button variant="ghost" size="sm" className={compact ? '!py-0.5 !text-xs' : ''} disabled>Requested</Button>
            ) : (
              <Button variant="primary" size="sm" className={compact ? '!py-0.5 !text-xs' : ''} onClick={handleConnect} disabled={sending}>
                {sending ? '...' : 'Connect'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <ViewProfileModal
        profile={profile}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
