import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ActivityClient from './ActivityClient'

export default async function ActivityPage() {
  const supabase = await createClient()
  // getClaims() validates the JWT locally — avoids the /auth/v1/user network
  // round-trip that getUser() performs on every navigation.
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) redirect('/')

  // Last 60 days of messages — bounded so the page stays cheap on power users.
  const sinceIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  // Run the profile lookup alongside the four aggregates so the slowest single
  // query gates the response, instead of profile + aggregates running serially.
  const [
    { data: profile },
    { data: messages },
    { data: connections },
    { count: sentRequestCount },
    { count: receivedRequestCount },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, created_at, last_active')
      .eq('id', userId)
      .single(),
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
      .or(`user_a.eq.${userId},user_b.eq.${userId}`),
    supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', userId),
    supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId),
  ])

  if (!profile) redirect('/setup')

  return (
    <ActivityClient
      currentUserId={userId}
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
