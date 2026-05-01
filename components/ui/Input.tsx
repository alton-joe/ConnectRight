'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-sm text-white/70 font-medium">{label}</label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-white/5 border text-white placeholder:text-white/30
            rounded-lg px-4 py-2.5 outline-none transition-colors duration-150
            ${error ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-white/40'}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
