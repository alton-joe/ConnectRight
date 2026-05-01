'use client'

import { ActiveChatProvider } from '@/context/ActiveChatContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ActiveChatProvider>{children}</ActiveChatProvider>
}
