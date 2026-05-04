import ProfileClient from './ProfileClient'

// No server-side data fetching: middleware already guards auth and the profile
// is already cached in the client's useAuth hook (mounted in GlobalHeader).
// This makes the navigation instant — no per-click getUser() or DB round-trip.
export default function ProfilePage() {
  return <ProfileClient />
}
