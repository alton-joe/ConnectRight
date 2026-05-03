'use client'

import { useEffect, useState, ReactNode } from 'react'
import InstallPage from './InstallPage'

const SKIP_KEY = 'pwa-install-skipped'

export default function InstallGate({ children }: { children: ReactNode }) {
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone =
      (navigator as unknown as { standalone?: boolean }).standalone === true
    const isInstalled = isStandalone || isIOSStandalone
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    let skipped = false
    try {
      skipped = window.localStorage.getItem(SKIP_KEY) === '1'
    } catch {
      // localStorage may be unavailable (private mode etc.) — treat as not skipped
    }

    if (isMobile && !isInstalled && !skipped) {
      setShowInstall(true)
    }
  }, [])

  const handleContinueInBrowser = () => {
    try {
      window.localStorage.setItem(SKIP_KEY, '1')
    } catch {
      // ignore — flag is best-effort
    }
    setShowInstall(false)
  }

  return (
    <>
      {children}
      {showInstall && <InstallPage onContinueInBrowser={handleContinueInBrowser} />}
    </>
  )
}
