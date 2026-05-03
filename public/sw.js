// ConnectRight service worker
// Per spec: only the manifest and the icons folder are pre-cached.
// All page routes, API calls, and Supabase requests go straight to the network.

const CACHE_NAME = 'connectright-v1'

const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll is atomic — if any single asset fails the whole batch rolls back.
      // Use individual puts so a missing icon at install time doesn't kill the SW.
      Promise.all(
        STATIC_ASSETS.map((url) =>
          fetch(url, { cache: 'no-store' })
            .then((res) => (res.ok ? cache.put(url, res) : null))
            .catch(() => null)
        )
      )
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Same-origin only — never intercept third-party.
  if (url.origin !== self.location.origin) return

  const isManifest = url.pathname === '/manifest.json'
  const isIcon = url.pathname.startsWith('/icons/')

  // Page routes, API routes, RSC payloads, _next/data, etc — always go to network.
  // No fallback to cache; offline shows the OfflineOverlay.
  if (!isManifest && !isIcon) return

  // Network-first for the manifest + icons; fall back to cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
        }
        return res
      })
      .catch(() => caches.match(req).then((c) => c || Response.error()))
  )
})
