'use client'

import Modal from '@/components/ui/Modal'

interface SafariInstructionsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SafariInstructionsModal({ isOpen, onClose }: SafariInstructionsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Home Screen">
      <ol className="flex flex-col gap-5 text-sm text-white/80">
        <li className="flex items-start gap-3">
          <StepNumber n={1} />
          <div className="flex-1 flex items-center justify-between gap-3">
            <span>Tap the Share button at the bottom of Safari</span>
            <ShareIcon />
          </div>
        </li>
        <li className="flex items-start gap-3">
          <StepNumber n={2} />
          <div className="flex-1 flex items-center justify-between gap-3">
            <span>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</span>
            <AddIcon />
          </div>
        </li>
        <li className="flex items-start gap-3">
          <StepNumber n={3} />
          <span className="flex-1 self-center">Tap &ldquo;Add&rdquo; in the top right corner</span>
        </li>
      </ol>

      <button
        onClick={onClose}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-white text-black font-semibold px-4 py-3 min-h-11 rounded-xl hover:bg-gray-50 transition-colors text-sm cursor-pointer"
      >
        Got it
      </button>
    </Modal>
  )
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="shrink-0 w-7 h-7 rounded-full bg-white/10 text-white text-xs font-semibold flex items-center justify-center mt-0.5">
      {n}
    </span>
  )
}

function ShareIcon() {
  return (
    <svg width="22" height="28" viewBox="0 0 22 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 shrink-0">
      <path d="M11 17V3" />
      <polyline points="6 8 11 3 16 8" />
      <path d="M4 13v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V13" />
    </svg>
  )
}

function AddIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 shrink-0">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}
