import { useState, useMemo, useEffect } from 'react'
import { subDays, format } from 'date-fns'
import { Clock, TrendingUp, AlertTriangle, Building2, BarChart2 } from 'lucide-react'
import ShiftComparisonChart from '@/components/charts/ShiftComparisonChart'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import GlassCard from '@/components/ui/GlassCard'
import { useShiftAnalytics } from '@/hooks/useAnalytics'
import { usePlants } from '@/hooks/useMasterData'

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export default function ShiftAnalyticsPage() {
  const { data: plants = [] } = usePlants()
  const [selectedPlantId, setSelectedPlantId] = useState<string | undefined>(plants[0]?.id)

  useEffect(() => {
    if (plants.length > 0 && !selectedPlantId) {
      setSelectedPlantId(plants[0].id)
    }
  }, [plants, selectedPlantId])

  // Date range: 30 days ago to today
  const today = format(new Date(), 'yyyy-MM-dd')
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')

  const { data: rawShiftsData = [], isLoading } = useShiftAnalytics(
    selectedPlantId,
    thirtyDaysAgo,
    today
  )

  const shiftsData = Array.isArray(rawShiftsData)
    ? rawShiftsData
    : (rawShiftsData as any)?.shifts ?? []

  // Sort by total_minutes descending
  const sortedData = useMemo(() => {
    if (!Array.isArray(shiftsData)) return []
    return [...shiftsData].sort(
      (a, b) =>
        (b.total_downtime_min ?? (b as any).total_minutes ?? 0) -
        (a.total_downtime_min ?? (a as any).total_minutes ?? 0)
    )
  }, [shiftsData])

  const totalShiftDowntime = sortedData.reduce(
    (sum, s) => sum + (s.total_downtime_min ?? (s as any).total_minutes ?? 0),
    0
  )

  const totalShiftEvents = sortedData.reduce((sum, s) => sum + (s.event_count || 0), 0)

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-xl shadow-card">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033]">
              Work Shift Downtime Analytics
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
              Shift Comparison
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
            Compare downtime frequency, duration variance, and operational performance across plant shifts
          </p>
        </div>

        {/* Facility Selector */}
        <div className="flex items-center gap-2.5">
          <Building2 size={16} className="text-[#0F766E]" />
          <select
            value={selectedPlantId || ''}
            onChange={(e) => setSelectedPlantId(e.target.value)}
            disabled={isLoading}
            className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E]"
          >
            {plants.map((plant) => (
              <option key={plant.id} value={plant.id}>
                {plant.name} ({plant.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-100">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Total Shift Downtime
              </p>
              <p className="text-xl font-bold text-[#172033] mt-0.5">
                {formatDuration(totalShiftDowntime)}
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-sky-50 text-[#0284C7] border border-sky-100">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Total Stoppage Incidents
              </p>
              <p className="text-xl font-bold text-[#0284C7] mt-0.5">
                {totalShiftEvents} events
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-[#F59E0B] border border-amber-100">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Highest Impact Shift
              </p>
              <p className="text-xl font-bold text-[#F59E0B] mt-0.5">
                {sortedData[0]?.shift_name || 'N/A'}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Comparison Chart */}
      {isLoading ? (
        <LoadingSkeleton className="h-80 w-full" />
      ) : shiftsData.length > 0 ? (
        <ShiftComparisonChart data={shiftsData} />
      ) : (
        <GlassCard className="p-12 text-center">
          <Clock className="mx-auto text-slate-400 mb-2" size={32} />
          <p className="text-sm font-semibold text-[#172033]">No shift data recorded</p>
          <p className="text-xs text-[#64748B] mt-0.5">
            Log downtime incidents assigned to shifts to visualize performance.
          </p>
        </GlassCard>
      )}

      {/* Shift Breakdown Detail Table */}
      {sortedData.length > 0 && (
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-[#172033] mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-[#0F766E]" />
            Detailed Shift Performance Breakdown
          </h3>

          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider font-semibold text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Shift Name</th>
                  <th className="py-3 px-4">Downtime Minutes</th>
                  <th className="py-3 px-4">Duration (Hours)</th>
                  <th className="py-3 px-4">Incidents</th>
                  <th className="py-3 px-4 text-right">Share of Plant Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedData.map((shift, idx) => {
                  const minutes = shift.total_downtime_min ?? (shift as any).total_minutes ?? 0
                  const sharePct =
                    totalShiftDowntime > 0
                      ? ((minutes / totalShiftDowntime) * 100).toFixed(1)
                      : '0.0'

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#172033]">
                        {shift.shift_name}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#0F766E]">
                        {minutes} min
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {formatDuration(minutes)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#172033]">
                        {shift.event_count}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-block px-2 py-0.5 rounded font-mono font-bold bg-teal-50 text-[#0F766E] border border-teal-100">
                          {sharePct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
