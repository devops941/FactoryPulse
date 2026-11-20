import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'
import { Clock } from 'lucide-react'

export interface ShiftComparisonDataPoint {
  shift_name: string
  total_minutes?: number
  total_downtime_min?: number
  event_count: number
  [key: string]: any
}

interface ShiftComparisonChartProps {
  data: ShiftComparisonDataPoint[]
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload.length > 0) {
    const d = payload[0].payload as ShiftComparisonDataPoint
    return (
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-dropdown text-xs min-w-[140px]">
        <p className="font-semibold text-[#172033] mb-1 pb-1 border-b border-slate-100">
          {d.shift_name}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#64748B]">Downtime:</span>
            <span className="font-bold text-[#0F766E]">
              {d.total_minutes ?? d.total_downtime_min ?? 0} min
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#64748B]">Incidents:</span>
            <span className="font-bold text-[#0284C7]">{d.event_count}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function ShiftComparisonChart({ data = [] }: ShiftComparisonChartProps) {
  const safeData = Array.isArray(data) ? data : []
  const chartData = safeData.map((d) => ({
    ...d,
    total_minutes: d.total_minutes ?? d.total_downtime_min ?? 0,
  }))

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-card transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
            <Clock size={16} className="text-[#0284C7]" />
            Shift Comparison
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Comparative downtime & incident variance across shifts
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#0F766E]" /> Minutes
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#0284C7]" /> Incidents
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-[#64748B]">
            No shift comparison data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="shift_name"
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
              <Bar dataKey="total_minutes" fill="#0F766E" radius={[4, 4, 0, 0]} barSize={24} name="Downtime" />
              <Bar dataKey="event_count" fill="#0284C7" radius={[4, 4, 0, 0]} barSize={24} name="Events" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
