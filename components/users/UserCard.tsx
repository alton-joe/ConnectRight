'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import UserAvatar from '@/components/ui/UserAvatar'
import ViewProfileModal from './ViewProfileModal'
import { useRelationshipStatus } from '@/hooks/useRelationshipStatus'
import type { Profile } from '@/types'

interface UserCardProps {
  profile: Profile
  currentUserId: string
  compact?: boolean
}

export default function UserCard({ profile, currentUserId, compact = false }: UserCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [optimisticRequested, setOptimisticRequested] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const { status } = useRelationshipStatus(currentUserId, profile.id)

  // While the hook is still on its initial fetch, apply any optimistic override.
  // Once the hook returns a real status, the optimistic flag is shadowed.
  const displayStatus = optimisticRequested && status === 'none' ? 'requested' : status

  const handleConnect = async () => {
    setOptimisticRequested(true)
    // RPC because a raw INSERT fails with 23505 once any prior row exists for
    // this (sender, receiver) pair — declined/accepted rows can't be revived
    // by the sender under RLS. The RPC upserts back to 'pending'.
    const { error } = await supabase.rpc('send_connection_request', {
      target_id: profile.id,
    })

    if (error) {
      console.error('send_connection_request failed:', error)
      // Confirm via a quick read before reverting — realtime may have already
      // moved status to 'requested', in which case optimistic shadowing is fine.
      const { data: existing } = await supabase
        .from('connection_requests')
        .select('id')
        .eq('sender_id', currentUserId)
        .eq('receiver_id', profile.id)
        .eq('status', 'pending')
        .limit(1)
      if (!existing || existing.length === 0) setOptimisticRequested(false)
    }
    // On success the hook's INSERT/UPDATE subscription fires, sets status →
    // 'requested', which shadows the optimistic flag automatically.
  }

  const buttonContent = () => {
    if (displayStatus === 'connected') {
      return (
        <Button variant="ghost" size="sm" className={compact ? '!py-0.5 !text-xs' : ''} disabled>
          Connected
        </Button>
      )
    }
    if (displayStatus === 'requested') {
      return (
        <Button variant="ghost" size="sm" className={compact ? '!py-0.5 !text-xs' : ''} disabled>
          Requested
        </Button>
      )
    }
    if (displayStatus === 'pending') {
      return (
        <Button variant="ghost" size="sm" className={compact ? '!py-0.5 !text-xs' : ''} disabled>
          Pending
        </Button>
      )
    }
    return (
      <Button variant="primary" size="sm" className={compact ? '!py-0.5 !text-xs' : ''} onClick={handleConnect}>
        Connect
      </Button>
    )
  }

  return (
    <>
      <Card className="flex items-center gap-3">
        <UserAvatar username={profile.username} avatarUrl={profile.avatar_url} size={40} />

        <div className={`flex-1 min-w-0 ${compact ? 'flex flex-col gap-1' : 'flex flex-col sm:flex-row sm:items-center gap-2'}`}>
          <p className="text-white font-medium truncate flex-1 min-w-0" title={profile.username}>
            {profile.username}
          </p>

          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setModalOpen(true)}
              aria-label="View profile"
              className={`inline-flex items-center justify-center rounded-lg border border-white/20 text-white/60 hover:text-white hover:bg-white/10 transition-colors min-h-9 min-w-9 ${compact ? 'p-1' : 'p-1.5'}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>

            {buttonContent()}
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
