'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Subscribes to one `typing-${connectionId}` broadcast channel per connection
// and returns a map of which connections currently have the *other* user typing.
// Used by the connected-list UI to show a "typing..." hint on chats the user
// hasn't opened.
export function useTypingForConnections(
  currentUserId: string,
  connectionIds: string[]
): Record<string, boolean> {
  const supabase = useMemo(() => createClient(), [])
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({})
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map())
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Stable key so the effect doesn't re-run on every render just because the
  // parent re-builds the array.
  const key = useMemo(() => [...connectionIds].sort().join(','), [connectionIds])

  useEffect(() => {
    const want = new Set(key ? key.split(',').filter(Boolean) : [])

    // Tear down channels for connections no longer present.
    for (const [id, ch] of channelsRef.current) {
      if (!want.has(id)) {
        supabase.removeChannel(ch)
        channelsRef.current.delete(id)
        const t = timersRef.current.get(id)
        if (t) {
          clearTimeout(t)
          timersRef.current.delete(id)
        }
        setTypingMap((prev) => {
          if (!(id in prev)) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
      }
    }

    // Spin up channels for new connections.
    for (const id of want) {
      if (channelsRef.current.has(id)) continue
      const ch = supabase
        .channel(`typing-${id}`, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'typing' }, (payload) => {
          const data = payload.payload as { user_id?: string; typing?: boolean } | undefined
          if (!data || !data.user_id || data.user_id === currentUserId) return
          if (data.typing) {
            setTypingMap((prev) => (prev[id] ? prev : { ...prev, [id]: true }))
            const existing = timersRef.current.get(id)
            if (existing) clearTimeout(existing)
            // Self-clear if the sender goes quiet without firing a stop event.
            const t = setTimeout(() => {
              setTypingMap((prev) => {
                if (!prev[id]) return prev
                return { ...prev, [id]: false }
              })
              timersRef.current.delete(id)
            }, 4000)
            timersRef.current.set(id, t)
          } else {
            const existing = timersRef.current.get(id)
            if (existing) {
              clearTimeout(existing)
              timersRef.current.delete(id)
            }
            setTypingMap((prev) => (prev[id] ? { ...prev, [id]: false } : prev))
          }
        })
        .subscribe()
      channelsRef.current.set(id, ch)
    }
  }, [key, currentUserId, supabase])

  // Final teardown.
  useEffect(() => {
    return () => {
      for (const ch of channelsRef.current.values()) supabase.removeChannel(ch)
      channelsRef.current.clear()
      for (const t of timersRef.current.values()) clearTimeout(t)
      timersRef.current.clear()
    }
  }, [supabase])

  return typingMap
}
