'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import BackButton from '@/components/layout/BackButton'
import UserAvatar from '@/components/ui/UserAvatar'
import type { Profile } from '@/types'
import { formatDate } from '@/utils/helpers'
import { ANIMALS } from '@/lib/avatars'
import type { AnimalId } from '@/lib/avatars'

interface ProfileClientProps {
  profile: Profile
}

export default function ProfileClient({ profile }: ProfileClientProps) {
  const [signingOut, setSigningOut] = useState(false)
  const [region, setRegion] = useState(profile.region ?? '')
  const [editingRegion, setEditingRegion] = useState(false)
  const [savingRegion, setSavingRegion] = useState(false)
  const [regionError, setRegionError] = useState('')

  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [pickingAvatar, setPickingAvatar] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState<AnimalId | null>(null)

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
      setEditingRegion(false)
    }
  }

  const handleCancelRegion = () => {
    setRegion(profile.region ?? '')
    setRegionError('')
    setEditingRegion(false)
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
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col pt-24">
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
            className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
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
            <p className="text-white/40 text-xs mb-1">Username</p>
            <p className="text-white text-sm">{profile.username}</p>
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

          <div className="px-4 py-3">
            <p className="text-white/40 text-xs mb-1">Member since</p>
            <p className="text-white text-sm">{formatDate(profile.created_at)}</p>
          </div>
        </div>

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
