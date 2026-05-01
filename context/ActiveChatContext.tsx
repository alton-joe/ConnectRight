'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface ActiveChatContextValue {
  activeChatConnectionId: string | null
  setActiveChatConnectionId: (id: string | null) => void
}

const ActiveChatContext = createContext<ActiveChatContextValue>({
  activeChatConnectionId: null,
  setActiveChatConnectionId: () => {},
})

export function ActiveChatProvider({ children }: { children: React.ReactNode }) {
  const [activeChatConnectionId, setActiveChatConnectionIdState] = useState<string | null>(null)

  const setActiveChatConnectionId = useCallback((id: string | null) => {
    setActiveChatConnectionIdState(id)
  }, [])

  return (
    <ActiveChatContext.Provider value={{ activeChatConnectionId, setActiveChatConnectionId }}>
      {children}
    </ActiveChatContext.Provider>
  )
}

export function useActiveChat() {
  return useContext(ActiveChatContext)
}
