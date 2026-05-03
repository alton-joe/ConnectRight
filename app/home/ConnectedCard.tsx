'use client'

import { forwardRef } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import UserAvatar from '@/components/ui/UserAvatar'
import type { Connection } from '@/types'
import { timeAgo } from '@/utils/helpers'

interface ConnectedCardProps {
  connection: Connection
  isSelected?: boolean
  isTyping?: boolean
  hasUnread?: boolean
  onChat: () => void
}

function isOnline(lastActive: string): boolean {
  return Date.now() - new Date(lastActive).getTime() < 5 * 60 * 1000
}

const ConnectedCard = forwardRef<HTMLDivElement, ConnectedCardProps>(function ConnectedCard(
  { connection, isSelected, isTyping, hasUnread, onChat },
  ref
) {
  const other = connection.other_user
  const online = other ? isOnline(other.last_active) : false

  // Unread uses the same neutral white tint that previously marked the open
  // chat. Selected/open chat intentionally has no highlight now.
  // (! forces precedence over Card's bg-zinc-900 — without it the cascade hides
  // the tint until :hover boosts specificity.)
  const cardClass = hasUnread
    ? '!bg-white/5 !border-white/30 hover:!bg-white/10'
    : 'hover:bg-zinc-800'

  return (
    <Card
      ref={ref}
      className={`flex items-center gap-3 transition-colors cursor-pointer ${cardClass}`}
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
        <p className={`truncate ${hasUnread ? 'text-indigo-300 font-semibold' : 'text-white font-medium'}`}>
          {other?.username ?? 'Unknown'}
        </p>
        {/* Status line: typing > unread time > online state > last active */}
        {isTyping ? (
          <p className="text-[11px] text-indigo-300 flex items-center gap-1.5 mt-0.5 leading-none">
            <span className="inline-flex items-center gap-0.5">
              <span className="typing-dot" style={{ animationDelay: '0ms' }} />
              <span className="typing-dot" style={{ animationDelay: '150ms' }} />
              <span className="typing-dot" style={{ animationDelay: '300ms' }} />
            </span>
            <span>typing</span>
          </p>
        ) : other ? (
          <p className={`text-xs truncate flex items-center gap-1 ${online ? 'text-green-500' : 'text-white/40'}`}>
            {online ? 'Active now' : timeAgo(other.last_active)}
          </p>
        ) : null}
      </div>

      {/* Right side: "new" badge for unread, or Chat button when not selected */}
      {hasUnread ? (
        <span
          className="shrink-0 text-[8px] font-bold uppercase tracking-wide bg-indigo-500 text-white rounded-full px-1.5 py-1 leading-none"
          aria-label="Unread"
        >
          new
        </span>
      ) : !isSelected ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onChat() }}
        >
          Chat
        </Button>
      ) : null}
    </Card>
  )
})

export default ConnectedCard
