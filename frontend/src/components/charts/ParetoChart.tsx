import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'
import { AlertCircle } from 'lucide-react'

interface ParetoDataPoint {
  reason_label: string
  total_minutes: number
  share_pct: number
  cumulative_pct: number
}

interface ParetoChartProps {
  data: ParetoDataPoint[]
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload as ParetoDataPoint
    return (
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-dropdown text-xs min-w-[150px]">
        <p className="font-semibold text-[#172033] mb-1.5 pb-1 border-b border-slate-100 truncate">
          {data.reason_label}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#64748B]">Duration:</span>
            <span className="font-bold text-[#0F766E]">{data.total_minutes} min</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#64748B]">Cumulative:</span>
            <span className="font-bold text-[#F59E0B]">
              {typeof data.cumulative_pct === 'number' ? data.cumulative_pct.toFixed(1) : '0.0'}%
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function ParetoChart({ data }: ParetoChartProps) {
  const truncatedData = data.map((item) => ({
    ...item,
    short_label:
      item.reason_label.length > 14
        ? item.reason_label.substring(0, 12) + '...'
        : item.reason_label,
  }))

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-card transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
            <AlertCircle size={16} className="text-[#F59E0B]" />
            Loss by Reason (Pareto)
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            80/20 root cause analysis & cumulative impact
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#0F766E]" /> Minutes
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Cumul %
          </span>
        </div>
      </div>

      <div className="h-72 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-[#64748B]">
            No reason breakdown data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={truncatedData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="short_label"
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                interval={0}
                angle={-25}
                textAnchor="end"
              />
              <YAxis
                yAxisId="left"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                unit="m"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#F59E0B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                yAxisId="left"
                dataKey="total_minutes"
                fill="#0F766E"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative_pct"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ fill: '#F59E0B', r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
