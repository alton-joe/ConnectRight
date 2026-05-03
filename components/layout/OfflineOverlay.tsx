'use client'

import { useEffect, useState } from 'react'

export default function OfflineOverlay() {
  const [offline, setOffline] = useState(false)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    // navigator.onLine reflects only the OS-level network state — true even on
    // flaky connections — so the overlay only fires when the user is fully
    // disconnected, not on slow Wi-Fi.
    const sync = () => setOffline(!navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  const handleRetry = async () => {
    if (retrying) return
    setRetrying(true)
    try {
      // Tiny HEAD probe to a same-origin asset. AbortController so a hung
      // request doesn't leave the button stuck.
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store', signal: controller.signal })
      clearTimeout(timeout)
      // If the fetch resolved, we're online — let the browser fire 'online'
      // naturally, but also reflect it immediately for snappier UX.
      if (navigator.onLine) setOffline(false)
    } catch {
      // Probe failed — still offline. The browser will fire 'online' on its
      // own once the connection is actually back.
    } finally {
      setRetrying(false)
    }
  }

  if (!offline) return null

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-6">
      <div className="max-w-sm w-full flex flex-col items-center text-center gap-6">
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-orange-500"
          aria-hidden="true"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>

        <div className="flex flex-col gap-2">
          <h1 className="text-white text-2xl font-bold">No internet</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            We&apos;ll get you back once your connection is stable.
          </p>
        </div>

        <button
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center justify-center gap-2 bg-white text-black font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-w-[140px]"
        >
          {retrying ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Retrying…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
              </svg>
              Retry
            </>
          )}
        </button>
      </div>
    </div>
  )
}
