import Link from 'next/link'
import SiteFooter from '@/components/layout/SiteFooter'

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({
  icon,
  label,
  centered,
}: {
  icon: React.ReactNode
  label: string
  centered?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 ${centered ? 'justify-center' : ''}`}>
      <span className="text-orange-500">{icon}</span>
      <span className="text-orange-500/70 text-xs font-semibold uppercase tracking-widest">
        {label}
      </span>
    </div>
  )
}

// ─── Founder card ─────────────────────────────────────────────────────────────

function FounderCard({
  initials,
  name,
  role,
  quote,
  accent = false,
}: {
  initials: string
  name: string
  role: string
  quote: string
  accent?: boolean
}) {
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 border ${
          accent
            ? 'bg-orange-500/15 text-orange-400 border-orange-500/25'
            : 'bg-white/8 text-white border-white/10'
        }`}
      >
        {initials}
      </div>
      <div>
        <p className="text-white font-semibold text-sm leading-none">{name}</p>
        <p className="text-white/35 text-xs mt-1 mb-2.5">{role}</p>
        <p className="text-white/55 text-sm leading-relaxed italic">&ldquo;{quote}&rdquo;</p>
      </div>
    </div>
  )
}

// ─── Decorative network SVG ───────────────────────────────────────────────────

function NetworkDecoration() {
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl"
        viewBox="0 0 800 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.055 }}
      >
        {/* lines first so nodes render on top */}
        <line x1="100" y1="190" x2="260" y2="75"  stroke="white"   strokeWidth="1"/>
        <line x1="100" y1="190" x2="260" y2="310" stroke="white"   strokeWidth="1"/>
        <line x1="260" y1="75"  x2="400" y2="155" stroke="#f97316" strokeWidth="1.5"/>
        <line x1="260" y1="310" x2="400" y2="240" stroke="white"   strokeWidth="1"/>
        <line x1="400" y1="155" x2="540" y2="90"  stroke="white"   strokeWidth="1"/>
        <line x1="400" y1="155" x2="400" y2="240" stroke="white"   strokeWidth="0.6" strokeDasharray="5 4"/>
        <line x1="400" y1="240" x2="540" y2="300" stroke="#f97316" strokeWidth="1.5"/>
        <line x1="540" y1="90"  x2="700" y2="190" stroke="white"   strokeWidth="1"/>
        <line x1="540" y1="300" x2="700" y2="190" stroke="white"   strokeWidth="1"/>
        <line x1="260" y1="75"  x2="260" y2="310" stroke="white"   strokeWidth="0.5" strokeDasharray="4 5"/>
        <line x1="540" y1="90"  x2="540" y2="300" stroke="white"   strokeWidth="0.5" strokeDasharray="4 5"/>

        {/* nodes */}
        <circle cx="100" cy="190" r="5"  fill="white"/>
        <circle cx="260" cy="75"  r="5"  fill="#f97316"/>
        <circle cx="260" cy="310" r="5"  fill="white"/>
        <circle cx="400" cy="155" r="7"  fill="#f97316"/>
        <circle cx="400" cy="240" r="5"  fill="white"/>
        <circle cx="540" cy="90"  r="5"  fill="white"/>
        <circle cx="540" cy="300" r="5"  fill="#f97316"/>
        <circle cx="700" cy="190" r="5"  fill="white"/>
      </svg>
    </div>
  )
}

// ─── Belief icons ─────────────────────────────────────────────────────────────

