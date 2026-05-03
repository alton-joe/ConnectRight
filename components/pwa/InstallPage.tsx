'use client'

import { useEffect, useState } from 'react'
import SafariInstructionsModal from './SafariInstructionsModal'

interface InstallPageProps {
  onContinueInBrowser: () => void
}

type BrowserKind = 'chrome-android' | 'safari-ios' | 'other'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function InstallPage({ onContinueInBrowser }: InstallPageProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showSafariInstructions, setShowSafariInstructions] = useState(false)
  const [browserKind, setBrowserKind] = useState<BrowserKind>('other')
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(ua)
    const isAndroid = /Android/i.test(ua)
    const isSafariOnIOS = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
    if (isAndroid) setBrowserKind('chrome-android')
    else if (isSafariOnIOS) setBrowserKind('safari-ios')
    else setBrowserKind('other')

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setInstalling(true)
      try {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        setDeferredPrompt(null)
        if (outcome === 'accepted') {
          window.location.href = '/home'
        }
      } finally {
        setInstalling(false)
      }
    } else {
      setShowSafariInstructions(true)
    }
  }

  const helperText =
    browserKind === 'chrome-android'
      ? 'Tap Download Now to install'
      : browserKind === 'safari-ios'
        ? "Tap the share icon below then 'Add to Home Screen'"
        : 'Install this app for the best experience'

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center px-6"
        style={{
          paddingTop: 'max(2rem, env(safe-area-inset-top))',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex-1 w-full flex flex-col items-center justify-center">
          <div className="flex flex-col items-center text-center max-w-sm w-full gap-6">
            {/* Brand — same style as GlobalHeader */}
            <div className="font-bold text-2xl tracking-tight flex items-center">
              <span className="text-white">Connect</span>
              <span className="text-orange-500">Right</span>
              <span className="text-white ml-1">.</span>
            </div>

            {/* App icon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192x192.png"
              alt="ConnectRight icon"
              width={120}
              height={120}
              className="rounded-3xl shadow-2xl"
            />

            {/* App name */}
            <h1 className="text-4xl font-bold tracking-tight">ConnectRight</h1>

            {/* Tagline */}
            <p className="text-white/60 text-base leading-relaxed">
              Find the right people. Connect instantly.
            </p>

            {/* Download button — matches existing primary button style */}
            <button
              onClick={handleInstallClick}
              disabled={installing}
              className="w-full inline-flex items-center justify-center gap-2 bg-white text-black font-semibold px-5 py-3.5 min-h-12 rounded-xl hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.99] hover:shadow-lg transition-all duration-200 ease-out text-base disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none cursor-pointer"
            >
              <DownloadIcon size={18} />
              {installing ? 'Installing...' : 'Download Now'}
            </button>

            {/* Helper text */}
            <p className="text-white/40 text-sm">{helperText}</p>
          </div>
        </div>

        {/* Continue in browser */}
        <button
          onClick={onContinueInBrowser}
          className="text-white/40 hover:text-white/70 text-sm underline-offset-4 hover:underline transition-colors py-2"
        >
          or continue in browser
        </button>
      </div>

      <SafariInstructionsModal
        isOpen={showSafariInstructions}
        onClose={() => setShowSafariInstructions(false)}
      />
    </>
  )
}

function DownloadIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
