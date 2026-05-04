// Maps a profile's avatar_url to a URL the recipient's OS can fetch when
// rendering a push notification.
//   - "cr:fox"            → "/avatars/cr-fox.png" (pre-baked PNG, see scripts/generate-avatars.mjs)
//   - "https://lh3.googleusercontent.com/..." → passes through unchanged
//   - null / unknown      → app icon fallback so the notification isn't iconless

const APP_ICON_FALLBACK = '/icons/icon-192x192.png'

export function iconForAvatar(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) return APP_ICON_FALLBACK
  if (avatarUrl.startsWith('cr:')) {
    return `/avatars/${avatarUrl.replace(':', '-')}.png`
  }
  if (avatarUrl.startsWith('https://') || avatarUrl.startsWith('http://')) {
    return avatarUrl
  }
  return APP_ICON_FALLBACK
}
