import ChatPageClient from './ChatPageClient'

interface ChatPageProps {
  params: Promise<{ connectionId: string }>
}

// No server-side data fetching: middleware already guards auth, and the
// connection (with the other user's profile) is already cached client-side
// by RealtimeProvider. Skipping the per-click getUser() + connection JOIN
// makes the chat tile open instantly on mobile.
export default async function ChatPage({ params }: ChatPageProps) {
  const { connectionId } = await params
  return <ChatPageClient connectionId={connectionId} />
}
