'use client'

import { useState } from 'react'
import UserAvatar from '@/components/ui/UserAvatar'
import ViewProfileModal from '@/components/users/ViewProfileModal'
import type { Profile } from '@/types'

export default function ChatUserHeader({ otherUser }: { otherUser: Profile | null }) {
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => { if (otherUser) setProfileOpen(true) }}
        disabled={!otherUser}
        className="flex items-center gap-2 flex-1 min-w-0 text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-white/5 transition-colors cursor-pointer disabled:cursor-default disabled:hover:bg-transparent"
        aria-label="View profile"
      >
        <UserAvatar
          username={otherUser?.username ?? '?'}
          avatarUrl={otherUser?.avatar_url}
          size={28}
        />
        <p className="text-white font-semibold text-sm truncate">
          {otherUser?.username ?? 'Chat'}
        </p>
      </button>
      {otherUser && (
        <ViewProfileModal
          profile={otherUser}
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </>
  )
}
