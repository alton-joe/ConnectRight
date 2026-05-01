'use client'

import { useEffect } from 'react'
import { useActiveChat } from '@/context/ActiveChatContext'

export default function ActiveChatSetter({ connectionId }: { connectionId: string }) {
  const { setActiveChatConnectionId } = useActiveChat()

  useEffect(() => {
    setActiveChatConnectionId(connectionId)
    return () => setActiveChatConnectionId(null)
  }, [connectionId, setActiveChatConnectionId])

  return null
}
