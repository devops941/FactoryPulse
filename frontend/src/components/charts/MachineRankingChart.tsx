import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  Cell,
} from 'recharts'
import { Cpu } from 'lucide-react'

interface MachineRankingDataPoint {
  machine_name: string
  total_minutes: number
  event_count: number
}

interface MachineRankingChartProps {
  data: MachineRankingDataPoint[]
}

function getBarColor(value: number, maxValue: number): string {
  if (maxValue === 0) return '#0F766E'
  const ratio = value / maxValue
  if (ratio > 0.7) return '#DC2626' // critical
  if (ratio > 0.35) return '#F59E0B' // warning
  return '#0F766E' // primary teal
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload[0]) {
    const data = payload[0].payload as MachineRankingDataPoint
    return (
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-dropdown text-xs min-w-[140px]">
        <p className="font-semibold text-[#172033] mb-1 pb-1 border-b border-slate-100">
          {data.machine_name}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#64748B]">Downtime:</span>
            <span className="font-bold text-[#172033]">{data.total_minutes} min</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#64748B]">Events:</span>
            <span className="font-bold text-[#0F766E]">{data.event_count}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function MachineRankingChart({ data }: MachineRankingChartProps) {
  const sortedData = [...data].sort((a, b) => b.total_minutes - a.total_minutes)
  const maxDowntime = Math.max(...sortedData.map((d) => d.total_minutes), 0)

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-card transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
            <Cpu size={16} className="text-[#0F766E]" />
            Top Machines by Downtime
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Equipment contributing highest production losses
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#DC2626]" /> Critical
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#0F766E]" /> Nominal
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        {sortedData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-[#64748B]">
            No machine ranking data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                unit="m"
              />
              <YAxis
                dataKey="machine_name"
                type="category"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                width={85}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_minutes" radius={[0, 4, 4, 0]} barSize={18}>
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.total_minutes, maxDowntime)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
