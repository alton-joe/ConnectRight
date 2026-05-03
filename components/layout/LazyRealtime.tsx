'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'

// Dynamically import the heavy Supabase Realtime + provider code only when an
// authenticated user is present. Guests (e.g. the landing page) never load it,
// shaving the realtime client + websocket transport off the initial bundle.
//
// useRealtime() reads from the same React context regardless — when no provider
// is mounted (guest), the consumers get the NOOP_VALUE default automatically.
const RealtimeProvider = dynamic(
  () => import('@/providers/RealtimeProvider').then((m) => m.RealtimeProvider),
  { ssr: false }
)

interface LazyRealtimeProps {
  userId: string | null
  children: ReactNode
}

export default function LazyRealtime({ userId, children }: LazyRealtimeProps) {
  if (!userId) return <>{children}</>
  return <RealtimeProvider userId={userId}>{children}</RealtimeProvider>
}
