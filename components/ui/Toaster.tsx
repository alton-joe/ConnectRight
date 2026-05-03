'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type ToastVariant = 'success' | 'info' | 'error'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}

const STORAGE_KEY = 'connectright_pending_toasts'

// Use to surface a toast that should appear after a navigation (e.g. a
// server-action that immediately redirects). The next ToasterProvider mount
// drains the queue.
export function queueToast(message: string, variant: ToastVariant = 'success') {
  if (typeof window === 'undefined') return
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    const list = raw ? (JSON.parse(raw) as { message: string; variant: ToastVariant }[]) : []
    list.push({ message, variant })
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // sessionStorage unavailable — silently drop
  }
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-green-500/40 text-green-400',
  info: 'border-orange-500/40 text-orange-300',
  error: 'border-red-500/40 text-red-400',
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  // Drain any toasts that were queued before a navigation.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        window.sessionStorage.removeItem(STORAGE_KEY)
        const list = JSON.parse(raw) as { message: string; variant: ToastVariant }[]
        list.forEach((t) => showToast(t.message, t.variant))
      }
    } catch {
      // ignore parse / storage errors
    }

    // Server-side OAuth callback drops a `cr_just_verified=<kind>` cookie that
    // we surface here, then immediately delete so the toast doesn't repeat.
    // <kind> is 'signup' for fresh users and 'login' for returning ones.
    const flag = document.cookie
      .split('; ')
      .find((c) => c.startsWith('cr_just_verified='))
    if (flag) {
      const kind = flag.split('=')[1]
      document.cookie = 'cr_just_verified=; path=/; max-age=0'
      if (kind === 'signup') {
        showToast('Signed up successfully', 'success')
      } else {
        showToast('Logged in successfully', 'success')
      }
    }
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none overflow-hidden pl-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 bg-zinc-900/95 backdrop-blur border ${VARIANT_STYLES[t.variant]} rounded-xl shadow-2xl px-4 py-2.5 min-w-[240px] max-w-sm animate-toast-in`}
            role="status"
          >
            <span className="shrink-0">{ICONS[t.variant]}</span>
            <p className="text-white text-sm flex-1">{t.message}</p>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes toast-in {
          0% {
            opacity: 0;
            transform: translateX(calc(100% + 2rem));
          }
          60% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-toast-in {
          animation: toast-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
          will-change: transform, opacity;
        }
      `}</style>
    </ToastContext.Provider>
  )
}
