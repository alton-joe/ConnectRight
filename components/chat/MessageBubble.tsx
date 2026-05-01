import type { Message } from '@/types'
import { formatTime } from '@/utils/helpers'

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
}

export default function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] flex flex-col gap-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
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
        <span className="text-[11px] text-white/30 px-1">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}
