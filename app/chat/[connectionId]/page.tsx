import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ChatWindow from '@/components/chat/ChatWindow'
import ActiveChatSetter from './ActiveChatSetter'
import ChatUserHeader from './ChatUserHeader'
import type { Profile } from '@/types'

interface ChatPageProps {
  params: Promise<{ connectionId: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { connectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: connection } = await supabase
    .from('connections')
    .select(`
      id, user_a, user_b,
      profile_a:profiles!connections_user_a_fkey(id, username, email, avatar_url, region, interests, username_change_count, last_active, created_at),
      profile_b:profiles!connections_user_b_fkey(id, username, email, avatar_url, region, interests, username_change_count, last_active, created_at)
    `)
    .eq('id', connectionId)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .single()

  if (!connection) redirect('/home')

  type ConnectionWithProfiles = {
    user_a: string
    profile_a: Profile[] | Profile | null
    profile_b: Profile[] | Profile | null
  }

  const conn = connection as unknown as ConnectionWithProfiles
  const otherUserRaw = conn.user_a === user.id ? conn.profile_b : conn.profile_a
  const otherUser: Profile | null = Array.isArray(otherUserRaw) ? otherUserRaw[0] ?? null : otherUserRaw

  return (
    // Full-screen on mobile (offset by mobile h-16 header), full-screen on desktop too (offset by h-24)
    <div className="flex flex-col h-screen-dvh bg-black pt-16 md:pt-24">
      {/* Chat sub-header: back button + other user's name */}
      <div className="shrink-0 h-12 border-b border-white/10 flex items-center gap-2 px-3 md:px-4">
        <Link
          href="/home"
          className="inline-flex items-center justify-center w-11 h-11 md:w-auto md:h-auto md:p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Back to home"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <ChatUserHeader otherUser={otherUser} />
      </div>

      {/* Chat window fills remaining height */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ActiveChatSetter connectionId={connectionId} />
        <ChatWindow connectionId={connectionId} currentUserId={user.id} />
      </div>
    </div>
  )
}
