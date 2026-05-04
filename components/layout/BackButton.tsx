'use client'

import { useRouter } from 'next/navigation'

interface BackButtonProps {
  className?: string
}

export default function BackButton({ className = '' }: BackButtonProps) {
  const router = useRouter()

  // Prefer router.back() so the browser can restore the previous page from
  // its in-memory cache (no server round-trip, no data refetch). Fall back to
  // /home when there is no history entry — e.g. profile opened in a fresh tab.
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/home')
    }
  }

  return (
    <a
      href="/home"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors mt-6 mb-6 group ${className}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="group-hover:-translate-x-0.5 transition-transform"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back to Home
    </a>
  )
}
