import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomeClient from './HomeClient'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ chat?: string; fs?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { chat: initialChatId, fs: initialFullscreen } = await searchParams

  // Run the two independent reads in parallel — they don't depend on each
  // other, and serial awaits add up over a slow mobile connection.
  const [{ data: profiles }, { count: pendingCount }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending'),
  ])

  return (
    <HomeClient
      currentUserId={user.id}
      initialProfiles={profiles ?? []}
      initialPendingCount={pendingCount ?? 0}
      initialChatId={initialChatId ?? null}
      initialFullscreen={initialFullscreen === '1'}
    />
  )
}
