'use client'

import Modal from '@/components/ui/Modal'
import UserAvatar from '@/components/ui/UserAvatar'
import type { Profile } from '@/types'
import { timeAgo } from '@/utils/helpers'

interface ViewProfileModalProps {
  profile: Profile
  isOpen: boolean
  onClose: () => void
}

export default function ViewProfileModal({ profile, isOpen, onClose }: ViewProfileModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center gap-5">
        {/* Avatar */}
        <UserAvatar username={profile.username} avatarUrl={profile.avatar_url} size={64} />

        {/* Info */}
        <div className="text-center w-full">
          <p className="text-white font-semibold text-lg">{profile.username}</p>
          <p className="text-white/50 text-sm mt-1">{profile.email}</p>
        </div>

        <div className="w-full bg-white/5 rounded-lg px-4 py-3 flex flex-col gap-3">
          {profile.region && (
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Region</span>
              <span className="text-white/80 text-sm">{profile.region}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-sm">Last active</span>
            <span className="text-white/80 text-sm">{timeAgo(profile.last_active)}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}
