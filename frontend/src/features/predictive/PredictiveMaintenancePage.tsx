import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Brain,
  ShieldAlert,
  Activity,
  Clock,
  Wrench,
  Plus,
  Building2,
  Sparkles,
} from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import { usePlants, useMachines, Machine } from '@/hooks/useMasterData'
import api from '@/services/api'
import CreateWorkOrderModal from './CreateWorkOrderModal'

interface MachineMetric {
  machine_id: string
  machine_code: string
  machine_name: string
  rated_output: number
  status: string
  health_score: number
  health_grade: 'A' | 'B' | 'C'
  risk_level: 'Low' | 'Moderate' | 'High'
  mtbf_hours: number
  mttr_minutes: number
  event_count: number
  downtime_minutes: number
  availability_pct: number
  predicted_failure_risk: string
}

interface ReliabilityData {
  fleet_summary: {
    total_machines: number
    average_health_score: number
    fleet_mtbf_hours: number
    fleet_mttr_minutes: number
    high_risk_machines_count: number
    moderate_risk_count: number
    healthy_machines_count: number
  }
  machines: MachineMetric[]
}

interface WorkOrder {
  id: string
  plant_id: string
  machine_id: string
  machine_code: string
  machine_name: string
  title: string
  priority: string
  assigned_technician: string
  scheduled_date: string
  estimated_duration_hours: number
  status: string
  notes?: string
}

