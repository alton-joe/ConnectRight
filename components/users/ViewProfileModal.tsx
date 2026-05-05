'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import UserAvatar from '@/components/ui/UserAvatar'
import { useToast } from '@/components/ui/Toaster'
import type { Profile } from '@/types'
import { timeAgo } from '@/utils/helpers'
import { getInterest } from '@/lib/interests'

interface ViewProfileModalProps {
  profile: Profile
  isOpen: boolean
  onClose: () => void
  // When provided, a Remove button is shown — clicking it confirms then
  // calls /api/connections/remove. Used in chat-header profile views.
  connectionId?: string
  onRemoved?: () => void
}

export default function ViewProfileModal({
  profile,
  isOpen,
  onClose,
  connectionId,
  onRemoved,
}: ViewProfileModalProps) {
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const { showToast } = useToast()

  // All close paths (backdrop, Esc, Close button, No on confirm) funnel through
  // here, so resetting confirm state on close is enough — no isOpen effect needed.
  const handleClose = () => {
    if (removing) return
    setConfirming(false)
    onClose()
  }

  const handleRemove = async () => {
    if (!connectionId || removing) return
    setRemoving(true)
    try {
      const res = await fetch('/api/connections/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })
      if (!res.ok) throw new Error('remove_failed')
      showToast(`Removed @${profile.username}`, 'success')
      setConfirming(false)
      onRemoved?.()
    } catch {
      showToast('Could not remove connection. Try again.', 'error')
      setRemoving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {confirming ? (
        <div className="flex flex-col gap-5">
          <div className="text-center">
            <p className="text-white font-semibold text-lg">Remove @{profile.username}?</p>
            <p className="text-white/60 text-sm mt-2 leading-relaxed">
              Removing this person means either of you will need to send a new
              connection request to be connected again. All messages between you
              will be deleted.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={removing}
              className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/80 hover:text-white hover:bg-white/5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              No
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="flex-1 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {removing ? 'Removing…' : 'Yes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <UserAvatar username={profile.username} avatarUrl={profile.avatar_url} size={64} />

          <div className="text-center w-full">
            <p className="text-white font-semibold text-lg">{profile.username}</p>
            <p className="text-white/50 text-sm mt-1">{profile.email}</p>
          </div>

          <div className="w-full bg-white/5 rounded-lg px-4 py-3 flex flex-col gap-3">
            {profile.interests && profile.interests.length > 0 && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-white/50 text-sm shrink-0">Interests</span>
                <span className="text-white/80 text-sm text-right">
                  {profile.interests.map((id) => getInterest(id)?.label ?? id).join(', ')}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Last active</span>
              <span className="text-white/80 text-sm">{timeAgo(profile.last_active)}</span>
            </div>
            {profile.region && (
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Region</span>
                <span className="text-white/80 text-sm">{profile.region}</span>
              </div>
            )}
          </div>

          {connectionId && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="w-full py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:text-red-300 hover:bg-red-500/20 hover:border-red-500/50 text-sm font-medium transition-colors cursor-pointer"
            >
              Remove
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </Modal>
  )
}
