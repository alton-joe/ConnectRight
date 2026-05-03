import type { Message } from '@/types'
import { formatTime } from '@/utils/helpers'

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
}

function StatusTick({ delivered, read }: { delivered: boolean; read: boolean }) {
  // read   → blue double tick
  // delivered → muted double tick
  // sent   → muted single tick
  const color = read ? 'text-sky-400' : 'text-white/40'
  const showDouble = delivered || read
  return (
    <span className={`inline-flex items-center ${color}`} aria-label={read ? 'Read' : delivered ? 'Delivered' : 'Sent'}>
      {showDouble ? (
        <svg width="20" height="12" viewBox="0 0 28 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 8 6 13 14 2" />
          <polyline points="13 13 21 2" />
        </svg>
      ) : (
        <svg width="12" height="10" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2 7 7 11 14 2" />
        </svg>
      )}
    </span>
  )
}

export default function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] md:max-w-[75%] flex flex-col gap-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            px-4 py-2.5 text-sm leading-relaxed
            ${isOwnMessage
              ? 'bg-white text-black rounded-tl-2xl rounded-bl-2xl rounded-tr-2xl'
              : 'bg-zinc-800 text-white rounded-tr-2xl rounded-br-2xl rounded-tl-2xl'
            }
          `}
        >
          {message.content}
        </div>
        <span className="text-[11px] text-white/30 px-1 inline-flex items-center gap-1">
          {formatTime(message.created_at)}
          {isOwnMessage && (
            <StatusTick
              delivered={Boolean(message.delivered_at)}
              read={Boolean(message.read_at)}
            />
          )}
        </span>
      </div>
    </div>
  )
}
