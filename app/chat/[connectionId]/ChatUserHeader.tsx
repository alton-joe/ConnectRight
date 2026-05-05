'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import UserAvatar from '@/components/ui/UserAvatar'
import ViewProfileModal from '@/components/users/ViewProfileModal'
import type { Profile } from '@/types'

interface ChatUserHeaderProps {
  otherUser: Profile | null
  connectionId: string
}

export default function ChatUserHeader({ otherUser, connectionId }: ChatUserHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const router = useRouter()

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
          connectionId={connectionId}
          onRemoved={() => {
            setProfileOpen(false)
            router.push('/home')
          }}
        />
      )}
    </>
  )
}
