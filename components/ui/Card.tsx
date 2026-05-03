import { forwardRef, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className = '', children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`bg-zinc-900 border border-white/10 rounded-xl p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
})

export default Card
