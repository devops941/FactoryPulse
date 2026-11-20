import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import GlassCard from '@/components/ui/GlassCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { usePlants, useMachines, useShifts, useReasons, useLines, Plant, Line } from '@/hooks/useMasterData'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import api from '@/services/api'
import {
  AlertCircle,
  Building2,
  Cpu,
  Clock,
  Tag,
  Shield,
  User,
  Key,
  Layers,
  Plus,
  Check,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type TabType = 'plants' | 'lines' | 'machines' | 'shifts' | 'reasons' | 'security'

export default function SettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('plants')
  const [selectedPlantId, setSelectedPlantId] = useState<string>('')

  // Inline Plant Creation State
  const [isAddingPlant, setIsAddingPlant] = useState(false)
  const [newPlantName, setNewPlantName] = useState('')
  const [newPlantCode, setNewPlantCode] = useState('')
  const [newPlantTimezone, setNewPlantTimezone] = useState('Asia/Kolkata')
  const [plantError, setPlantError] = useState('')

  // Inline Line Creation State
  const [isAddingLine, setIsAddingLine] = useState(false)
  const [newLineName, setNewLineName] = useState('')
  const [newLineCode, setNewLineCode] = useState('')
  const [lineError, setLineError] = useState('')

  // Fetch master data
  const plantsQuery = usePlants()
  const linesQuery = useLines(selectedPlantId)
  const machinesQuery = useMachines(selectedPlantId)
  const shiftsQuery = useShifts(selectedPlantId)
  const reasonsQuery = useReasons(selectedPlantId)

  // Auto-select first plant
  if (plantsQuery.data && plantsQuery.data.length > 0 && !selectedPlantId) {
    setSelectedPlantId(plantsQuery.data[0].id)
  }

  // Mutation: Create Plant
  const createPlantMutation = useMutation({
    mutationFn: async () => {
      setPlantError('')
      if (!newPlantName.trim() || !newPlantCode.trim()) {
        throw new Error('Plant name and code are required')
      }
      const payload = {
        name: newPlantName.trim(),
        code: newPlantCode.trim().toUpperCase(),
        timezone: newPlantTimezone || 'Asia/Kolkata',
      }
      const response = await api.post<Plant>('/plants', payload)
      return response.data
    },
    onSuccess: (newPlant) => {
      queryClient.invalidateQueries({ queryKey: ['plants'] })
      setSelectedPlantId(newPlant.id)
      setNewPlantName('')
      setNewPlantCode('')
      setIsAddingPlant(false)
    },
    onError: (err: any) => {
      setPlantError(err?.response?.data?.detail || err.message || 'Failed to create plant')
    },
  })

  // Mutation: Create Line
  const createLineMutation = useMutation({
    mutationFn: async () => {
      setLineError('')
      if (!newLineName.trim() || !newLineCode.trim()) {
        throw new Error('Line name and code are required')
      }
      if (!selectedPlantId) {
        throw new Error('Please select a facility plant first')
      }
      const payload = {
        plant_id: selectedPlantId,
        name: newLineName.trim(),
        code: newLineCode.trim().toUpperCase(),
      }
      const response = await api.post<Line>('/lines', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lines', selectedPlantId] })
      setNewLineName('')
      setNewLineCode('')
      setIsAddingLine(false)
    },
    onError: (err: any) => {
      setLineError(err?.response?.data?.detail || err.message || 'Failed to create line')
    },
  })

  const renderPlantsTab = () => {
    if (plantsQuery.isLoading) return <LoadingSkeleton />
    if (plantsQuery.error) {
      return (
        <div className="flex items-center gap-2 text-rose-500 p-4">
          <AlertCircle size={20} />
          <span>Error loading plant facilities</span>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#64748B]">
            All registered industrial plant locations and manufacturing sites.
          </p>
          <button
            onClick={() => setIsAddingPlant(!isAddingPlant)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59] shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} />
            {isAddingPlant ? 'Cancel' : 'Add Facility Plant'}
          </button>
        </div>

        {/* Add Plant Panel */}
        {isAddingPlant && (
          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-3 animate-fadeIn">
            <h4 className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">
              Register New Manufacturing Plant
            </h4>
            {plantError && (
              <p className="text-xs text-rose-600 font-medium">{plantError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Plant Name (e.g. Plant Beta)"
                value={newPlantName}
                onChange={(e) => setNewPlantName(e.target.value)}
                className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs text-[#172033]"
              />
              <input
                type="text"
                placeholder="Site Code (e.g. PLANT_B)"
                value={newPlantCode}
                onChange={(e) => setNewPlantCode(e.target.value)}
                className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-mono uppercase text-[#172033]"
              />
              <input
                type="text"
                placeholder="Timezone (e.g. Asia/Kolkata)"
                value={newPlantTimezone}
                onChange={(e) => setNewPlantTimezone(e.target.value)}
                className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs text-[#172033]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingPlant(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createPlantMutation.mutate()}
                disabled={createPlantMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0F766E] text-xs font-semibold text-white hover:bg-[#115E59] disabled:opacity-50 cursor-pointer"
              >
                <Check size={14} />
                {createPlantMutation.isPending ? 'Saving...' : 'Save Plant'}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider font-semibold text-[#64748B] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Facility Name</th>
                <th className="px-4 py-3">Site Code</th>
                <th className="px-4 py-3">Operating Timezone</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plantsQuery.data?.map((plant) => (
                <tr key={plant.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#172033] flex items-center gap-2">
                    <Building2 size={15} className="text-[#0F766E]" />
                    {plant.name}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-slate-600">{plant.code}</td>
                  <td className="px-4 py-3 text-[#64748B]">{plant.timezone}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status="active" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderLinesTab = () => {
    if (linesQuery.isLoading) return <LoadingSkeleton />
    if (linesQuery.error) {
      return (
        <div className="flex items-center gap-2 text-rose-500 p-4">
          <AlertCircle size={20} />
          <span>Error loading production lines</span>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#64748B]">
            Production lines configured under the selected facility.
          </p>
          <button
            onClick={() => setIsAddingLine(!isAddingLine)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59] shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} />
            {isAddingLine ? 'Cancel' : 'Add Production Line'}
          </button>
        </div>

        {/* Add Line Panel */}
        {isAddingLine && (
          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-3 animate-fadeIn">
            <h4 className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">
              Register New Production Line
            </h4>
            {lineError && (
              <p className="text-xs text-rose-600 font-medium">{lineError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Line Name (e.g. Line B - Assembly)"
                value={newLineName}
                onChange={(e) => setNewLineName(e.target.value)}
                className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs text-[#172033]"
              />
              <input
                type="text"
                placeholder="Line Code (e.g. LINE_B)"
                value={newLineCode}
                onChange={(e) => setNewLineCode(e.target.value)}
                className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-mono uppercase text-[#172033]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingLine(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createLineMutation.mutate()}
                disabled={createLineMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0F766E] text-xs font-semibold text-white hover:bg-[#115E59] disabled:opacity-50 cursor-pointer"
              >
                <Check size={14} />
                {createLineMutation.isPending ? 'Saving...' : 'Save Line'}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider font-semibold text-[#64748B] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Line Name</th>
                <th className="px-4 py-3">Line Code</th>
                <th className="px-4 py-3">Facility Site</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linesQuery.data?.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#172033] flex items-center gap-2">
                    <Layers size={15} className="text-[#0F766E]" />
                    {line.name}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-slate-600">{line.code}</td>
                  <td className="px-4 py-3 text-[#64748B]">
                    {plantsQuery.data?.find((p) => p.id === line.plant_id)?.name || line.plant_id}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status="active" />
                  </td>
                </tr>
              ))}
              {(!linesQuery.data || linesQuery.data.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No production lines found for this facility. Click "+ Add Production Line" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderMachinesTab = () => {
    if (machinesQuery.isLoading) return <LoadingSkeleton />
    if (machinesQuery.error) {
      return (
        <div className="flex items-center gap-2 text-rose-500 p-4">
          <AlertCircle size={20} />
          <span>Error loading machines</span>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider font-semibold text-[#64748B] border-b border-[#E2E8F0]">
            <tr>
              <th className="px-4 py-3">Equipment Name</th>
              <th className="px-4 py-3">Machine Code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rated Output</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {machinesQuery.data?.map((machine) => (
              <tr key={machine.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-[#172033] flex items-center gap-2">
                  <Cpu size={15} className="text-[#0F766E]" />
                  {machine.name}
                </td>
                <td className="px-4 py-3 font-mono font-medium text-slate-600">{machine.code}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={machine.status} />
                </td>
                <td className="px-4 py-3 font-bold text-[#172033]">
                  {machine.rated_output_per_hour} <span className="font-normal text-[#64748B]">u/h</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderShiftsTab = () => {
    if (shiftsQuery.isLoading) return <LoadingSkeleton />
    if (shiftsQuery.error) {
      return (
        <div className="flex items-center gap-2 text-rose-500 p-4">
          <AlertCircle size={20} />
          <span>Error loading shifts</span>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider font-semibold text-[#64748B] border-b border-[#E2E8F0]">
            <tr>
              <th className="px-4 py-3">Shift Name</th>
              <th className="px-4 py-3">Local Start Time</th>
              <th className="px-4 py-3">Local End Time</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shiftsQuery.data?.map((shift) => (
              <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-[#172033] flex items-center gap-2">
                  <Clock size={15} className="text-[#0F766E]" />
                  {shift.name}
                </td>
                <td className="px-4 py-3 font-mono text-[#172033]">{shift.start_local}</td>
                <td className="px-4 py-3 font-mono text-[#172033]">{shift.end_local}</td>
                <td className="px-4 py-3">
                  <StatusBadge status="active" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderReasonsTab = () => {
    if (reasonsQuery.isLoading) return <LoadingSkeleton />
    if (reasonsQuery.error) {
      return (
        <div className="flex items-center gap-2 text-rose-500 p-4">
          <AlertCircle size={20} />
          <span>Error loading reasons</span>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider font-semibold text-[#64748B] border-b border-[#E2E8F0]">
            <tr>
              <th className="px-4 py-3">Root Cause Label</th>
              <th className="px-4 py-3">Tag Code</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Planned / Unplanned</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reasonsQuery.data?.map((reason) => (
              <tr key={reason.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-[#172033] flex items-center gap-2">
                  <Tag size={14} className="text-[#0F766E]" />
                  {reason.label}
                </td>
                <td className="px-4 py-3 font-mono text-slate-600">{reason.code}</td>
                <td className="px-4 py-3 text-[#64748B] capitalize">{reason.category}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      reason.is_planned
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {reason.is_planned ? 'Planned' : 'Unplanned'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status="active" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
          <User size={16} className="text-[#0F766E]" />
          User Profile
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-[#64748B] block mb-1">Full Name</label>
            <input
              type="text"
              readOnly
              value={user?.name || 'Administrator'}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-slate-50 px-3 text-[#172033]"
            />
          </div>
          <div>
            <label className="text-[#64748B] block mb-1">Email Address</label>
            <input
              type="email"
              readOnly
              value={user?.email || 'admin@factorypulse.com'}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-slate-50 px-3 text-[#172033]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
          <Key size={16} className="text-[#0F766E]" />
          API & Security Session
        </h4>
        <p className="text-xs text-[#64748B]">
          Connected to MongoDB Atlas cluster with JWT Bearer Token authentication.
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700">Token Active (24h validity)</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-xl shadow-card">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033]">
              Facility & Master Configuration
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
              System Admin
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
            Configure manufacturing plants, production lines, machine registries, work shifts, and downtime taxonomies
          </p>
        </div>

        {/* Facility Selector */}
        {activeTab !== 'plants' && activeTab !== 'security' && (
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-semibold text-[#64748B]">Filter Site:</label>
            <select
              value={selectedPlantId}
              onChange={(e) => setSelectedPlantId(e.target.value)}
              className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E]"
            >
              {plantsQuery.data?.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] overflow-x-auto">
        <button
          onClick={() => setActiveTab('plants')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'plants'
              ? 'border-[#0F766E] text-[#0F766E]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Building2 size={15} />
          Facilities ({plantsQuery.data?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('lines')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'lines'
              ? 'border-[#0F766E] text-[#0F766E]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Layers size={15} />
          Production Lines ({linesQuery.data?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('machines')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'machines'
              ? 'border-[#0F766E] text-[#0F766E]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Cpu size={15} />
          Machines ({machinesQuery.data?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('shifts')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'shifts'
              ? 'border-[#0F766E] text-[#0F766E]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Clock size={15} />
          Shifts ({shiftsQuery.data?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('reasons')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'reasons'
              ? 'border-[#0F766E] text-[#0F766E]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Tag size={15} />
          Root Cause Codes ({reasonsQuery.data?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'border-[#0F766E] text-[#0F766E]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Shield size={15} />
          User & System Security
        </button>
      </div>

      {/* Tab Content */}
      <GlassCard className="p-5">
        {activeTab === 'plants' && renderPlantsTab()}
        {activeTab === 'lines' && renderLinesTab()}
        {activeTab === 'machines' && renderMachinesTab()}
        {activeTab === 'shifts' && renderShiftsTab()}
        {activeTab === 'reasons' && renderReasonsTab()}
        {activeTab === 'security' && renderSecurityTab()}
      </GlassCard>
    </div>
  )
}
