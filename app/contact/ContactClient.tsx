'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import BackButton from '@/components/layout/BackButton'

const SUBJECTS = [
  'General Inquiry',
  'Report a Bug',
  'Report Abuse',
  'Account Issue',
  'Feature Request',
  'Report User',
]

const SUPPORT_CATEGORIES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
        <path d="M15.54 8.46a5 5 0 010 7.07M8.46 8.46a5 5 0 000 7.07"/>
      </svg>
    ),
    title: 'Technical Support',
    desc: 'Issues with login, chat, connections, and more.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    title: 'Report Abuse',
    desc: 'Harassment, spam, or any violation of our terms.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
    title: 'Account Issues',
    desc: 'Username problems, unauthorized access, deletion.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    title: 'Feedback & Features',
    desc: 'Share ideas to make ConnectRight better.',
  },
]

const FAQS = [
  {
    q: 'How do I delete my account?',
    a: 'Contact us via the form with subject "Account Issue" and request deletion. We process it within 48 hours.',
  },
  {
    q: 'How do I report a user?',
    a: "Use the \"Report User\" option in the contact form. Include the username and a brief description of the issue.",
  },
  {
    q: "Why can't I send messages?",
    a: "You can only message users you're connected with. Send a connection request first and wait for them to accept.",
  },
]

export default function ContactClient() {
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address'
    if (!form.message.trim()) e.message = 'Message is required'
    return e
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    const mailto = `mailto:altonjoe670@gmail.com?subject=${encodeURIComponent(`[${form.subject}] from ${form.name}`)}&body=${encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`
    window.open(mailto)
    setSubmitted(true)
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }))
      setErrors(er => ({ ...er, [key]: '' }))
    },
  })

  return (
    <div className="min-h-screen bg-black flex flex-col pt-16 md:pt-24">
      <div className="max-w-5xl mx-auto w-full px-4">
        <BackButton />
      </div>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pb-12 flex flex-col gap-16">

        {/* Hero */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-orange-400 text-xs font-medium">Typically responds in 24–48 hours</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Get in Touch</h1>
          <p className="text-white/40 text-base max-w-sm">
            Have a question, spotted a bug, or just want to say hi? We're listening.
          </p>
        </div>

        {/* Main two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6">

          {/* Left column */}
          <div className="flex flex-col gap-5">

            {/* Contact info card */}
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 flex flex-col gap-5">
              <h2 className="text-white font-semibold">Contact Info</h2>

              <div className="flex flex-col gap-4">
                <a href="mailto:altonjoe670@gmail.com" className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-orange-400 group-hover:border-orange-500/30 transition-colors shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/30 text-xs">Email</p>
                    <p className="text-white text-sm group-hover:text-orange-400 transition-colors truncate">altonjoe670@gmail.com</p>
                  </div>
                </a>

                <a href="tel:+918610958241" className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-orange-400 group-hover:border-orange-500/30 transition-colors shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/30 text-xs">Phone</p>
                    <p className="text-white text-sm group-hover:text-orange-400 transition-colors">+91 8610958241</p>
                  </div>
                </a>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/30 text-xs">Location</p>
                    <p className="text-white text-sm">India</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/30 text-xs">Response Time</p>
                    <p className="text-white text-sm">Typically 24–48 hours</p>
                  </div>
                </div>
              </div>

              {/* Socials */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-white/30 text-xs mb-3">Find me on</p>
                <div className="flex flex-wrap gap-2">
                  <a href="https://www.linkedin.com/in/alton-joe/" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors text-xs">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </a>
                  <a href="https://github.com/alton-joe" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors text-xs">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub
                  </a>
                  <a href="https://www.instagram.com/alton_joe_" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors text-xs">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                    Instagram
                  </a>
                </div>
              </div>
            </div>

            {/* Support categories */}
            <div className="flex flex-col gap-3">
              <h2 className="text-white font-semibold">Support Categories</h2>
              <div className="grid grid-cols-2 gap-3">
                {SUPPORT_CATEGORIES.map(({ icon, title, desc }) => (
                  <div key={title} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex flex-col gap-2.5 hover:border-white/20 transition-colors">
                    <div className="text-white/50">{icon}</div>
                    <p className="text-white font-medium text-sm">{title}</p>
                    <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — contact form */}
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-16">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">Message sent!</p>
                  <p className="text-white/40 text-sm mt-1 max-w-xs">
                    Your email client should have opened. We'll get back to you within 24–48 hours.
                  </p>
                </div>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: SUBJECTS[0], message: '' }) }}
                  className="text-orange-400 text-sm hover:text-orange-300 transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-white font-semibold">Send a Message</h2>
                  <p className="text-white/30 text-xs">All fields required. Critical issues are prioritized.</p>
                </div>

                {/* Name + Email row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/50 text-xs font-medium">Name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      {...field('name')}
                      className={`bg-black border rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 outline-none focus:border-orange-500/50 transition-colors ${errors.name ? 'border-red-500/60' : 'border-white/10'}`}
                    />
                    {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/50 text-xs font-medium">Email</label>
                    <input
                      type="email"
                      placeholder="you@email.com"
                      {...field('email')}
                      className={`bg-black border rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 outline-none focus:border-orange-500/50 transition-colors ${errors.email ? 'border-red-500/60' : 'border-white/10'}`}
                    />
                    {errors.email && <p className="text-red-400 text-xs">{errors.email}</p>}
                  </div>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/50 text-xs font-medium">Subject</label>
                  <div className="relative">
                    <select
                      {...field('subject')}
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer pr-8"
                    >
                      {SUBJECTS.map(s => (
                        <option key={s} value={s} className="bg-zinc-900">{s}</option>
                      ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/50 text-xs font-medium">Message</label>
                  <textarea
                    rows={6}
                    placeholder="Describe your issue or idea in detail..."
                    {...field('message')}
                    className={`bg-black border rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 outline-none focus:border-orange-500/50 transition-colors resize-none ${errors.message ? 'border-red-500/60' : 'border-white/10'}`}
                  />
                  {errors.message && <p className="text-red-400 text-xs">{errors.message}</p>}
                </div>

                <Button type="submit" variant="primary" size="lg" className="w-full">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-white font-semibold text-xl">Frequently Asked</h2>
            <p className="text-white/30 text-sm mt-1">Quick answers before you reach out.</p>
          </div>
          <div className="flex flex-col gap-2.5 max-w-2xl mx-auto w-full">
            {FAQS.map(({ q, a }, i) => (
              <div key={i} className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                >
                  <span className="text-white text-sm font-medium">{q}</span>
                  <svg
                    width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    className={`text-white/30 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 border-t border-white/5">
                    <p className="text-white/40 text-sm leading-relaxed pt-3">{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center pb-4">
          <p className="text-white/20 text-xs">
            Built and maintained by{' '}
            <a href="https://www.linkedin.com/in/alton-joe/" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/60 transition-colors">
              Alton Joe
            </a>
          </p>
        </div>

      </main>
    </div>
  )
}
