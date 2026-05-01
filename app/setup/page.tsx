import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UsernameSetup from '@/components/auth/UsernameSetup'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  return (
    <UsernameSetup
      userId={user.id}
      email={user.email ?? ''}
      avatarUrl={user.user_metadata?.avatar_url ?? null}
    />
  )
}
