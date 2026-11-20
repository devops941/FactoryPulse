import { ReactNode, CSSProperties } from 'react'
import clsx from 'clsx'

interface GlassCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

/**
 * Enterprise SaaS Card Component
 * Replaces legacy dark glassmorphism with crisp light theme styling:
 * Pure white card surface, subtle border (#E2E8F0), clean soft shadow.
 */
export default function GlassCard({ children, className, style, onClick }: GlassCardProps) {
  return (
    <div
      style={style}
      onClick={onClick}
      className={clsx(
        'rounded-xl',
        'bg-white',
        'border',
        'border-[#E2E8F0]',
        'shadow-card',
        'transition-all',
        'duration-200',
        onClick && 'cursor-pointer hover:shadow-card-hover hover:border-[#CBD5E1]',
        className
      )}
    >
      {children}
    </div>
  )
}
