// Maps a profile's avatar_url to a URL the recipient's OS can fetch when
// rendering a push notification.
//   - "cr:fox"            → "/avatars/cr-fox.png" (pre-baked PNG, see scripts/generate-avatars.mjs)
//   - "https://lh3.googleusercontent.com/..." → passes through unchanged
//   - anything else       → app icon fallback
//
// Only Google's hosted-content host is allow-listed for HTTPS pass-through.
// avatar_url is user-controlled (set via the profile UPDATE path under RLS),
// and the recipient's device fetches this URL when rendering the push. An
// arbitrary URL would leak the recipient's IP / user-agent to whoever the
// sender chose, so we restrict to the same host already allow-listed for
// next/image in next.config.ts.

const APP_ICON_FALLBACK = '/icons/icon-192x192.png'
const ALLOWED_HOST = 'lh3.googleusercontent.com'

export function iconForAvatar(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) return APP_ICON_FALLBACK
  if (avatarUrl.startsWith('cr:')) {
    return `/avatars/${avatarUrl.replace(':', '-')}.png`
  }
  // Strict HTTPS + exact-host match. URL parsing rejects malformed inputs.
  try {
    const parsed = new URL(avatarUrl)
    if (parsed.protocol === 'https:' && parsed.hostname === ALLOWED_HOST) {
      return avatarUrl
    }
  } catch {
    // Fall through to fallback
  }
  return APP_ICON_FALLBACK
}
