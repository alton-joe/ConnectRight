'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SiteFooter from '@/components/layout/SiteFooter'

// Static placeholder cards — no real user data exposed
const PLACEHOLDER_CARDS = [
  { initial: 'A', name: 'Alex M.', tag: 'Designer' },
  { initial: 'S', name: 'Sara K.', tag: 'Engineer' },
  { initial: 'J', name: 'Jordan L.', tag: 'Marketer' },
  { initial: 'R', name: 'Riley P.', tag: 'Developer' },
  { initial: 'M', name: 'Morgan T.', tag: 'Creator' },
  { initial: 'C', name: 'Casey W.', tag: 'Founder' },
  { initial: 'D', name: 'Dana F.', tag: 'Writer' },
  { initial: 'P', name: 'Parker N.', tag: 'Analyst' },
]

export default function LandingPage() {
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
  }

  return (
    <div className="bg-black flex flex-col">
      {/* Hero — pt-20 clears the fixed global header */}
      <section className="pt-32 pb-8 px-6 text-center flex flex-col items-center gap-4">
        <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight max-w-2xl">
          Find the right people.{' '}
          <span className="text-white/40">Connect instantly.</span>
        </h1>
        <p className="text-white/40 text-base md:text-lg max-w-xl leading-relaxed">
          ConnectRight lets you discover real people, send connection requests,
          and chat in real time — no algorithms, no noise.
        </p>
      </section>

      {/* Blurred users section */}
      <section className="relative max-w-5xl mx-auto w-full px-6 pb-24">
        <h2 className="text-white/60 text-sm font-medium mb-4 uppercase tracking-widest">
          Available Users
        </h2>

        {/* Blurred grid */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 blur-sm pointer-events-none select-none">
            {PLACEHOLDER_CARDS.map((card) => (
              <div
                key={card.initial + card.name}
                className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {card.initial}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{card.name}</p>
                    <p className="text-white/40 text-xs">{card.tag}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-7 bg-white/5 rounded-lg" />
                  <div className="flex-1 h-7 bg-white/10 rounded-lg" />
                </div>
              </div>
            ))}
          </div>

          {/* Lock overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-zinc-950/90 border border-white/10 backdrop-blur-md rounded-2xl px-8 py-8 flex flex-col items-center gap-4 text-center shadow-2xl max-w-xs w-full">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-base">Sign in to see the right people</p>
                <p className="text-white/40 text-sm mt-1">Create a free account to start connecting</p>
              </div>
              <button
                onClick={handleSignUp}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-white text-black font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm disabled:opacity-60 cursor-pointer"
              >
                <GoogleIcon size={16} />
                {loading ? 'Redirecting...' : 'Sign up with Google'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908C16.658 14.027 17.64 11.827 17.64 9.2z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}
