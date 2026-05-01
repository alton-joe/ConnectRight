'use server'

import { createClient } from '@/lib/supabase/server'

export async function createProfile(
  username: string,
  avatarId?: string
): Promise<{ error?: string }> {
  if (!username || username.length < 3 || username.length > 20) {
    return { error: 'Username must be 3–20 characters.' }
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: 'Username can only contain letters, numbers, and underscores.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated. Please sign in again.' }

  // Check username uniqueness
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existing) return { error: 'That username is already taken.' }

  const { error: insertError } = await supabase.from('profiles').insert({
    id: user.id,
    username,
    email: user.email ?? '',
    avatar_url: avatarId ?? user.user_metadata?.avatar_url ?? null,
  })

  if (insertError) {
    // Unique constraint violation — another user claimed the name between check and insert
    if (insertError.code === '23505') return { error: 'That username was just taken. Please choose another.' }
    return { error: 'Could not create profile. Please try again.' }
  }

  return {}
}
