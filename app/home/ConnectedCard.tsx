'use client'

import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import UserAvatar from '@/components/ui/UserAvatar'
import type { Connection } from '@/types'
import { timeAgo } from '@/utils/helpers'

interface ConnectedCardProps {
  connection: Connection
  isSelected?: boolean
  onChat: () => void
}

function isOnline(lastActive: string): boolean {
  return Date.now() - new Date(lastActive).getTime() < 5 * 60 * 1000
}

export default function ConnectedCard({ connection, isSelected, onChat }: ConnectedCardProps) {
  const other = connection.other_user
  const online = other ? isOnline(other.last_active) : false

  return (
    <Card
      className={`flex items-center gap-3 transition-colors cursor-pointer ${
        isSelected ? 'border-white/30 bg-white/5' : ''
      }`}
      onClick={onChat}
    >
      {/* Avatar with optional green online dot */}
      <div className="relative shrink-0">
        <UserAvatar username={other?.username ?? '?'} avatarUrl={other?.avatar_url} size={40} />
        {online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-zinc-900" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{other?.username ?? 'Unknown'}</p>
        {other && (
          <p className={`text-xs truncate flex items-center gap-1 ${online ? 'text-green-500' : 'text-white/40'}`}>
            {online ? 'Active now' : timeAgo(other.last_active)}
          </p>
        )}
      </div>

      {!isSelected && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onChat() }}
        >
          Chat
        </Button>
      )}
    </Card>
  )
}
