import { useState, useMemo } from 'react'
import {
  Plus,
  Download,
  RotateCcw,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import AddEventModal from './AddEventModal'
import EventDetailDrawer from './EventDetailDrawer'
import {
  useDowntimeEvents,
  usePlants,
  useMachines,
  useShifts,
  useReasons,
} from '@/hooks/useMasterData'

export default function DowntimeLogsPage() {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [filterPlantId, setFilterPlantId] = useState<string>('')
  const [filterMachineId, setFilterMachineId] = useState<string>('')
  const [filterShiftId, setFilterShiftId] = useState<string>('')
  const [filterReasonId, setFilterReasonId] = useState<string>('')
  const [filterFromDate, setFilterFromDate] = useState<string>('')
  const [filterToDate, setFilterToDate] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)

  const { data: plants = [] } = usePlants()
  const { data: machines = [] } = useMachines(filterPlantId)
  const { data: shifts = [] } = useShifts(filterPlantId)
  const { data: reasons = [] } = useReasons(filterPlantId)

  // Map IDs to human-readable objects
  const machineMap = useMemo(
    () => new Map(machines.map((m) => [m.id, m])),
    [machines]
  )
  const reasonMap = useMemo(
    () => new Map(reasons.map((r) => [r.id, r])),
    [reasons]
  )
  const shiftMap = useMemo(
    () => new Map(shifts.map((s) => [s.id, s])),
    [shifts]
  )

  const { data: eventsData, isLoading: eventsLoading } = useDowntimeEvents({
    plantId: filterPlantId,
    machineId: filterMachineId,
    shiftId: filterShiftId,
    reasonId: filterReasonId,
    fromDate: filterFromDate,
    toDate: filterToDate,
    page: currentPage,
    limit: 20,
  })

  const handleFilterReset = () => {
    setFilterPlantId('')
    setFilterMachineId('')
    setFilterShiftId('')
    setFilterReasonId('')
    setFilterFromDate('')
    setFilterToDate('')
    setCurrentPage(1)
  }

  const handlePlantChange = (plantId: string) => {
    setFilterPlantId(plantId)
    setFilterMachineId('')
    setCurrentPage(1)
  }

  // Export current table view as CSV
  const handleExportCSV = () => {
    if (!eventsData?.items?.length) return
    const headers = [
      'Machine Name',
      'Machine Code',
      'Start Time',
      'End Time',
      'Duration (min)',
      'Reason',
      'Shift',
      'Status',
      'Source',
      'Notes',
    ]

    const rows = eventsData.items.map((e) => {
      const m = machineMap.get(e.machine_id)
      const r = reasonMap.get(e.reason_id)
      const s = shiftMap.get(e.shift_id)
      return [
        `"${m?.name || e.machine_id}"`,
        `"${m?.code || ''}"`,
        `"${e.start_at}"`,
        `"${e.end_at}"`,
        e.duration_min,
        `"${r?.label || e.reason_id}"`,
        `"${s?.name || e.shift_id}"`,
        `"${e.status}"`,
        `"${e.source}"`,
        `"${e.notes || ''}"`,
      ]
    })

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `factorypulse_downtime_logs_${new Date().toISOString().split('T')[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = Math.round(mins % 60)
    if (h === 0) return `${m}m`
    return `${h}h ${m}m`
  }

  const totalPages = Math.ceil((eventsData?.total || 0) / 20) || 1

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-xl shadow-card">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033]">
            Downtime Incident Logs
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
            Full historical audit trail of machine stoppages, root causes, and shift assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={!eventsData?.items?.length}
            className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#334155] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="h-9 px-4 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={15} />
            Add Event
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            Filter Events
          </span>
          {(filterPlantId ||
            filterMachineId ||
            filterShiftId ||
            filterReasonId ||
            filterFromDate ||
            filterToDate) && (
            <button
              onClick={handleFilterReset}
              className="flex items-center gap-1 text-xs font-semibold text-[#0F766E] hover:underline cursor-pointer"
            >
              <RotateCcw size={12} />
              Reset All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Plant */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Plant</label>
            <select
              value={filterPlantId}
              onChange={(e) => handlePlantChange(e.target.value)}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E]"
            >
              <option value="">All Plants</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Machine */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Machine</label>
            <select
              value={filterMachineId}
              onChange={(e) => {
                setFilterMachineId(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E]"
            >
              <option value="">All Machines</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code})
                </option>
              ))}
            </select>
          </div>

          {/* Shift */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Shift</label>
            <select
              value={filterShiftId}
              onChange={(e) => {
                setFilterShiftId(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E]"
            >
              <option value="">All Shifts</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Reason</label>
            <select
              value={filterReasonId}
              onChange={(e) => {
                setFilterReasonId(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E]"
            >
              <option value="">All Reasons</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">From Date</label>
            <input
              type="date"
              value={filterFromDate}
              onChange={(e) => {
                setFilterFromDate(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E]"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">To Date</label>
            <input
              type="date"
              value={filterToDate}
              onChange={(e) => {
                setFilterToDate(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E]"
            />
          </div>
        </div>
      </GlassCard>

      {/* Table Section */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider font-semibold text-[#64748B] border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-4">Machine</th>
                <th className="py-3 px-4">Start Time</th>
                <th className="py-3 px-4">End Time</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {eventsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="p-3">
                      <LoadingSkeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : eventsData?.items?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#64748B]">
                    No downtime incidents recorded matching the filter criteria.
                  </td>
                </tr>
              ) : (
                eventsData?.items?.map((e) => {
                  const m = machineMap.get(e.machine_id)
                  const r = reasonMap.get(e.reason_id)
                  const s = shiftMap.get(e.shift_id)

                  return (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedEventId(e.id)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Cpu size={14} className="text-[#0F766E]" />
                          <div>
                            <span className="font-semibold text-[#172033]">
                              {m?.name || e.machine_id}
                            </span>
                            {m?.code && (
                              <span className="ml-1.5 text-[10px] font-mono px-1 py-0.2 bg-slate-100 rounded text-slate-600">
                                {m.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[#64748B]">
                        {new Date(e.start_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4 text-[#64748B]">
                        {new Date(e.end_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4 font-bold text-[#172033]">
                        {formatDuration(e.duration_min)}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-[#172033]">
                          {r?.label || 'General Downtime'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[#64748B]">
                        {s?.name || 'Shift Default'}
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status={e.status} />
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[11px] uppercase tracking-wider font-mono text-slate-500">
                          {e.source}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation()
                            setSelectedEventId(e.id)
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-[#0F766E] hover:bg-teal-50 transition-colors"
                          title="Inspect incident audit"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] text-xs text-[#64748B]">
          <span>
            Showing <strong>{eventsData?.items?.length || 0}</strong> of{' '}
            <strong>{eventsData?.total || 0}</strong> total incidents
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-semibold text-[#172033]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Event Detail Drawer */}
      <EventDetailDrawer
        eventId={selectedEventId}
        isOpen={!!selectedEventId}
        onClose={() => setSelectedEventId(null)}
      />

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        plants={plants}
        machines={machines}
        shifts={shifts}
        reasons={reasons}
      />
    </div>
  )
}
