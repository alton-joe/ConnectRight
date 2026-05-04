'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createProfile } from '@/app/setup/actions'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toaster'
import { ANIMALS } from '@/lib/avatars'
import type { AnimalId } from '@/lib/avatars'
import { INTERESTS, MAX_INTERESTS } from '@/lib/interests'

interface UsernameSetupProps {
  userId: string
  email: string
  avatarUrl?: string | null
}

// ─── Blurred background placeholder cards ────────────────────────────────────

const BG_USERS = [
  { initial: 'S', name: 'Sara K.',   tag: 'Engineer',  online: true  },
  { initial: 'J', name: 'Jordan L.', tag: 'Designer',  online: false },
  { initial: 'R', name: 'Riley P.',  tag: 'Developer', online: true  },
  { initial: 'M', name: 'Morgan T.', tag: 'Creator',   online: false },
  { initial: 'C', name: 'Casey W.',  tag: 'Founder',   online: true  },
  { initial: 'D', name: 'Dana F.',   tag: 'Writer',    online: false },
]
const BG_CONNECTED = [
  { initial: 'A', name: 'Alex M.',   tag: 'Marketer',  online: true  },
  { initial: 'P', name: 'Parker N.', tag: 'Analyst',   online: true  },
  { initial: 'T', name: 'Taylor B.', tag: 'Researcher',online: false },
]

