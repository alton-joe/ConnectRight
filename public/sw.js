// ConnectRight service worker
// Per spec: only the manifest and the icons folder are pre-cached.
// All page routes, API calls, and Supabase requests go straight to the network.

// Bumped from v1 to v2 to force-replace already-installed workers when push
// support shipped — the activate handler below clears the old cache and
// claims clients so the new push/notificationclick listeners take effect
// immediately, without waiting for a manual hard-refresh.
const CACHE_NAME = 'connectright-v2'

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

// ──────────────────────────────────────────────────────────────────────────
// Push notifications
// ──────────────────────────────────────────────────────────────────────────

// Incoming push from the server. Payload shape (set by /api/push/send):
//   { title, body, url, icon, type, connectionId? }
// type is one of 'message' | 'request' | 'accepted'.
// connectionId is only present when type === 'message'.
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    // Server should always send JSON, but if a stray non-JSON payload arrives
    // (e.g. a generic delivery test) fall back to a plain notification rather
    // than dropping the event.
    data = { title: 'ConnectRight', body: event.data.text(), url: '/' }
  }

  const { title, body, url, icon, type, connectionId } = data

  event.waitUntil(
    (async () => {
      // Suppression rule: only for type === 'message', and only when an
      // existing client is BOTH focused AND on /chat/<connectionId>. Requests
      // and accepts always notify. Backgrounded tabs do not suppress —
      // client.focused must be true.
      if (type === 'message' && connectionId) {
        const targetPath = `/chat/${connectionId}`
        const clientList = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        const focusedOnThisChat = clientList.some((client) => {
          if (!client.focused) return false
          try {
            const path = new URL(client.url).pathname
            return path === targetPath
          } catch {
            return false
          }
        })
        if (focusedOnThisChat) return
      }

      await self.registration.showNotification(title || 'ConnectRight', {
        body: body || '',
        icon: icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: { url: url || '/' },
        vibrate: [200, 100, 200],
        requireInteraction: false,
        // Stack notifications per conversation/type so the same chat doesn't
        // pile up multiple unread tray entries — newer replaces older.
        tag: type === 'message' && connectionId ? `chat-${connectionId}` : type || 'default',
        renotify: true,
      })
    })()
  )
})

// Tap → focus or open the right page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // Prefer focusing an existing client. If one is already on the target
      // path, just focus it. Otherwise focus any same-origin client and
      // navigate it.
      for (const client of clientList) {
        if (!client.url.startsWith(self.location.origin)) continue
        try {
          const path = new URL(client.url).pathname
          if (path === url) {
            return client.focus()
          }
        } catch { /* ignore parse failures */ }
      }

      for (const client of clientList) {
        if (!client.url.startsWith(self.location.origin)) continue
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try { await client.navigate(url) } catch { /* navigate can throw on cross-origin */ }
          }
          return
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })()
  )
})
