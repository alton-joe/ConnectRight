import { isAnimalAvatar, getAnimal } from '@/lib/avatars'

interface UserAvatarProps {
  username: string
  avatarUrl?: string | null
  size?: number
  className?: string
}

export default function UserAvatar({ username, avatarUrl, size = 40, className = '' }: UserAvatarProps) {
  const animal = avatarUrl && isAnimalAvatar(avatarUrl) ? getAnimal(avatarUrl) : null

  if (animal) {
    return (
      <div
        className={`rounded-full overflow-hidden shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        {animal.element}
      </div>
    )
  }

  // Fallback: initial letter
  const fontSize = Math.round(size * 0.36)
  return (
    <div
      className={`rounded-full bg-white/10 flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  )
}
