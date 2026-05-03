import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)
  }

  // Middleware will redirect to /setup if no profile exists
  const response = NextResponse.redirect(`${origin}/home`)
  // Short-lived flag the client-side ToasterProvider drains on mount. Survives
  // the middleware redirect (cookie travels with every request) and the
  // /setup → /home middleware bounce.
  response.cookies.set('cr_just_verified', '1', {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60,
  })
  return response
}
