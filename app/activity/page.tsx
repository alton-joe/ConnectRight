import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ActivityClient from './ActivityClient'

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, created_at, last_active')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/setup')

  // Last 60 days of messages — bounded so the page stays cheap on power users.
  const sinceIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: messages }, { data: connections }, { count: sentRequestCount }, { count: receivedRequestCount }] = await Promise.all([
    supabase
      .from('messages')
      .select('id, connection_id, sender_id, created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true }),
    supabase
      .from('connections')
      .select(`
        id, user_a, user_b, created_at,
        profile_a:profiles!connections_user_a_fkey(id, username, avatar_url),
        profile_b:profiles!connections_user_b_fkey(id, username, avatar_url)
      `)
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
    supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', user.id),
    supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id),
  ])

  return (
    <ActivityClient
      currentUserId={user.id}
      profile={{
        username: profile.username,
        memberSince: profile.created_at,
        lastActive: profile.last_active,
      }}
      messages={messages ?? []}
      connections={connections ?? []}
      sentRequestCount={sentRequestCount ?? 0}
      receivedRequestCount={receivedRequestCount ?? 0}
    />
  )
}
