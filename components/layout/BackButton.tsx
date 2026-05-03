import Link from 'next/link'

interface BackButtonProps {
  className?: string
}

export default function BackButton({ className = '' }: BackButtonProps) {
  return (
    <Link
      href="/home"
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
    </Link>
  )
}
