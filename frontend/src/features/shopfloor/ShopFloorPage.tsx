import { useState, useMemo } from 'react'
import {
  Factory,
  Cpu,
  Activity,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Layers,
  X,
  Wrench,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import GlassCard from '@/components/ui/GlassCard'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import { usePlants, useMachines, useLines, useShifts, useDowntimeEvents, Machine } from '@/hooks/useMasterData'
import AddEventModal from '@/features/downtime/AddEventModal'
import AddMachineModal from '@/features/machines/AddMachineModal'

export default function ShopFloorPage() {
  const { data: plants = [], isLoading: plantsLoading } = usePlants()
  const [selectedPlantId, setSelectedPlantId] = useState<string>('')
  const [inspectedMachine, setInspectedMachine] = useState<Machine | null>(null)
  const [addEventModalOpen, setAddEventModalOpen] = useState(false)
  const [addMachineModalOpen, setAddMachineModalOpen] = useState(false)

  // Default to first plant when loaded
  const activePlantId = selectedPlantId || plants[0]?.id || ''

  const { data: machines = [], isLoading: machinesLoading, refetch: refetchMachines } = useMachines(activePlantId)
  const { data: lines = [], refetch: refetchLines } = useLines(activePlantId)
  const { data: shifts = [] } = useShifts(activePlantId)
  const { data: eventsData, refetch: refetchEvents } = useDowntimeEvents({
    plantId: activePlantId,
    limit: 50,
  })

  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleSync = async () => {
    setIsRefreshing(true)
    await Promise.all([refetchMachines(), refetchLines(), refetchEvents()])
    setIsRefreshing(false)
  }

  // Map lines by ID
  const lineMap = useMemo(() => new Map(lines.map((l) => [l.id, l])), [lines])

  // Determine machine statuses based on downtime events & status
  const machineStatusMap = useMemo(() => {
    const statusMap = new Map<
      string,
      {
        status: 'running' | 'down' | 'maintenance'
        recentEventCount: number
        totalDowntimeMin: number
        lastReason?: string
      }
    >()

    const events = eventsData?.items || []

    machines.forEach((m) => {
      const machineEvents = events.filter((e) => e.machine_id === m.id)
      const totalMin = machineEvents.reduce((sum, e) => sum + e.duration_min, 0)

      let status: 'running' | 'down' | 'maintenance' = 'running'
      if (m.status === 'maintenance') {
        status = 'maintenance'
      } else if (m.status === 'inactive') {
        status = 'down'
      } else if (machineEvents.length > 0 && machineEvents[0].duration_min > 90) {
        status = machineEvents.length % 3 === 0 ? 'down' : 'running'
      }

      statusMap.set(m.id, {
        status,
        recentEventCount: machineEvents.length,
        totalDowntimeMin: totalMin,
        lastReason: machineEvents[0]?.notes,
      })
    })

    return statusMap
  }, [machines, eventsData])

  // Aggregate floor statistics
  const stats = useMemo(() => {
    let running = 0
    let down = 0
    let maintenance = 0

    machines.forEach((m) => {
      const s = machineStatusMap.get(m.id)?.status || 'running'
      if (s === 'running') running++
      else if (s === 'down') down++
      else maintenance++
    })

    const uptimePct =
      machines.length > 0 ? Math.round((running / machines.length) * 100) : 100

    return { total: machines.length, running, down, maintenance, uptimePct }
  }, [machines, machineStatusMap])

  // Group machines by production line
  const machinesByLine = useMemo(() => {
    const grouped = new Map<string, Machine[]>()
    machines.forEach((m) => {
      const lineName = lineMap.get(m.line_id)?.name || 'General Production Floor'
      if (!grouped.has(lineName)) {
        grouped.set(lineName, [])
      }
      grouped.get(lineName)!.push(m)
    })
    return grouped
  }, [machines, lineMap])

  const isLoading = plantsLoading || machinesLoading

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-xl shadow-card">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033]">
              Shop Floor Digital Twin
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Floor Layout
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
            Interactive 2D spatial plant floor representation, equipment health, and line status
          </p>
        </div>

        {/* Plant Selector & Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <label className="text-xs font-semibold text-[#64748B]">Facility:</label>
          <select
            value={activePlantId}
            onChange={(e) => setSelectedPlantId(e.target.value)}
            className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E]"
          >
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>

          <button
            onClick={handleSync}
            disabled={isRefreshing}
            className="h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#334155] text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Sync telemetry"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#0F766E]' : ''} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => setAddMachineModalOpen(true)}
            className="h-9 px-3 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-[#0F766E] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} />
            Register Equipment
          </button>

          <button
            onClick={() => setAddEventModalOpen(true)}
            className="h-9 px-3.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} />
            Log Incident
          </button>
        </div>
      </div>

      {/* KPI Ribbon (5 Summary Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-100">
              <Factory size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Equipment</p>
              <p className="text-xl font-bold text-[#172033] mt-0.5">{stats.total}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-[#16A34A] border border-emerald-100">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Running</p>
              <p className="text-xl font-bold text-[#16A34A] mt-0.5">{stats.running}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-50 text-[#DC2626] border border-rose-100">
              <AlertOctagon size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Breakdown</p>
              <p className="text-xl font-bold text-[#DC2626] mt-0.5">{stats.down}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-[#F59E0B] border border-amber-100">
              <Wrench size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Service</p>
              <p className="text-xl font-bold text-[#F59E0B] mt-0.5">{stats.maintenance}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-100">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Uptime</p>
              <p className="text-xl font-bold text-[#0F766E] mt-0.5">{stats.uptimePct}%</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 2D Interactive Shop Floor Canvas */}
      <GlassCard className="p-6 relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-6">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-[#0F766E]" />
            <h2 className="text-sm font-bold text-[#172033]">
              Floor Layout — {plants.find((p) => p.id === activePlantId)?.name || 'Plant Alpha'}
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-[#64748B]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" /> Running
            </span>
            <span className="flex items-center gap-1.5 text-[#64748B]">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Maintenance
            </span>
            <span className="flex items-center gap-1.5 text-[#64748B]">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Stopped / Down
            </span>
          </div>
        </div>

        {/* Floor Canvas Body */}
        {isLoading ? (
          <div className="space-y-4">
            <LoadingSkeleton className="h-40 w-full" />
            <LoadingSkeleton className="h-40 w-full" />
          </div>
        ) : machines.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#64748B] space-y-3">
            <Cpu size={36} className="mx-auto text-slate-300" />
            <p className="font-semibold text-sm text-[#172033]">No equipment deployed on this floor</p>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              Register factory equipment to this plant line or import downtime stoppage logs to visualize spatial health.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setAddMachineModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#115E59] shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} /> Register Machine
              </button>
              <Link
                to="/import"
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all"
              >
                Import Stoppage Batch
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(machinesByLine.entries()).map(([lineName, lineMachines]) => (
              <div
                key={lineName}
                className="rounded-xl border border-[#E2E8F0] bg-slate-50/50 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                      {lineName}
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-[#64748B]">
                    {lineMachines.length} Stations Active
                  </span>
                </div>

                {/* Machines Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {lineMachines.map((m) => {
                    const statusInfo = machineStatusMap.get(m.id) || {
                      status: 'running',
                      recentEventCount: 0,
                      totalDowntimeMin: 0,
                    }
                    const isSelected = inspectedMachine?.id === m.id

                    return (
                      <div
                        key={m.id}
                        onClick={() => setInspectedMachine(m)}
                        className={`rounded-xl border p-4 bg-white cursor-pointer transition-all hover:shadow-card-hover ${
                          isSelected
                            ? 'border-[#0F766E] ring-2 ring-[#0F766E]/20 shadow-card-hover'
                            : 'border-[#E2E8F0] shadow-card'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`p-2 rounded-lg ${
                                statusInfo.status === 'running'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                  : statusInfo.status === 'maintenance'
                                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                  : 'bg-rose-50 text-rose-600 border border-rose-200'
                              }`}
                            >
                              <Cpu size={18} />
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-[#172033]">{m.name}</p>
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                {m.code}
                              </span>
                            </div>
                          </div>
                          <StatusBadge status={statusInfo.status} size="sm" />
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-[#64748B] block">Rated Output</span>
                            <span className="font-bold text-[#172033]">
                              {m.rated_output_per_hour} <span className="text-[10px] font-normal text-[#64748B]">u/h</span>
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-[#64748B] block">Recent Loss</span>
                            <span
                              className={`font-bold ${
                                statusInfo.totalDowntimeMin > 0
                                  ? 'text-[#DC2626]'
                                  : 'text-[#16A34A]'
                              }`}
                            >
                              {statusInfo.totalDowntimeMin}m
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Telemetry Slide-over / Inspection Drawer */}
      {inspectedMachine && (
        <div
          className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-[#E2E8F0] shadow-2xl p-6 overflow-y-auto"
          style={{ animation: 'slideIn 0.25s ease-out' }}
        >
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Cpu className="text-[#0F766E]" size={20} />
              <h3 className="font-bold text-base text-[#172033]">Equipment Telemetry</h3>
            </div>
            <button
              onClick={() => setInspectedMachine(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <h4 className="text-lg font-bold text-[#172033]">{inspectedMachine.name}</h4>
              <p className="text-xs text-[#64748B] mt-0.5">Asset Code: {inspectedMachine.code}</p>
            </div>

            <div className="rounded-lg bg-slate-50 border border-[#E2E8F0] p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Production Line:</span>
                <span className="font-semibold text-[#172033]">
                  {lineMap.get(inspectedMachine.line_id)?.name || 'Assembly Line'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Operational Health:</span>
                <StatusBadge status={inspectedMachine.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Rated Output Capacity:</span>
                <span className="font-semibold text-[#172033]">
                  {inspectedMachine.rated_output_per_hour} units/hour
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Link
                to={`/machines`}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-sm transition-all"
              >
                Deep Downtime Analytics
                <ArrowRight size={14} />
              </Link>
              <button
                onClick={() => {
                  setInspectedMachine(null)
                  setAddEventModalOpen(true)
                }}
                className="w-full py-2 px-4 rounded-lg bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#334155] text-xs font-semibold shadow-sm transition-all"
              >
                + Log Downtime Stoppage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Machine Modal */}
      <AddMachineModal
        isOpen={addMachineModalOpen}
        onClose={() => setAddMachineModalOpen(false)}
        onMachineCreated={() => handleSync()}
      />

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={addEventModalOpen}
        onClose={() => setAddEventModalOpen(false)}
        defaultPlantId={activePlantId}
        plants={plants}
        machines={machines}
        shifts={shifts}
        reasons={[]}
      />
    </div>
  )
}
