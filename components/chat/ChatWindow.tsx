'use client'

import { useRef, useEffect, useState, KeyboardEvent } from 'react'
import { useMessages } from '@/hooks/useMessages'
import MessageBubble from './MessageBubble'

interface ChatWindowProps {
  connectionId: string
  currentUserId: string
}

export default function ChatWindow({ connectionId, currentUserId }: ChatWindowProps) {
  const { messages, loading, error, sendError, sendMessage, refetch } = useMessages(connectionId, currentUserId)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = messagesEndRef.current?.parentElement
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return
    // Clear immediately for instant feedback, restore if insert fails so user can retry
    setInput('')
    setSending(true)
    const success = await sendMessage(trimmed)
    setSending(false)
    if (!success) setInput(trimmed)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/40 text-sm">Loading messages...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-white/40 text-sm">{error}</p>
        <button
          onClick={refetch}
          className="text-white/60 text-sm underline hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center mt-20">
            <p className="text-white/30 text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwnMessage={msg.sender_id === currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/10 p-4 flex flex-col gap-2 bg-black">
        {sendError && (
          <p className="text-red-400 text-xs px-1">{sendError}</p>
        )}
        <div className="flex items-end gap-3">
          <textarea
            className={`flex-1 bg-white/5 border text-white placeholder:text-white/30 rounded-xl px-4 py-2.5 resize-none outline-none focus:border-white/30 transition-colors text-sm max-h-32 ${
              sendError ? 'border-red-500/60' : 'border-white/10'
            }`}
            placeholder="Type a message..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2.5 rounded-xl bg-white text-black hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            aria-label="Send message"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
