'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseMessagesReturn {
  messages: Message[]
  loading: boolean
  sendMessage: (content: string, senderId: string) => Promise<void>
}

export function useMessages(connectionId: string): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])
  const mountedRef = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: true })

    if (mountedRef.current) {
      setMessages(data ?? [])
      setLoading(false)
    }
  }, [connectionId, supabase])

  useEffect(() => {
    mountedRef.current = true
    setLoading(true)

    fetchMessages()

    const createChannel = () => {
      if (!mountedRef.current) return

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      const ch = supabase
        .channel(`messages:${connectionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `connection_id=eq.${connectionId}`,
          },
          (payload) => {
            if (mountedRef.current) {
              setMessages((prev) => {
                const msg = payload.new as Message
                if (prev.some((m) => m.id === msg.id)) return prev
                return [...prev, msg]
              })
            }
          }
        )
        .subscribe((status) => {
          if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && mountedRef.current) {
            supabase.removeChannel(ch)
            channelRef.current = null
            retryTimerRef.current = setTimeout(createChannel, 2000)
          }
        })

      channelRef.current = ch
    }

    createChannel()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        fetchMessages()
        createChannel()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mountedRef.current = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [connectionId, supabase, fetchMessages])

  const sendMessage = useCallback(
    async (content: string, senderId: string) => {
      const trimmed = content.trim()
      if (!trimmed || trimmed.length > 2000) return

      const tempId = crypto.randomUUID()
      const optimistic: Message = {
        id: tempId,
        connection_id: connectionId,
        sender_id: senderId,
        content: trimmed,
        created_at: new Date().toISOString(),
      }

      // Show immediately, regardless of WebSocket state
      setMessages((prev) => [...prev, optimistic])

      const { data } = await supabase
        .from('messages')
        .insert({
          connection_id: connectionId,
          sender_id: senderId,
          content: trimmed,
        })
        .select()
        .single()

      setMessages((prev) => {
        if (!data) {
          // Insert failed — remove the optimistic message
          return prev.filter((m) => m.id !== tempId)
        }
        const real = data as Message
        // If subscription already delivered the real message, just drop the temp
        if (prev.some((m) => m.id === real.id)) {
          return prev.filter((m) => m.id !== tempId)
        }
        // Replace temp with the real DB row (gets the real id + server timestamp)
        return prev.map((m) => (m.id === tempId ? real : m))
      })
    },
    [connectionId, supabase]
  )

  return { messages, loading, sendMessage }
}
