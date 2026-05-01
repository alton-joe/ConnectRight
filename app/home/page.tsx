import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomeClient from './HomeClient'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ chat?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { chat: initialChatId } = await searchParams

  // Fetch all profiles except current user
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', user.id)
    .order('created_at', { ascending: false })

  // Fetch pending incoming request count for the badge
  const { count: pendingCount } = await supabase
    .from('connection_requests')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', user.id)
    .eq('status', 'pending')

  return (
    <HomeClient
      currentUserId={user.id}
      initialProfiles={profiles ?? []}
      initialPendingCount={pendingCount ?? 0}
      initialChatId={initialChatId ?? null}
    />
  )
}
