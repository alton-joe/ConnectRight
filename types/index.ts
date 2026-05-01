export interface Profile {
  id: string
  username: string
  email: string
  avatar_url: string | null
  region: string | null
  last_active: string
  created_at: string
}

export interface ConnectionRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  sender?: Profile
  receiver?: Profile
}

export interface Connection {
  id: string
  user_a: string
  user_b: string
  created_at: string
  other_user?: Profile
}

export interface Message {
  id: string
  connection_id: string
  sender_id: string
  content: string
  created_at: string
}

export interface ChatNotification {
  id: string
  connectionId: string
  senderUsername: string
  senderAvatarUrl: string | null
  content: string
  created_at: string
}
