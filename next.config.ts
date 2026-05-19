import type { NextConfig } from 'next'

// Content-Security-Policy.
//
// CURRENTLY SHIPPING AS REPORT-ONLY: violations are logged to the browser
// console but NOT blocked. This is deliberate — we want to observe real
// traffic for a few days before enforcing, in case a legitimate request
// (e.g. an OAuth flow tweak by Google, a Supabase host change) gets caught.
//
// TO FLIP TO ENFORCING: change the key below from
//   'Content-Security-Policy-Report-Only'  →  'Content-Security-Policy'
// (single-line edit; no value change). Do this only after the browser
// console shows zero violations during normal use.
const cspDirectives = [
  // Fallback for everything not listed. Same-origin only.
  "default-src 'self'",
  // 'unsafe-inline' required: Next.js 16 inlines hydration <script> blocks
  // into the SSR HTML. App Router has no stable nonce hook yet.
  "script-src 'self' 'unsafe-inline'",
  // 'unsafe-inline' required: Tailwind + JSX style props + styled-jsx in
  // Toaster all emit inline styles.
  "style-src 'self' 'unsafe-inline'",
  // 'self' covers /icons /avatars; data:/blob: for inline SVG / generated
  // images; lh3.googleusercontent.com is the only allow-listed Google host
  // (matches next.config.ts images.remotePatterns and lib/notification-icon.ts).
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  // Supabase REST + Auth + Storage (https) and Realtime (wss). Google for
  // OAuth code exchange.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com",
  // Google sometimes loads its sign-in confirmation in an iframe.
  "frame-src 'self' https://accounts.google.com",
  // Service worker at /public/sw.js, registered same-origin.
  "worker-src 'self'",
  // PWA manifest at /public/manifest.json.
  "manifest-src 'self'",
  // Block <object> and <embed>.
  "object-src 'none'",
  // Prevent injected <base> from rewriting relative URLs.
  "base-uri 'self'",
  "form-action 'self'",
  // Same protection as X-Frame-Options: DENY.
  "frame-ancestors 'none'",
  // Auto-promote any stray http:// URLs to https://.
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // X-XSS-Protection removed: deprecated, modern browsers ignore it,
  // and it can introduce XS-leaks in legacy browsers that still honor it.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy-Report-Only', value: cspDirectives },
]

const nextConfig: NextConfig = {
  // Client-side router cache. Without this, Next.js 15+ defaults dynamic
  // segments to 0s — every Home↔Activity click re-runs the page's server
  // queries even when the user just left that page. 30s for unprefetched
  // navigations and 3min for prefetched/static covers normal back-and-forth
  // browsing without serving stale data on long-idle returns.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // Don't eagerly load every route's JS modules into the server process on
    // startup. Routes still compile on first visit; this just avoids the big
    // upfront memory hit on `next dev` boot.
    preloadEntriesOnStart: false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
}

export default nextConfig
