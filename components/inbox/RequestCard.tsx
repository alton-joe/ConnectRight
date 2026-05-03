'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import UserAvatar from '@/components/ui/UserAvatar'
import ViewProfileModal from '@/components/users/ViewProfileModal'
import type { ConnectionRequest } from '@/types'
import { getInitial } from '@/utils/helpers'

interface RequestCardProps {
  request: ConnectionRequest
  onRemove: (id: string) => void
}

export default function RequestCard({ request, onRemove }: RequestCardProps) {
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const handleAccept = async () => {
    setLoading('accept')
    setError('')
    try {
      const { error: rpcError } = await Promise.race([
        supabase.rpc('accept_connection_request', { request_id: request.id }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10_000)
        ),
      ])
      if (rpcError) {
        console.error('accept_connection_request failed:', rpcError)
        setError(rpcError.message || 'Failed to accept. Try again.')
        return
      }
      onRemove(request.id)
    } catch (err) {
      console.error('accept_connection_request threw:', err)
      setError('Failed to accept. Try again.')
    } finally {
      setLoading(null)
    }
  }

  const handleDecline = async () => {
    setLoading('decline')
    setError('')
    try {
      const { error: updateError } = await Promise.race([
        supabase
          .from('connection_requests')
          .update({ status: 'declined' })
          .eq('id', request.id),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10_000)
        ),
      ])
      if (updateError) {
        console.error('decline request failed:', updateError)
        setError(updateError.message || 'Failed to decline. Try again.')
        return
      }
      onRemove(request.id)
    } catch (err) {
      console.error('decline request threw:', err)
      setError('Failed to decline. Try again.')
    } finally {
      setLoading(null)
    }
  }

  const senderName = request.sender?.username ?? 'Unknown'

  return (
    <>
      <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-xl">
        <div className="flex items-center gap-3">
          {request.sender ? (
            <UserAvatar
              username={request.sender.username}
              avatarUrl={request.sender.avatar_url}
              size={36}
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {getInitial(senderName)}
            </div>
          )}
          <p className="text-white font-medium text-sm flex-1 truncate">{senderName}</p>
          {request.sender && (
            <button
              onClick={() => setProfileOpen(true)}
              aria-label="View profile"
              className="rounded-lg border border-white/20 text-white/60 hover:text-white hover:bg-white/10 transition-colors p-1.5 shrink-0"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          )}
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={handleAccept}
            disabled={loading !== null}
          >
            {loading === 'accept' ? '...' : 'Accept'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={handleDecline}
            disabled={loading !== null}
          >
            {loading === 'decline' ? '...' : 'Decline'}
          </Button>
        </div>
      </div>

      {request.sender && (
        <ViewProfileModal
          profile={request.sender}
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </>
  )
}
