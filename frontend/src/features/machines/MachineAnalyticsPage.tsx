import { useState, useMemo, useRef } from 'react'
import { subDays, format } from 'date-fns'
import {
  Clock,
  AlertTriangle,
  Package,
  Plus,
  Search,
  Cpu,
  CheckCircle2,
  Wrench,
  Activity,
  ChevronRight,
  X,
  Zap,
  RotateCcw,
} from 'lucide-react'
import KpiCard from '@/components/dashboard/KpiCard'
import DowntimeTrendChart from '@/components/charts/DowntimeTrendChart'
import ParetoChart from '@/components/charts/ParetoChart'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import GlassCard from '@/components/ui/GlassCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { useMachineAnalytics } from '@/hooks/useAnalytics'
import { useMachines, useLines, Machine } from '@/hooks/useMasterData'
import AddMachineModal from './AddMachineModal'

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export default function MachineAnalyticsPage() {
  const { data: machines = [], isLoading: machinesLoading } = useMachines()
  const { data: lines = [] } = useLines()
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'maintenance' | 'inactive'>('ALL')
  const [lineFilter, setLineFilter] = useState<string>('ALL')

  const analyticsSectionRef = useRef<HTMLDivElement>(null)

  // Map line ID to line name
  const lineMap = useMemo(() => {
    const map = new Map<string, string>()
    lines.forEach((l) => map.set(l.id, l.name))
    return map
  }, [lines])

  // Summary Metrics
  const totalMachines = machines.length
  const activeCount = machines.filter((m) => m.status.toLowerCase() === 'active').length
  const maintenanceCount = machines.filter((m) => m.status.toLowerCase() === 'maintenance').length
  const totalCapacity = machines.reduce((sum, m) => sum + (m.rated_output_per_hour || 0), 0)

  // Filtered Machines
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'ALL' || m.status.toLowerCase() === statusFilter.toLowerCase()

      const matchesLine = lineFilter === 'ALL' || m.line_id === lineFilter

      return matchesSearch && matchesStatus && matchesLine
    })
  }, [machines, searchQuery, statusFilter, lineFilter])

  // Selected Machine object
  const selectedMachine = useMemo(
    () => machines.find((m) => m.id === selectedMachineId) || null,
    [machines, selectedMachineId]
  )

  // Date range: 30 days ago to today
  const today = format(new Date(), 'yyyy-MM-dd')
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')

  const { data: machineAnalytics, isLoading: analyticsLoading } = useMachineAnalytics(
    selectedMachineId,
    thirtyDaysAgo,
    today
  )

  const isAnalyticsLoading = analyticsLoading && !!selectedMachineId

  // Prepare trend data for chart
  const trendData = useMemo(() => {
    if (!machineAnalytics || !('trend' in machineAnalytics)) return []
    return (
      (machineAnalytics.trend as Array<{
        date: string
        downtime_minutes: number
        event_count: number
      }>) || []
    )
  }, [machineAnalytics])

  // Prepare reason breakdown for pareto
  const reasonData = useMemo(() => {
    if (!machineAnalytics || !('downtime_by_reason' in machineAnalytics)) return []
    return (
      machineAnalytics.downtime_by_reason as Array<{
        reason_label: string
        total_minutes: number
        share_pct: number
      }>
    ).map((reason, idx, arr) => ({
      reason_label: reason.reason_label,
      total_minutes: reason.total_minutes,
      share_pct: reason.share_pct,
      cumulative_pct: arr
        .slice(0, idx + 1)
        .reduce((sum, r) => sum + r.share_pct, 0),
    }))
  }, [machineAnalytics])

  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachineId(machine.id)
    setTimeout(() => {
      analyticsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-xl shadow-card">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033]">
              Machine Inventory & Loss Intelligence
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
              {machines.length} Total Registered
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
            Fleet inventory management, operational status monitoring, and 30-day downtime drill-down
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="h-9 px-4 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} />
          Register Machine
        </button>
      </div>

      {/* Top Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#64748B]">
              Total Fleet
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-100">
              <Cpu size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#172033]">{totalMachines}</p>
          <p className="text-xs text-[#64748B] mt-1">Configured on active lines</p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#64748B]">
              Active Online
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-[#16A34A] border border-emerald-100">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#16A34A]">{activeCount}</p>
          <p className="text-xs text-[#64748B] mt-1">
            {totalMachines ? Math.round((activeCount / totalMachines) * 100) : 0}% fleet availability
          </p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#64748B]">
              In Maintenance
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-[#F59E0B] border border-amber-100">
              <Wrench size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#F59E0B]">{maintenanceCount}</p>
          <p className="text-xs text-[#64748B] mt-1">Under scheduled servicing</p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#64748B]">
              Total Fleet Capacity
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-100">
              <Zap size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#172033]">
            {totalCapacity} <span className="text-xs font-normal text-[#64748B]">units/hr</span>
          </p>
          <p className="text-xs text-[#64748B] mt-1">Combined rated output</p>
        </GlassCard>
      </div>

      {/* Machine Master Table Section */}
      <GlassCard className="p-5">
        {/* Table Controls / Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-[#172033]">Equipment Inventory</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-[#0F766E] border border-teal-200">
              {filteredMachines.length} of {machines.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#172033] placeholder-slate-400 focus:outline-none focus:border-[#0F766E]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Line Filter */}
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#172033] focus:outline-none focus:border-[#0F766E]"
            >
              <option value="ALL">All Lines</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'ALL' | 'active' | 'maintenance' | 'inactive')
              }
              className="h-8 px-2.5 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#172033] focus:outline-none focus:border-[#0F766E]"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="maintenance">Maintenance Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {(searchQuery || statusFilter !== 'ALL' || lineFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('ALL')
                  setLineFilter('ALL')
                }}
                className="h-8 px-2.5 flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 rounded-md border border-[#E2E8F0] bg-slate-50 transition-all cursor-pointer"
                title="Reset filters"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Inventory Table */}
        {machinesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-200 rounded-lg">
            <Cpu className="mx-auto text-slate-400 mb-2" size={32} />
            <p className="text-sm font-semibold text-[#172033]">No machines matched your filters</p>
            <p className="text-xs text-[#64748B] mt-0.5">
              Try adjusting your search terms or clearing the status/line filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider font-semibold text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">Production Line</th>
                  <th className="py-3 px-4">Rated Capacity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMachines.map((machine) => {
                  const isSelected = selectedMachineId === machine.id
                  const lineName = lineMap.get(machine.line_id) || 'General Assembly'

                  return (
                    <tr
                      key={machine.id}
                      onClick={() => handleSelectMachine(machine)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                        isSelected
                          ? 'bg-teal-50/50 border-l-4 border-l-[#0F766E]'
                          : 'border-l-4 border-l-transparent'
                      }`}
                    >
                      {/* Machine Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-2 rounded-lg ${
                              isSelected
                                ? 'bg-[#0F766E] text-white shadow-sm'
                                : 'bg-slate-100 text-[#0F766E] border border-slate-200'
                            }`}
                          >
                            <Cpu size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-[#172033]">{machine.name}</p>
                            <span className="inline-block mt-0.5 text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                              {machine.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Production Line */}
                      <td className="py-3 px-4 text-[#64748B]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
                          {lineName}
                        </span>
                      </td>

                      {/* Rated Capacity */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#172033] text-sm">
                          {machine.rated_output_per_hour}
                        </span>{' '}
                        <span className="text-[11px] text-[#64748B]">units/hr</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={machine.status} />
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectMachine(machine)
                          }}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#0F766E] text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Activity size={13} />
                              Active Selection
                            </>
                          ) : (
                            <>
                              View Analytics
                              <ChevronRight size={13} />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Deep Machine Analytics Section (Activated on selection) */}
      <div ref={analyticsSectionRef}>
        {selectedMachine ? (
          <div className="space-y-6 pt-2">
            {/* Analytics Header with Machine Info & Close Button */}
            <GlassCard className="p-5 border-l-4 border-l-[#0F766E]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-100">
                    <Activity size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-[#172033]">
                        {selectedMachine.name}
                      </h2>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {selectedMachine.code}
                      </span>
                      <StatusBadge status={selectedMachine.status} />
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Production Line:{' '}
                      <strong className="text-slate-800">
                        {lineMap.get(selectedMachine.line_id) || 'General Assembly'}
                      </strong>{' '}
                      &bull; Rated Capacity:{' '}
                      <strong className="text-slate-800">
                        {selectedMachine.rated_output_per_hour} units/hr
                      </strong>{' '}
                      &bull; 30-Day Performance History
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMachineId(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <X size={14} />
                  Close Analytics
                </button>
              </div>
            </GlassCard>

            {/* KPI Strip */}
            {isAnalyticsLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <LoadingSkeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <KpiCard
                  title="Total Downtime"
                  value={
                    machineAnalytics ? formatDuration(machineAnalytics.total_downtime_min) : '0m'
                  }
                  unit=""
                  icon={Clock}
                  color="primary"
                />

                <KpiCard
                  title="Incident Count"
                  value={machineAnalytics ? machineAnalytics.event_count : 0}
                  unit="events"
                  icon={AlertTriangle}
                  color="secondary"
                />

                <KpiCard
                  title="Est. Production Lost"
                  value={machineAnalytics ? Math.round(machineAnalytics.est_units_lost) : 0}
                  unit="units"
                  icon={Package}
                  color={
                    machineAnalytics && machineAnalytics.est_units_lost > 50
                      ? 'critical'
                      : 'primary'
                  }
                />
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Downtime Trend - 7 cols */}
              <div className="lg:col-span-7">
                {isAnalyticsLoading ? (
                  <LoadingSkeleton className="h-80 w-full" />
                ) : (
                  <DowntimeTrendChart data={trendData} />
                )}
              </div>

              {/* Reason Breakdown - 5 cols */}
              <div className="lg:col-span-5">
                {isAnalyticsLoading ? (
                  <LoadingSkeleton className="h-80 w-full" />
                ) : (
                  <ParetoChart data={reasonData} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-[#CBD5E1] bg-white text-center">
            <p className="text-xs text-[#64748B]">
              💡 <strong>Quick Tip:</strong> Click any machine in the inventory table above or click{' '}
              <span className="text-[#0F766E] font-semibold">"View Analytics"</span> to inspect its 30-day downtime trends, root causes, and production loss impact.
            </p>
          </div>
        )}
      </div>

      {/* Add Machine Modal */}
      <AddMachineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onMachineCreated={(id) => handleSelectMachine({ id } as Machine)}
      />
    </div>
  )
}
