import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import clsx from 'clsx'

export type KpiCardColor = 'primary' | 'success' | 'warning' | 'critical' | 'secondary'

interface KpiCardProps {
  title: string
  value: string | number
  unit?: string
  icon: LucideIcon
  subtitle?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  color?: KpiCardColor
  className?: string
}

const colorConfig: Record<
  KpiCardColor,
  { iconBg: string; iconColor: string; iconBorder: string }
> = {
  primary: {
    iconBg: 'bg-teal-50',
    iconColor: 'text-[#0F766E]',
    iconBorder: 'border-teal-100',
  },
  secondary: {
    iconBg: 'bg-slate-100',
    iconColor: 'text-[#334155]',
    iconBorder: 'border-slate-200',
  },
  success: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-[#16A34A]',
    iconBorder: 'border-emerald-100',
  },
  warning: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-[#F59E0B]',
    iconBorder: 'border-amber-100',
  },
  critical: {
    iconBg: 'bg-rose-50',
    iconColor: 'text-[#DC2626]',
    iconBorder: 'border-rose-100',
  },
}

export default function KpiCard({
  title,
  value,
  unit,
  icon: Icon,
  subtitle,
  trend,
  color = 'primary',
  className,
}: KpiCardProps) {
  const config = colorConfig[color] || colorConfig.primary

  return (
    <div
      className={clsx(
        'rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-card',
        'transition-all duration-200 hover:shadow-card-hover hover:border-[#CBD5E1]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#172033]">
              {value}
            </span>
            {unit && (
              <span className="text-xs sm:text-sm font-medium text-[#64748B]">
                {unit}
              </span>
            )}
          </div>
        </div>

        <div
          className={clsx(
            'p-2.5 rounded-lg border flex-shrink-0',
            config.iconBg,
            config.iconColor,
            config.iconBorder
          )}
        >
          <Icon size={20} />
        </div>
      </div>

      {(trend || subtitle) && (
        <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
          {trend ? (
            <div
              className={clsx(
                'inline-flex items-center gap-1 font-semibold rounded-full px-2 py-0.5',
                trend.direction === 'up'
                  ? color === 'critical'
                    ? 'bg-rose-50 text-[#DC2626]'
                    : 'bg-emerald-50 text-[#16A34A]'
                  : color === 'critical'
                  ? 'bg-emerald-50 text-[#16A34A]'
                  : 'bg-rose-50 text-[#DC2626]'
              )}
            >
              {trend.direction === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend.value)}%</span>
              <span className="font-normal text-[#64748B] ml-0.5">vs last period</span>
            </div>
          ) : null}

          {subtitle && (
            <span className="text-[#64748B] truncate ml-auto">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  )
}