function FakeCard({ initial, name, tag, online }: { initial: string; name: string; tag: string; online: boolean }) {
  return (
    <div className="bg-zinc-800/60 border border-white/8 rounded-xl p-3.5 flex items-center gap-3 mb-2.5">
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold text-white">{initial}</div>
        {online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-zinc-800" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{name}</p>
        <p className="text-white/40 text-xs">{tag}</p>
      </div>
      <div className="w-14 h-6 bg-white/8 rounded-lg" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function UsernameSetup({ userId: _userId, email, avatarUrl: _avatarUrl }: UsernameSetupProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [sliding, setSliding] = useState(false)

  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [loading, setLoading] = useState(false)
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [region, setRegion] = useState('')
  const [regionError, setRegionError] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<AnimalId | null>(null)

  const goToStep = (next: 1 | 2 | 3 | 4) => {
    setSliding(true)
    setTimeout(() => { setStep(next); setSliding(false) }, 280)
  }

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_INTERESTS) return prev
      return [...prev, id]
    })
  }

  const supabase = useMemo(() => createClient(), [])

  // Debounced availability check
  useEffect(() => {
    const formatOk = username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username)
    if (!formatOk) { setAvailability('idle'); return }

    setAvailability('checking')
    let cancelled = false

    const timer = setTimeout(async () => {
      // Hard timeout so a hung request never strands the UI on "checking".
      // The server action enforces uniqueness, so falling back to 'available' is safe.
      const timeoutMs = 5000
      try {
        const query = supabase.from('profiles').select('id').eq('username', username).maybeSingle()
        const result = await Promise.race([
          query,
          new Promise<{ data: null; error: Error }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: new Error('timeout') }), timeoutMs)
          ),
        ])
        if (cancelled) return
        if (result.error) { setAvailability('available'); return }
        setAvailability(result.data ? 'taken' : 'available')
      } catch {
        if (!cancelled) setAvailability('available')
      }
    }, 400)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [username, supabase])

  const formatValid = username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username)
  const canProceed = formatValid && availability === 'available'

  // Step 1 → Step 2 (interests) with slide
  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canProceed) return
    showToast(`Username @${username.trim()} selected`, 'success')
    goToStep(2)
  }

  // Step 2 → Step 3 (region) with slide
  const handleInterestsContinue = () => {
    if (selectedInterests.length < 1) return
    showToast(`${selectedInterests.length} interest${selectedInterests.length > 1 ? 's' : ''} selected`, 'success')
    goToStep(3)
  }

  // Step 3 → Step 4 (avatar) with slide. Region is optional, but if provided
  // must contain only letters and spaces (no numbers, symbols, or punctuation).
  const handleRegionContinue = () => {
    const trimmed = region.trim()
    if (trimmed.length > 30) {
      setRegionError('Region must be 30 characters or less.')
      return
    }
    if (trimmed && !/^[A-Za-z, ]+$/.test(trimmed)) {
      setRegionError('Letters, spaces, and commas only — no numbers or other symbols.')
      return
    }
    setRegionError('')
    if (trimmed) showToast('Region added', 'success')
    goToStep(4)
  }

  // Final submit
  const handleSubmit = async () => {
    if (!selectedAvatar) return
    setLoading(true)

    try {
      const result = await createProfile(username.trim(), selectedAvatar, selectedInterests, region.trim())
      if (result.error) { setUsernameError(result.error); setStep(1); setLoading(false); return }
      localStorage.setItem('connectright_show_welcome', 'true')
      // Tell useAuth to re-fetch — the profile row only just exists, and no
      // auth event fires after insert, so the header avatar would otherwise
      // stay blank until a manual refresh.
      window.dispatchEvent(new Event('connectright:profile-updated'))
      router.push('/home')
    } catch {
      setUsernameError('Something went wrong. Please try again.')
      setStep(1)
      setLoading(false)
    }
  }

  const charCount = username.length

  return (
    <div className="min-h-screen-dvh bg-black overflow-hidden relative flex items-center justify-center p-4">

      {/* ── Blurred app preview background — desktop only ── */}
      <div
        className="hidden md:block fixed inset-0 pointer-events-none select-none"
        style={{ filter: 'blur(3px) brightness(0.28)', transform: 'scale(1.02)' }}
        aria-hidden="true"
      >
        <div className="h-24 bg-zinc-950 border-b border-white/10 flex items-center px-8">
          <span className="font-bold text-3xl tracking-tight">
            <span className="text-white">Connect</span><span className="text-orange-500">Right</span><span className="text-white">.</span>
          </span>
        </div>
        <div className="grid gap-5 px-8 pt-6" style={{ gridTemplateColumns: '1fr 2fr', height: 'calc(100vh - 96px)' }}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 overflow-hidden">
            <p className="text-white font-semibold text-sm mb-4">Available Users</p>
            {BG_USERS.map((u) => <FakeCard key={u.name} {...u} />)}
          </div>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 overflow-hidden">
            <p className="text-white font-semibold text-sm mb-4">Connected</p>
            {BG_CONNECTED.map((u) => <FakeCard key={u.name} {...u} />)}
          </div>
        </div>
      </div>

      {/* ── Dark overlay ── */}
      <div className="fixed inset-0 bg-black/40 pointer-events-none" aria-hidden="true" />

      {/* ── Card ── */}
      <div
        className="relative z-10 w-full transition-all duration-300 ease-in-out"
        style={{ maxWidth: step === 1 ? '384px' : '480px' }}
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <span className="font-bold text-2xl tracking-tight">
            <span className="text-white">Connect</span><span className="text-orange-500">Right</span><span className="text-white">.</span>
          </span>
        </div>

        <div
          className="bg-zinc-950/80 backdrop-blur-2xl border border-white/12 rounded-2xl shadow-2xl overflow-hidden"
          style={{ transition: 'opacity 150ms ease, transform 150ms ease', opacity: sliding ? 0 : 1, transform: sliding ? 'translateX(12px)' : 'translateX(0)' }}
        >
          {/* ── STEP 1: Username ── */}
          {step === 1 && (
            <div className="p-8">
              <div className="mb-6">
                <h1 className="text-xl font-bold text-white">Pick your username</h1>
                <p className="text-white/45 text-sm mt-1 leading-relaxed">
                  This is how others will see you on ConnectRight.
                  {email && <span className="block mt-1 text-white/25 text-xs truncate">Signing in as {email}</span>}
                </p>
              </div>

              <form onSubmit={handleContinue} className="flex flex-col gap-4">
                <div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 text-sm select-none">@</span>
                    <input
                      className={`w-full bg-white/5 border rounded-xl pl-8 pr-12 py-2.5 text-white placeholder:text-white/25 text-sm outline-none transition-colors ${
                        usernameError || availability === 'taken'
                          ? 'border-red-500/60 focus:border-red-500'
                          : availability === 'available'
                          ? 'border-green-500/40 focus:border-green-500/60'
                          : 'border-white/10 focus:border-white/30'
                      }`}
                      placeholder="eg: Johnny_depp"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); if (usernameError) setUsernameError('') }}
                      maxLength={20}
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-xs tabular-nums ${charCount > 17 ? 'text-orange-400' : 'text-white/20'}`}>
                      {charCount}/20
                    </span>
                  </div>
                  {usernameError && (
                    <p className="mt-2 text-red-400 text-xs flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {usernameError}
                    </p>
                  )}
                </div>

                {/* Validation rows */}
                <div className="flex flex-col gap-1.5">
                  {[
                    { text: '3–20 characters',                    ok: charCount >= 3 && charCount <= 20 },
                    { text: 'Letters, numbers, underscores only', ok: charCount > 0 && /^[a-zA-Z0-9_]+$/.test(username) },
                  ].map((rule) => (
                    <div key={rule.text} className="flex items-center gap-2">
                      <span className={`flex items-center justify-center transition-colors ${charCount === 0 ? 'text-white/20' : rule.ok ? 'text-green-500' : 'text-red-400'}`}>
                        {charCount === 0 ? (
                          <span className="w-1 h-1 rounded-full bg-white/20 block" />
                        ) : rule.ok ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        )}
                      </span>
                      <span className={`text-xs transition-colors ${charCount === 0 ? 'text-white/25' : rule.ok ? 'text-white/50' : 'text-red-400/80'}`}>{rule.text}</span>
                    </div>
                  ))}

                  {availability !== 'idle' && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {availability === 'checking' && (
                        <><svg className="animate-spin text-white/30" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span className="text-xs text-white/30">Checking availability…</span></>
                      )}
                      {availability === 'available' && (
                        <><svg className="text-green-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span className="text-xs text-green-500">Username is available</span></>
                      )}
                      {availability === 'taken' && (
                        <><svg className="text-red-400" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span className="text-xs text-red-400">Username already taken</span></>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!canProceed}
                  className="mt-1 w-full bg-white text-black font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Next
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 2: Interests ── */}
          {step === 2 && (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => goToStep(1)}
                  className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
                  aria-label="Go back"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-bold text-base leading-none">What describes you the most?</h2>
                  <p className="text-white/35 text-xs mt-1">Pick at least one, <span className="text-orange-400">@{username}</span></p>
                </div>
                <span className={`text-xs tabular-nums shrink-0 ${selectedInterests.length >= MAX_INTERESTS ? 'text-orange-400' : 'text-white/40'}`}>
                  {selectedInterests.length}/{MAX_INTERESTS}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {INTERESTS.map((it) => {
                  const selected = selectedInterests.includes(it.id)
                  const atLimit = selectedInterests.length >= MAX_INTERESTS && !selected
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => toggleInterest(it.id)}
                      disabled={atLimit}
                      className={`flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl border transition-all duration-150 ${
                        selected
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                          : atLimit
                          ? 'border-white/8 bg-white/3 text-white/25 cursor-not-allowed'
                          : 'border-white/8 bg-white/3 text-white/55 hover:border-white/20 hover:bg-white/6 hover:text-white/80'
                      }`}
                    >
                      <span className="shrink-0">{it.icon}</span>
                      <span className="text-[11px] font-medium leading-none text-center">{it.label}</span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={handleInterestsContinue}
                disabled={selectedInterests.length < 1}
                className="mt-5 w-full bg-white text-black font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
          )}

          {/* ── STEP 3: Region (optional) ── */}
          {step === 3 && (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => goToStep(2)}
                  className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
                  aria-label="Go back"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-bold text-base leading-none">Where are you based?</h2>
                  <p className="text-white/35 text-xs mt-1">Helps people nearby find you, <span className="text-orange-400">@{username}</span></p>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-white/35 shrink-0 px-1.5 py-0.5 rounded-md border border-white/10">
                  Optional
                </span>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); handleRegionContinue() }}
                className="flex flex-col gap-2"
              >
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </span>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => { setRegion(e.target.value); if (regionError) setRegionError('') }}
                    placeholder="e.g. Bangalore, India"
                    maxLength={30}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    className={`w-full bg-white/5 border rounded-xl pl-9 pr-12 py-2.5 text-white placeholder:text-white/25 text-sm outline-none transition-colors ${
                      regionError ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-white/30'
                    }`}
                  />
                  <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-xs tabular-nums ${region.length > 25 ? 'text-orange-400' : 'text-white/20'}`}>
                    {region.length}/30
                  </span>
                </div>
                {regionError && (
                  <p className="mt-2 text-red-400 text-xs flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {regionError}
                  </p>
                )}

                <button
                  type="submit"
                  className="mt-3 w-full bg-white text-black font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  Next
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 4: Avatar picker ── */}
          {step === 4 && (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => goToStep(3)}
                  className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
                  aria-label="Go back"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                </button>
                <div>
                  <h2 className="text-white font-bold text-base leading-none">Choose your avatar</h2>
                  <p className="text-white/35 text-xs mt-1">Pick one that feels like you, <span className="text-orange-400">@{username}</span></p>
                </div>
              </div>

              {/* 4×3 animal grid */}
              <div className="grid grid-cols-4 gap-2.5">
                {ANIMALS.map((animal) => {
                  const selected = selectedAvatar === animal.id
                  return (
                    <button
                      key={animal.id}
                      type="button"
                      onClick={() => setSelectedAvatar(animal.id)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-150 ${
                        selected
                          ? 'border-orange-500 bg-orange-500/10 scale-[1.04]'
                          : 'border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/6'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden">
                        {animal.element}
                      </div>
                      <span className={`text-[10px] font-medium leading-none ${selected ? 'text-orange-400' : 'text-white/40'}`}>
                        {animal.name}
                      </span>
                      {selected && (
                        <span className="absolute top-1 right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Get Started */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedAvatar || loading}
                className="mt-5 w-full bg-white text-black font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Setting up…</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>Get Started</>
                )}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/60 text-xs mt-4">
          {step === 1
            ? <>Username again can be modified only <span className="text-white font-semibold">once</span> after sign up.</>
            : step === 2
            ? 'Pick the things you genuinely enjoy — others will see these.'
            : step === 3
            ? 'Region is optional — you can change it later from your profile.'
            : 'You can update your avatar from your profile anytime.'}
        </p>
      </div>
    </div>
  )
}
