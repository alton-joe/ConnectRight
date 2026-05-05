import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getClaims() verifies the access-token JWT locally (signature + exp) using
  // Supabase's signing keys — no network round-trip to /auth/v1/user. With
  // asymmetric signing keys this is the recommended fast path; falls back to
  // a remote check internally for legacy HS256 tokens. Saves ~150–300ms per nav.
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub ?? null

  const { pathname } = request.nextUrl

  // Public routes — no auth required
  const publicPaths = ['/', '/auth/callback', '/terms', '/privacy', '/cookies', '/about']
  if (!userId) {
    if (!publicPaths.includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  // Skip the profile DB lookup once we've confirmed it exists for this user —
  // a per-user cookie stamp lets us avoid an extra round-trip on every nav.
  // The cookie is informational only (page server components still re-check),
  // so spoofing it just lets a user reach /home with no profile, which renders
  // empty UI rather than escalating privilege.
  const profileStampCookie = request.cookies.get('cr_profile_set')?.value
  let profileExists = profileStampCookie === userId

  if (!profileExists) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!profile) {
      // New user — must set up username
      if (pathname !== '/setup') {
        return NextResponse.redirect(new URL('/setup', request.url))
      }
      return supabaseResponse
    }
    profileExists = true
    // Stamp the cookie so subsequent navigations skip this lookup. 30-day TTL
    // is long enough to cover a typical session; it's cleared on sign-out.
    supabaseResponse.cookies.set('cr_profile_set', userId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  // Profile exists — redirect away from setup/login
  if (pathname === '/setup' || pathname === '/') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // Update last_active (fire-and-forget — don't block the response)
  void Promise.resolve(supabase.rpc('update_last_active')).then(() => {}).catch(() => {})

  return supabaseResponse
}

export const config = {
  matcher: [
    // Excludes Next.js internals, favicon, common image extensions, the PWA
    // assets (manifest.json, sw.js, /icons/*), and ALL API routes.
    //
    // /api/* must be excluded because middleware redirects unauthenticated
    // requests to /, and server-to-server fetches between routes carry no
    // auth cookies — the redirect would turn a JSON API response into the
    // home-page HTML, breaking every internal API call (notably the push
    // trigger routes, which call /api/push/send server-side). API routes
    // handle their own auth (or are intentionally public, e.g. /api/auth/callback).
    '/((?!api/|_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
