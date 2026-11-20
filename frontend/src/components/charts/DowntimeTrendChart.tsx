import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'
import { TrendingDown, Calendar } from 'lucide-react'

interface TrendDataPoint {
  date: string
  downtime_minutes: number
  event_count: number
}

interface DowntimeTrendChartProps {
  data: TrendDataPoint[]
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload[0]) {
    const data = payload[0].payload as TrendDataPoint
    return (
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-dropdown text-xs min-w-[140px]">
        <p className="font-semibold text-[#172033] mb-1 pb-1 border-b border-slate-100 flex items-center gap-1.5">
          <Calendar size={12} className="text-[#0F766E]" />
          {data.date}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#64748B]">Downtime:</span>
            <span className="font-bold text-[#0F766E]">{data.downtime_minutes} min</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#64748B]">Incidents:</span>
            <span className="font-bold text-[#334155]">{data.event_count}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function DowntimeTrendChart({ data }: DowntimeTrendChartProps) {
  const totalTrendDowntime = data.reduce((sum, d) => sum + (d.downtime_minutes || 0), 0)

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-card transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
            <TrendingDown size={16} className="text-[#0F766E]" />
            Downtime Trend
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Daily machine downtime minutes and incident spikes
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-[#0F766E] px-2 py-1 rounded bg-teal-50 border border-teal-100">
            {totalTrendDowntime} min Total
          </span>
        </div>
      </div>

      <div className="h-72 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-[#64748B]">
            No downtime recorded in this date range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F766E" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                unit="m"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="downtime_minutes"
                stroke="#0F766E"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#trendGradient)"
                name="Downtime"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
