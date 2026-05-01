import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export default function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-zinc-900 border border-white/10 rounded-xl p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
