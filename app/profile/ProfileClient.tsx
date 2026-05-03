'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import BackButton from '@/components/layout/BackButton'
import UserAvatar from '@/components/ui/UserAvatar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toaster'
import type { Profile } from '@/types'
import { formatDate } from '@/utils/helpers'
import { ANIMALS } from '@/lib/avatars'
import type { AnimalId } from '@/lib/avatars'
import { INTERESTS, MAX_INTERESTS, getInterest } from '@/lib/interests'

interface ProfileClientProps {
  profile: Profile
}

export default function ProfileClient({ profile }: ProfileClientProps) {
  const { showToast } = useToast()
  const [signingOut, setSigningOut] = useState(false)
  const [region, setRegion] = useState(profile.region ?? '')
  const [editingRegion, setEditingRegion] = useState(false)
  const [savingRegion, setSavingRegion] = useState(false)
  const [regionError, setRegionError] = useState('')

  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [pickingAvatar, setPickingAvatar] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState<AnimalId | null>(null)

  const [interests, setInterests] = useState<string[]>(profile.interests ?? [])
  const [draftInterests, setDraftInterests] = useState<string[]>(profile.interests ?? [])
  const [editingInterests, setEditingInterests] = useState(false)
  const [savingInterests, setSavingInterests] = useState(false)
  const [interestsError, setInterestsError] = useState('')

  // Username editing — limited to a single change after signup.
  const [username, setUsername] = useState(profile.username)
  const [usernameChangeCount, setUsernameChangeCount] = useState(profile.username_change_count ?? 0)
  const [confirmUsernameOpen, setConfirmUsernameOpen] = useState(false)
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [usernameAvailability, setUsernameAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [savingUsername, setSavingUsername] = useState(false)
  const canEditUsername = usernameChangeCount < 1

  const router = useRouter()

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleSaveRegion = async () => {
    const trimmed = region.trim()
    if (trimmed.length > 80) {
      setRegionError('Region must be 80 characters or less.')
      return
    }
    setSavingRegion(true)
    setRegionError('')
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ region: trimmed || null })
      .eq('id', profile.id)
    setSavingRegion(false)
    if (error) {
      setRegionError('Failed to save. Try again.')
    } else {
      const wasEmpty = !profile.region
      setEditingRegion(false)
      showToast(wasEmpty ? 'Region added' : 'Region updated', 'success')
    }
  }

  const handleCancelRegion = () => {
    setRegion(profile.region ?? '')
    setRegionError('')
    setEditingRegion(false)
  }

  const openInterestsEditor = () => {
    setDraftInterests(interests)
    setInterestsError('')
    setEditingInterests(true)
  }

  const toggleDraftInterest = (id: string) => {
    setDraftInterests((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_INTERESTS) return prev
      return [...prev, id]
    })
  }

  const handleSaveInterests = async () => {
    if (draftInterests.length < 1) {
      setInterestsError('Pick at least one interest.')
      return
    }
    setSavingInterests(true)
    setInterestsError('')
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ interests: draftInterests })
      .eq('id', profile.id)
    setSavingInterests(false)
    if (error) {
      setInterestsError('Failed to save. Try again.')
      return
    }
    setInterests(draftInterests)
    setEditingInterests(false)
    showToast('Interests updated', 'success')
  }

  const supabaseClient = useMemo(() => createClient(), [])

  // Debounced availability check while editing the username.
  useEffect(() => {
    if (!editingUsername) return
    const trimmed = usernameDraft.trim()
    if (trimmed === profile.username) { setUsernameAvailability('idle'); return }
    const formatOk = trimmed.length >= 3 && trimmed.length <= 20 && /^[a-zA-Z0-9_]+$/.test(trimmed)
    if (!formatOk) { setUsernameAvailability('idle'); return }
    setUsernameAvailability('checking')
    let cancelled = false
    const timer = setTimeout(async () => {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('username', trimmed)
        .maybeSingle()
      if (cancelled) return
      if (error) { setUsernameAvailability('available'); return }
      setUsernameAvailability(data ? 'taken' : 'available')
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [usernameDraft, editingUsername, profile.username, supabaseClient])

  const beginUsernameEdit = () => {
    setUsernameDraft(profile.username)
    setUsernameError('')
    setUsernameAvailability('idle')
    setEditingUsername(true)
  }

  const cancelUsernameEdit = () => {
    setEditingUsername(false)
    setUsernameDraft('')
    setUsernameError('')
    setUsernameAvailability('idle')
  }

  const handleSaveUsername = async () => {
    const trimmed = usernameDraft.trim()
    if (trimmed === username) { cancelUsernameEdit(); return }
    if (trimmed.length < 3 || trimmed.length > 20) {
      setUsernameError('Username must be 3–20 characters.')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameError('Letters, numbers, and underscores only.')
      return
    }
    if (usernameAvailability === 'taken') {
      setUsernameError('That username is already taken.')
      return
    }
    setSavingUsername(true)
    setUsernameError('')
    const { error } = await supabaseClient
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', profile.id)
    setSavingUsername(false)
    if (error) {
      // 23505 = unique violation; trigger raises a generic exception when cap reached.
      if (error.code === '23505') {
        setUsernameError('That username was just taken. Pick another.')
      } else if (error.message.toLowerCase().includes('username can only be changed once')) {
        setUsernameError('You have already used your one allowed change.')
        setUsernameChangeCount(1)
      } else {
        setUsernameError('Failed to save. Try again.')
      }
      return
    }
    setUsername(trimmed)
    setUsernameChangeCount((c) => c + 1)
    setEditingUsername(false)
    showToast(`Username changed to @${trimmed}`, 'success')
  }

  const handleSelectAvatar = async (id: AnimalId) => {
    setSavingAvatar(id)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: id })
      .eq('id', profile.id)
    setSavingAvatar(null)
    if (!error) {
      setAvatarUrl(id)
      setPickingAvatar(false)
      showToast('Avatar updated', 'success')
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col pt-16 md:pt-24">
      <div className="max-w-5xl mx-auto w-full px-4">
        <BackButton />
      </div>
      <main className="flex-1 max-w-sm mx-auto w-full px-4 pb-10 flex flex-col gap-6">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            <UserAvatar username={profile.username} avatarUrl={avatarUrl} size={80} />
            <button
              onClick={() => setPickingAvatar((v) => !v)}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              aria-label="Change avatar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
          <button
            onClick={() => setPickingAvatar((v) => !v)}
            className="inline-flex items-center justify-center min-h-9 px-3 text-xs text-orange-400 hover:text-orange-300 transition-colors"
          >
            {pickingAvatar ? 'Cancel' : 'Change avatar'}
          </button>
        </div>

        {/* Avatar picker */}
        {pickingAvatar && (
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
            <p className="text-white/40 text-xs mb-3">Choose an avatar</p>
            <div className="grid grid-cols-4 gap-2">
              {ANIMALS.map((animal) => {
                const isSelected = avatarUrl === animal.id
                const isSaving = savingAvatar === animal.id
                return (
                  <button
                    key={animal.id}
                    onClick={() => handleSelectAvatar(animal.id)}
                    disabled={savingAvatar !== null}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-150 disabled:opacity-60 ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/6'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      {isSaving ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="animate-spin text-white/50" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                          </svg>
                        </div>
                      ) : (
                        animal.element
                      )}
                    </div>
                    <span className={`text-[10px] font-medium leading-none ${isSelected ? 'text-orange-400' : 'text-white/40'}`}>
                      {animal.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Info card */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white/40 text-xs">Username</p>
              {!editingUsername && canEditUsername && (
                <button
                  onClick={() => setConfirmUsernameOpen(true)}
                  className="text-xs text-orange-400 hover:text-orange-300 cursor-pointer transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {editingUsername ? (
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-sm select-none">@</span>
                  <input
                    type="text"
                    aria-label="New username"
                    value={usernameDraft}
                    onChange={(e) => { setUsernameDraft(e.target.value); if (usernameError) setUsernameError('') }}
                    placeholder="Johnny_depp"
                    maxLength={20}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    className={`w-full bg-zinc-800 border rounded-lg pl-7 pr-3 py-1.5 text-white text-sm placeholder-white/30 focus:outline-none transition-colors ${
                      usernameError || usernameAvailability === 'taken'
                        ? 'border-red-500/60 focus:border-red-500'
                        : usernameAvailability === 'available'
                        ? 'border-green-500/40 focus:border-green-500/60'
                        : 'border-white/10 focus:border-orange-500'
                    }`}
                  />
                </div>
                {usernameAvailability === 'checking' && (
                  <p className="text-white/40 text-xs">Checking availability…</p>
                )}
                {usernameAvailability === 'available' && (
                  <p className="text-green-500 text-xs">Username is available</p>
                )}
                {usernameAvailability === 'taken' && (
                  <p className="text-red-400 text-xs">Username already taken</p>
                )}
                {usernameError && <p className="text-red-400 text-xs">{usernameError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveUsername}
                    disabled={savingUsername || usernameAvailability === 'checking'}
                    className="text-xs bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white px-3 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    {savingUsername ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={cancelUsernameEdit}
                    disabled={savingUsername}
                    className="text-xs text-white/50 hover:text-white px-3 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-white text-sm">{username}</p>
            )}
          </div>
          <div className="px-4 py-3">
            <p className="text-white/40 text-xs mb-1">Email</p>
            <p className="text-white text-sm">{profile.email}</p>
          </div>

          {/* Region — editable */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white/40 text-xs">Region</p>
              {!editingRegion && (
                <button
                  onClick={() => setEditingRegion(true)}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  {region ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {editingRegion ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  aria-label="Region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. Bangalore, India"
                  maxLength={80}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-orange-500"
                />
                {regionError && <p className="text-red-400 text-xs">{regionError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveRegion}
                    disabled={savingRegion}
                    className="text-xs bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white px-3 py-1 rounded-lg transition-colors"
                  >
                    {savingRegion ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelRegion}
                    className="text-xs text-white/50 hover:text-white px-3 py-1 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-white text-sm">{region || <span className="text-white/30">Not set</span>}</p>
            )}
          </div>

          {/* Interests — editable */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/40 text-xs">Interests</p>
              <button
                onClick={openInterestsEditor}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                {interests.length > 0 ? 'Edit' : 'Add'}
              </button>
            </div>
            {interests.length > 0 ? (
              <p className="text-white text-sm">
                {interests.map((id) => getInterest(id)?.label).filter(Boolean).join(', ')}
              </p>
            ) : (
              <p className="text-white/30 text-sm">Not set</p>
            )}
          </div>

          <div className="px-4 py-3">
            <p className="text-white/40 text-xs mb-1">Member since</p>
            <p className="text-white text-sm">{formatDate(profile.created_at)}</p>
          </div>
        </div>

        {/* Username change — one-time warning */}
        <Modal
          isOpen={confirmUsernameOpen}
          onClose={() => setConfirmUsernameOpen(false)}
        >
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/15 text-red-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 className="text-white font-bold text-lg text-center">Change username — last time</h2>
          <p className="text-white/60 text-sm text-center mt-2 leading-relaxed">
            You can only change your username <span className="text-white font-semibold">once</span> after signup. Once saved, this action cannot be undone and the username will be locked permanently.
          </p>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setConfirmUsernameOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { setConfirmUsernameOpen(false); beginUsernameEdit() }}
              className="flex-1 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-gray-100 cursor-pointer transition-colors"
            >
              Proceed
            </button>
          </div>
        </Modal>

        {/* Interests editor modal */}
        <Modal
          isOpen={editingInterests}
          onClose={() => { if (!savingInterests) setEditingInterests(false) }}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-base leading-none">Edit your interests</h2>
              <p className="text-white/35 text-xs mt-1">Pick at least one</p>
            </div>
            <span className={`text-xs tabular-nums shrink-0 ${draftInterests.length >= MAX_INTERESTS ? 'text-orange-400' : 'text-white/40'}`}>
              {draftInterests.length}/{MAX_INTERESTS}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {INTERESTS.map((it) => {
              const selected = draftInterests.includes(it.id)
              const atLimit = draftInterests.length >= MAX_INTERESTS && !selected
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => toggleDraftInterest(it.id)}
                  disabled={atLimit || savingInterests}
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

          {interestsError && <p className="text-red-400 text-xs mt-3">{interestsError}</p>}

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setEditingInterests(false)}
              disabled={savingInterests}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveInterests}
              disabled={savingInterests || draftInterests.length < 1}
              className="flex-1 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {savingInterests ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>

        {/* Sign out */}
        <Button
          variant="danger"
          size="lg"
          className="w-full mt-4 flex items-center justify-center gap-2"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </Button>
      </main>
    </div>
  )
}