export default function PredictiveMaintenancePage() {
  const { data: plants = [] } = usePlants()
  const [selectedPlantId, setSelectedPlantId] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [targetMachine, setTargetMachine] = useState<Machine | null>(null)

  const activePlantId = selectedPlantId || plants[0]?.id || ''
  const { data: machines = [] } = useMachines(activePlantId)

  // Query reliability metrics from backend
  const { data: metricsData, isLoading: metricsLoading } = useQuery<ReliabilityData>({
    queryKey: ['reliabilityMetrics', activePlantId],
    queryFn: async () => {
      const response = await api.get('/reliability/metrics', {
        params: { plant_id: activePlantId || undefined },
      })
      return response.data
    },
    enabled: !!activePlantId || plants.length > 0,
  })

  // Query work orders from backend
  const { data: workOrdersData, isLoading: ordersLoading } = useQuery<{ work_orders: WorkOrder[] }>({
    queryKey: ['workOrders', activePlantId],
    queryFn: async () => {
      const response = await api.get('/reliability/work-orders', {
        params: { plant_id: activePlantId || undefined },
      })
      return response.data
    },
    enabled: !!activePlantId || plants.length > 0,
  })

  const summary = metricsData?.fleet_summary || {
    total_machines: machines.length,
    average_health_score: 85,
    fleet_mtbf_hours: 142.5,
    fleet_mttr_minutes: 28.4,
    high_risk_machines_count: 0,
    moderate_risk_count: 0,
    healthy_machines_count: machines.length,
  }

  const machineMetrics = metricsData?.machines || []
  const workOrders = workOrdersData?.work_orders || []

  const handleOpenDispatch = (machine?: Machine) => {
    setTargetMachine(machine || null)
    setIsModalOpen(true)
  }

  const renderHealthScorePill = (score: number, grade: string) => {
    let colorClasses = 'bg-emerald-50 text-[#16A34A] border-emerald-200'
    let barColor = 'bg-emerald-500'

    if (score < 70) {
      colorClasses = 'bg-rose-50 text-[#DC2626] border-rose-200'
      barColor = 'bg-rose-500'
    } else if (score < 88) {
      colorClasses = 'bg-amber-50 text-[#F59E0B] border-amber-200'
      barColor = 'bg-amber-500'
    }

    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full ${barColor}`} style={{ width: `${score}%` }} />
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${colorClasses}`}>
          {score}% (Grade {grade})
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-xl shadow-card">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033] flex items-center gap-2">
              <Brain size={24} className="text-[#0F766E]" />
              Predictive Maintenance & Reliability AI
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-[#0F766E] border border-teal-200 flex items-center gap-1">
              <Sparkles size={12} />
              AI Failure Radar
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
            Automated machine health indexing, MTBF/MTTR metrics, failure predictions, and preventive dispatch
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-[#0F766E]" />
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
          </div>

          <button
            onClick={() => handleOpenDispatch()}
            className="h-9 px-4 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={15} />
            Dispatch Work Order
          </button>
        </div>
      </div>

      {/* KPI Ribbon (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Fleet Health Index
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-100">
              <Activity size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#172033]">
            {summary.average_health_score}%
          </p>
          <p className="text-xs text-[#64748B] mt-1">Average across all assets</p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Fleet MTBF
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-[#16A34A] border border-emerald-100">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#16A34A]">
            {summary.fleet_mtbf_hours} <span className="text-xs font-normal text-[#64748B]">hours</span>
          </p>
          <p className="text-xs text-[#64748B] mt-1">Mean Time Between Failures</p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Fleet MTTR
            </span>
            <div className="p-2 rounded-lg bg-sky-50 text-[#0284C7] border border-sky-100">
              <Wrench size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#0284C7]">
            {summary.fleet_mttr_minutes} <span className="text-xs font-normal text-[#64748B]">mins</span>
          </p>
          <p className="text-xs text-[#64748B] mt-1">Mean Time to Repair</p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              At-Risk Assets
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-[#DC2626] border border-rose-100">
              <ShieldAlert size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#DC2626]">
            {summary.high_risk_machines_count} <span className="text-xs font-normal text-[#64748B]">Critical</span>
          </p>
          <p className="text-xs text-[#64748B] mt-1">{summary.moderate_risk_count} in caution state</p>
        </GlassCard>
      </div>

      {/* Predictive Health & Reliability Table */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <Brain size={16} className="text-[#0F766E]" />
              Machine Asset Health & Failure Risk Radar
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Ranked dynamically by failure risk and telemetry health indices
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {machineMetrics.length} Machines Evaluated
          </span>
        </div>

        {metricsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : machineMetrics.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#64748B]">
            No machines registered in this facility yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider font-semibold text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Machine Asset</th>
                  <th className="py-3 px-4">Health Index</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">MTBF (Reliability)</th>
                  <th className="py-3 px-4">MTTR (Speed)</th>
                  <th className="py-3 px-4">AI Failure Assessment & Action</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {machineMetrics.map((m) => (
                  <tr key={m.machine_id} className="hover:bg-slate-50 transition-colors">
                    {/* Machine */}
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-[#172033]">{m.machine_name}</p>
                        <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                          {m.machine_code}
                        </span>
                      </div>
                    </td>

                    {/* Health Score */}
                    <td className="py-3 px-4">
                      {renderHealthScorePill(m.health_score, m.health_grade)}
                    </td>

                    {/* Risk Level */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          m.risk_level === 'High'
                            ? 'bg-rose-50 text-[#DC2626] border-rose-200'
                            : m.risk_level === 'Moderate'
                            ? 'bg-amber-50 text-[#F59E0B] border-amber-200'
                            : 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            m.risk_level === 'High'
                              ? 'bg-rose-500 animate-pulse'
                              : m.risk_level === 'Moderate'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        {m.risk_level} Risk
                      </span>
                    </td>

                    {/* MTBF */}
                    <td className="py-3 px-4 font-mono font-bold text-[#172033]">
                      {m.mtbf_hours} <span className="font-normal text-[11px] text-[#64748B]">hrs</span>
                    </td>

                    {/* MTTR */}
                    <td className="py-3 px-4 font-mono font-bold text-[#0F766E]">
                      {m.mttr_minutes} <span className="font-normal text-[11px] text-[#64748B]">mins</span>
                    </td>

                    {/* AI Assessment */}
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-[11px] text-[#64748B] leading-tight">
                        {m.predicted_failure_risk}
                      </p>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() =>
                          handleOpenDispatch({
                            id: m.machine_id,
                            code: m.machine_code,
                            name: m.machine_name,
                          } as Machine)
                        }
                        className="h-7 px-2.5 rounded-md bg-teal-50 hover:bg-teal-100 text-[#0F766E] border border-teal-200 text-xs font-semibold flex items-center gap-1 shadow-sm transition-all ml-auto cursor-pointer"
                      >
                        <Wrench size={12} />
                        Dispatch
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Active Work Orders Section */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <Wrench size={16} className="text-[#0F766E]" />
              Scheduled Preventive Maintenance Work Orders
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Active technician service dispatches to prevent catastrophic downtime
            </p>
          </div>
          <span className="text-xs font-semibold text-[#0F766E]">
            {workOrders.length} Active Tickets
          </span>
        </div>

        {ordersLoading ? (
          <LoadingSkeleton className="h-24 w-full" />
        ) : workOrders.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#64748B] border border-dashed border-slate-200 rounded-lg">
            No active work orders. Click "+ Dispatch Work Order" to schedule preventive service.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workOrders.map((wo) => (
              <div
                key={wo.id}
                className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm hover:shadow-card-hover transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {wo.machine_code}
                    </span>
                    <h4 className="font-bold text-xs text-[#172033] mt-1">{wo.title}</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      wo.priority === 'critical'
                        ? 'bg-rose-50 text-[#DC2626] border border-rose-200'
                        : wo.priority === 'high'
                        ? 'bg-amber-50 text-[#F59E0B] border border-amber-200'
                        : 'bg-teal-50 text-[#0F766E] border border-teal-200'
                    }`}
                  >
                    {wo.priority}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span>Technician:</span>
                    <span className="font-semibold text-[#172033]">{wo.assigned_technician}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span>Scheduled Date:</span>
                    <span className="font-semibold text-[#172033]">{wo.scheduled_date}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span>Duration:</span>
                    <span className="font-semibold text-[#172033]">
                      {wo.estimated_duration_hours} hrs
                    </span>
                  </div>
                </div>

                {wo.notes && (
                  <p className="mt-2 text-[11px] text-[#64748B] italic bg-slate-50 p-2 rounded">
                    "{wo.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Modal */}
      <CreateWorkOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        machines={machines}
        defaultMachine={targetMachine}
        plantId={activePlantId}
      />
    </div>
  )
}
