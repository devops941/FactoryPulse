export type StatusType =
  | 'active'
  | 'running'
  | 'maintenance'
  | 'inactive'
  | 'stopped'
  | 'confirmed'
  | 'pending'
  | 'planned'
  | 'unplanned'
  | string

interface StatusBadgeProps {
  status: StatusType
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, label, className = '', size = 'sm' }: StatusBadgeProps) {
  const s = status.toLowerCase()
  const displayLabel = label || status.toUpperCase()

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  if (s === 'active' || s === 'running' || s === 'confirmed') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 ${sizeClasses} ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {displayLabel}
      </span>
    )
  }

  if (s === 'maintenance' || s === 'pending' || s === 'planned') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 ${sizeClasses} ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {displayLabel}
      </span>
    )
  }

  if (s === 'inactive' || s === 'stopped' || s === 'unplanned' || s === 'critical') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 ${sizeClasses} ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        {displayLabel}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      {displayLabel}
    </span>
  )
}
