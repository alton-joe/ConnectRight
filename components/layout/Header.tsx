'use client'

import Link from 'next/link'

interface HeaderProps {
  pendingCount?: number
  onInboxClick?: () => void
}

export default function Header({ pendingCount = 0, onInboxClick }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-black border-b border-white/10 flex items-center justify-between px-4 z-40">
      <Link href="/home" className="text-white font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
        ConnectRight
      </Link>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-6">
        {[
          { label: 'Home', href: '#' },
          { label: 'Connect', href: '#' },
          { label: 'About', href: '#' },
          { label: 'Contact', href: '#' },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            className="px-3 py-1.5 text-base text-white/60 hover:text-white rounded-lg transition-colors"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {/* Inbox button */}
        <button
          onClick={onInboxClick}
          className="relative p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Open inbox"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </button>

        {/* Profile button */}
        <Link
          href="/profile"
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="View profile"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </Link>
      </div>
    </header>
  )
}
