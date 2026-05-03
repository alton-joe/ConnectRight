import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton: every caller in the browser must share one client.
// Multiple clients each run their own auth auto-refresher, which fight for the
// same Web Lock and can leave one client holding a stale JWT in memory while
// the cookie has a newer one — causing silent INSERT failures on subsequent
// requests from that client. One shared instance keeps auth state coherent.
let browserClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return browserClient
}