const BELIEFS = [
  {
    title: 'Intentional',
    body: 'Not random, not forced. Every connection starts with a mutual decision — both people choose it.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    ),
  },
  {
    title: 'Natural',
    body: "Based on real vibe and compatibility — because chemistry shouldn't need to be engineered.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 0 1 10 10"/>
        <path d="M12 2C6.48 2 2 6.48 2 12"/>
        <path d="M12 22a10 10 0 0 1 0-20"/>
        <path d="M12 12c0-3.31 2.69-6 6-6"/>
        <path d="M12 12c-3.31 0-6-2.69-6-6"/>
      </svg>
    ),
  },
  {
    title: 'Respectful',
    body: 'No unsolicited messages, no spam. Your inbox only holds conversations you actually want.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
  },
  {
    title: 'Private by Design',
    body: "Your space, your control. Interactions don't happen unless you explicitly allow them.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="bg-black flex flex-col">

      {/* ── HERO ──────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-12 px-6 flex flex-col items-center text-center">
        <NetworkDecoration />

        <span className="relative z-10 inline-block bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
          Our Story
        </span>

        <h1 className="relative z-10 text-4xl md:text-6xl font-bold text-white leading-tight max-w-3xl mb-6">
          Built for connections<br />
          <span className="text-white/30">that actually matter.</span>
        </h1>

        <p className="relative z-10 text-white/45 text-lg max-w-lg leading-relaxed">
          A small team. A big belief. The idea that real connections should feel real again.
        </p>

        {/* Scroll hint */}
        <div className="relative z-10 mt-8 flex flex-col items-center gap-1.5 text-white/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>
          </svg>
        </div>
      </section>

      {/* ── WHO WE ARE ────────────────────────────── */}
      <section className="max-w-5xl mx-auto w-full px-6 py-12">
        <SectionLabel
          label="Who We Are"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />

        <div className="mt-10 grid md:grid-cols-[1fr_340px] gap-12 items-start">
          {/* Narrative */}
          <div className="space-y-5 text-white/55 text-[15px] leading-[1.8]">
            <p>
              ConnectRight was built with a simple idea: real connections should feel real again.
            </p>
            <p>
              We&apos;re a small team led by{' '}
              <span className="text-white font-medium">Alton Joe</span> and{' '}
              <span className="text-white font-medium">Abel Fernando</span>. The platform started as a shared vision. Alton wanted to create a space where people could connect in a meaningful and intentional way, cutting through the noise of typical social platforms.
            </p>
            <p>
              Abel has always been someone who values energy, vibe, and genuine chemistry between people. He believed that in a world full of surface-level interactions, what people actually look for is someone they can naturally connect with, relate to, and just get along with effortlessly.
            </p>
            <div className="border-l-2 border-orange-500 pl-5 py-1">
              <p className="text-white/75 font-medium">
                That balance is what shaped ConnectRight.
              </p>
            </div>
          </div>

          {/* Founder cards */}
          <div className="flex flex-col gap-3">
            <FounderCard
              initials="AJ"
              name="Alton Joe"
              role="Founder & CEO"
              quote="Meaningful spaces, cut through the noise."
              accent
            />
            <FounderCard
              initials="AF"
              name="Abel Fernando"
              role="Co-Founder"
              quote="Right energy, right people, effortlessly."
            />

            {/* Connection line between cards */}
            <div className="flex items-center gap-3 px-5 -mt-1 -mb-1">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-white/20 text-xs">+</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            <div className="bg-zinc-900 border border-white/8 rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <p className="text-white/40 text-xs leading-relaxed">
                Together, building ConnectRight.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT WE BELIEVE ───────────────────────── */}
      <section className="bg-zinc-950 border-y border-white/5 py-20">
        <div className="max-w-5xl mx-auto w-full px-6">
          <SectionLabel
            label="What We Believe"
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            }
          />

          <p className="mt-3 text-white/40 text-sm max-w-lg leading-relaxed">
            We believe connection should be intentional, natural, respectful, and private by design.
          </p>

          {/* 4 belief pillars */}
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {BELIEFS.map((b) => (
              <div
                key={b.title}
                className="group bg-black/40 border border-white/8 hover:border-orange-500/25 rounded-2xl p-6 flex gap-5 transition-all duration-200 hover:bg-orange-500/[0.03]"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 group-hover:bg-orange-500/10 group-hover:border-orange-500/20 flex items-center justify-center text-white/40 group-hover:text-orange-400 transition-all duration-200 shrink-0 mt-0.5">
                  {b.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1.5">{b.title}</p>
                  <p className="text-white/45 text-sm leading-relaxed">{b.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* How it works callout */}
          <div className="mt-6 bg-black/40 border border-white/8 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">
                Users sign in using{' '}
                <span className="text-white/80 font-medium">Google</span> to ensure authenticity, but interaction isn&apos;t open by default. You send a connection request — only after it&apos;s accepted can a conversation begin.{' '}
                <span className="text-white/70">No interruptions. No unwanted messages. No chaos.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY WE BUILT THIS ─────────────────────── */}
      <section className="max-w-5xl mx-auto w-full px-6 py-20">
        <SectionLabel
          label="Why We Built This"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="9" y1="18" x2="15" y2="18"/>
              <line x1="10" y1="22" x2="14" y2="22"/>
              <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
            </svg>
          }
        />

        <blockquote className="mt-8 border-l-2 border-orange-500 pl-6 max-w-xl">
          <p className="text-white/80 text-xl md:text-2xl font-semibold leading-snug">
            Most platforms today prioritize engagement over experience.
          </p>
        </blockquote>

        <div className="mt-8 max-w-2xl space-y-4 text-white/50 text-[15px] leading-[1.8]">
          <p>
            Endless scrolling, random DMs, and interactions that don&apos;t really mean anything.
          </p>
          <p>
            We didn&apos;t want that. We wanted a space where connections happen because{' '}
            <span className="text-white font-medium">both people feel it</span> — not because an algorithm pushed it.
          </p>
        </div>

        {/* Three contrast pills */}
        <div className="mt-10 flex flex-wrap gap-3">
          {[
            { bad: 'Endless scrolling', good: 'Intentional browsing' },
            { bad: 'Random DMs', good: 'Accepted requests only' },
            { bad: 'Algorithm-driven', good: 'Human-driven' },
          ].map((item) => (
            <div
              key={item.bad}
              className="flex items-center gap-2 bg-zinc-900 border border-white/8 rounded-xl px-4 py-2.5"
            >
              <span className="text-white/25 text-xs line-through">{item.bad}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
              <span className="text-white/70 text-xs font-medium">{item.good}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE GOAL ──────────────────────────────── */}
      <section className="bg-zinc-950 border-t border-white/5 py-28 px-6 flex flex-col items-center text-center">
        <SectionLabel
          centered
          label="The Goal"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          }
        />

        <p className="mt-8 text-3xl md:text-4xl font-bold text-white max-w-2xl leading-tight">
          We&apos;re not trying to build another social network.
        </p>
        <p className="mt-5 text-white/40 text-lg max-w-lg leading-relaxed">
          We&apos;re building a space where people actually connect, match energies, and have conversations that feel right.
        </p>

        {/* Stat row */}
        <div className="mt-12 flex flex-wrap justify-center gap-8">
          {[
            { value: '2-way', label: 'consent before chatting' },
            { value: 'Zero', label: 'unsolicited messages' },
            { value: 'One', label: 'real connection beats a hundred random ones' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span className="text-white/35 text-xs max-w-[140px] text-center leading-snug">{stat.label}</span>
            </div>
          ))}
        </div>

        <Link
          href="/"
          className="mt-12 inline-flex items-center gap-2.5 bg-white text-black font-semibold text-sm px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
        >
          Get Started
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </Link>
      </section>

      <SiteFooter />
    </div>
  )
}
