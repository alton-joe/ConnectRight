'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

const slides = [
  {
    title: 'Welcome to ConnectRight',
    description:
      'ConnectRight is a platform to find the right match of people. Browse users, send connection requests, and build your network.',
  },
  {
    title: 'Chat in Real Time',
    description:
      'Once someone accepts your connection request, open a live chat and start messaging instantly — no delays, no refresh needed.',
  },
]

export default function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const flag = localStorage.getItem('connectright_show_welcome')
    if (flag === 'true') setIsOpen(true)
  }, [])

  const dismiss = () => {
    localStorage.removeItem('connectright_show_welcome')
    setIsOpen(false)
  }

  const handleNext = () => {
    if (slide < slides.length - 1) {
      setSlide(slide + 1)
    } else {
      dismiss()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={dismiss}>
      <div className="flex flex-col gap-6">
        {/* Slide indicators */}
        <div className="flex gap-1.5 justify-center">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === slide ? 'w-6 bg-white' : 'w-3 bg-white/20'
              }`}
            />
          ))}
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">{slides[slide].title}</h2>
          <p className="text-white/60 text-sm leading-relaxed">{slides[slide].description}</p>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" size="md" className="flex-1" onClick={dismiss}>
            Skip
          </Button>
          <Button variant="primary" size="md" className="flex-1" onClick={handleNext}>
            {slide < slides.length - 1 ? 'Next' : "Let's go"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
