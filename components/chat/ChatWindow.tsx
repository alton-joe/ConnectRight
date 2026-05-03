'use client'

import { useRef, useEffect, useLayoutEffect, useState, KeyboardEvent, ChangeEvent } from 'react'
import { useMessages } from '@/hooks/useMessages'
import MessageBubble from './MessageBubble'

interface ChatWindowProps {
  connectionId: string
  currentUserId: string
}

export default function ChatWindow({ connectionId, currentUserId }: ChatWindowProps) {
  const { messages, loading, error, sendError, sendMessage, markAsRead, refetch, peerTyping, sendTyping } = useMessages(connectionId, currentUserId)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  // Ref-based send guard: blocks rapid Enters from passing through the state-based
  // guard before React has committed setSending(true). Serializes sends.
  const isSendingRef = useRef(false)
  // Holds the text of the most recent failed send when the user has already
  // typed new content into the input — surfaces it in the error banner instead
  // of stomping the user's new text.
  const [failedSendContent, setFailedSendContent] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<string | undefined>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevSendingRef = useRef(false)
  // Throttle: never broadcast "typing=true" more than once per 2s.
  const lastTypingSentRef = useRef(0)
  // Fires "typing=false" after the user pauses for 3s without sending.
  const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset the scroll tracker when the active conversation changes so the next
  // message-list update is treated as a fresh open and pins to the bottom.
  const initialScrollDoneRef = useRef(false)
  useEffect(() => {
    lastMessageIdRef.current = undefined
    initialScrollDoneRef.current = false
  }, [connectionId])

  // Pin to the bottom on a brand-new message (initial load OR a freshly arrived
  // row). Status-only UPDATEs (delivered/read tick flips) replace the array but
  // don't change the last id, so we skip them.
  //
  // useLayoutEffect runs before paint so the user never sees a flash of
  // top-anchored content. The first scroll on open fights the chat-panel
  // slide-in animation (350ms column transition from 0 → 2fr) — bubbles reflow
  // as the container widens, so we re-pin once on the next frame and once more
  // after the transition settles.
  useLayoutEffect(() => {
    if (messages.length === 0) return
    const lastId = messages[messages.length - 1]?.id
    if (lastId === lastMessageIdRef.current) return
    lastMessageIdRef.current = lastId

    const el = messagesEndRef.current?.parentElement
    if (!el) return
    el.scrollTop = el.scrollHeight

    if (initialScrollDoneRef.current) return
    initialScrollDoneRef.current = true
    const raf = requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight
    })
    const settle = setTimeout(() => {
      if (el) el.scrollTop = el.scrollHeight
    }, 400)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(settle)
    }
  }, [messages, connectionId])

  // Mark inbound messages read whenever this chat is mounted, when new
  // unread messages arrive, or when the tab returns to focus.
  useEffect(() => {
    const hasUnreadInbound = messages.some(
      (m) => m.sender_id !== currentUserId && !m.read_at
    )
    if (!hasUnreadInbound) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    void markAsRead()
  }, [messages, currentUserId, markAsRead])

  // Disabling the textarea while sending drops focus; restore it on the
  // falling edge so the user can keep typing without clicking back in.
  useEffect(() => {
    if (prevSendingRef.current && !sending) {
      textareaRef.current?.focus()
    }
    prevSendingRef.current = sending
  }, [sending])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void markAsRead()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [markAsRead])

  // Clear local typing-state and tell the peer we stopped. Used after send,
  // when the input is emptied, and on unmount.
  const clearTypingState = () => {
    if (stopTypingTimerRef.current) {
      clearTimeout(stopTypingTimerRef.current)
      stopTypingTimerRef.current = null
    }
    if (lastTypingSentRef.current !== 0) {
      sendTyping(false)
      lastTypingSentRef.current = 0
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)

    if (!value.trim()) {
      clearTypingState()
      return
    }

    const now = Date.now()
    if (now - lastTypingSentRef.current > 2000) {
      sendTyping(true)
      lastTypingSentRef.current = now
    }

    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current)
    stopTypingTimerRef.current = setTimeout(() => {
      sendTyping(false)
      lastTypingSentRef.current = 0
      stopTypingTimerRef.current = null
    }, 3000)
  }

  // Make sure the indicator on the peer's side disappears if this component
  // unmounts mid-typing (route change, tab close path, etc.).
  useEffect(() => {
    return () => {
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current)
      if (lastTypingSentRef.current !== 0) sendTyping(false)
    }
  }, [sendTyping])

  const handleSend = async () => {
    // Ref guard runs first and synchronously: rapid double-Enters in the same
    // tick cannot both pass before setSending(true) commits.
    if (isSendingRef.current) return
    const trimmed = input.trim()
    if (!trimmed) return

    isSendingRef.current = true
    setSending(true)
    setFailedSendContent(null)
    clearTypingState()
    // Snapshot the input value so we can detect whether the user typed
    // something else while the insert was in flight. Do NOT clear the input
    // yet — only clear after Supabase confirms the row landed.
    const inputAtSendTime = input
    try {
      const success = await sendMessage(trimmed)
      if (success) {
        // Only clear the input if the user hasn't typed anything new since.
        setInput((current) => (current === inputAtSendTime ? '' : current))
      } else {
        // Send failed — keep the failed text in the input if the user hasn't
        // typed anything else. If they have, surface the failed text in the
        // error banner instead of overwriting what they typed.
        setInput((current) => {
          if (current === inputAtSendTime) return current
          setFailedSendContent(trimmed)
          return current
        })
      }
    } finally {
      isSendingRef.current = false
      setSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
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
            <p className="text-white/30 text-sm">
              {loading ? 'Loading messages...' : 'No messages yet. Say hello!'}
            </p>
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

      {/* Typing indicator — shown only while the peer is actively typing. */}
      <div
        className={`shrink-0 px-4 transition-all duration-200 overflow-hidden ${
          peerTyping ? 'h-7 opacity-100' : 'h-0 opacity-0'
        }`}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center gap-2 py-1">
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-3 py-1">
            <span className="typing-dot" style={{ animationDelay: '0ms' }} />
            <span className="typing-dot" style={{ animationDelay: '150ms' }} />
            <span className="typing-dot" style={{ animationDelay: '300ms' }} />
            <span className="text-[11px] text-white/60 ml-1.5 leading-none">typing</span>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/10 p-4 flex flex-col gap-2 bg-black">
        {sendError && (
          <p className="text-red-400 text-xs px-1">
            {sendError}
            {failedSendContent && (
              <> — failed text: <span className="italic">&ldquo;{failedSendContent}&rdquo;</span></>
            )}
          </p>
        )}
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            className={`flex-1 bg-white/5 border text-white placeholder:text-white/30 rounded-xl px-4 py-2.5 resize-none outline-none focus:border-white/30 transition-colors text-sm max-h-32 ${
              sendError ? 'border-red-500/60' : 'border-white/10'
            }`}
            placeholder="Type a message..."
            rows={1}
            value={input}
            onChange={handleInputChange}
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
