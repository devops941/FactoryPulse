import { useState } from 'react'
import { RotateCcw, Check, Calendar, Building2, Cpu, Clock } from 'lucide-react'
import { format, subDays, startOfMonth } from 'date-fns'
import { Machine, Plant, Shift } from '@/hooks/useMasterData'

export interface DashboardFilters {
  plant_id?: string
  from_date?: string
  to_date?: string
  machine_id?: string
  shift_id?: string
}

interface FilterBarProps {
  filters: DashboardFilters
  onFilterChange: (filters: DashboardFilters) => void
  plants: Plant[]
  machines: Machine[]
  shifts: Shift[]
  isLoading?: boolean
}

export default function FilterBar({
  filters,
  onFilterChange,
  plants,
  machines,
  shifts,
  isLoading = false,
}: FilterBarProps) {
  const [localFilters, setLocalFilters] = useState<DashboardFilters>(filters)

  const handleChange = (field: keyof DashboardFilters, value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [field]: value || undefined,
    }))
  }

  const handleApply = () => {
    onFilterChange(localFilters)
  }

  const handleReset = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const resetFilters: DashboardFilters = {
      plant_id: plants[0]?.id,
      from_date: thirtyDaysAgo,
      to_date: today,
      machine_id: undefined,
      shift_id: undefined,
    }
    setLocalFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  const handleQuickPreset = (days: number) => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const from = format(days === -1 ? startOfMonth(new Date()) : subDays(new Date(), days), 'yyyy-MM-dd')
    const updated = {
      ...localFilters,
      from_date: from,
      to_date: today,
    }
    setLocalFilters(updated)
    onFilterChange(updated)
  }

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 sm:p-5 shadow-card transition-all">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 flex-1">
          {/* Plant Selector */}
          <div>
            <label
              htmlFor="plant"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] mb-1.5"
            >
              <Building2 size={13} className="text-[#0F766E]" />
              Plant Facility
            </label>
            <select
              id="plant"
              value={localFilters.plant_id || ''}
              onChange={(e) => handleChange('plant_id', e.target.value)}
              disabled={isLoading}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
            >
              <option value="">All Facilities</option>
              {plants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.name}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label
              htmlFor="fromDate"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] mb-1.5"
            >
              <Calendar size={13} className="text-[#0F766E]" />
              From Date
            </label>
            <input
              type="date"
              id="fromDate"
              value={localFilters.from_date || ''}
              onChange={(e) => handleChange('from_date', e.target.value)}
              disabled={isLoading}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
            />
          </div>

          {/* To Date */}
          <div>
            <label
              htmlFor="toDate"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] mb-1.5"
            >
              <Calendar size={13} className="text-[#0F766E]" />
              To Date
            </label>
            <input
              type="date"
              id="toDate"
              value={localFilters.to_date || ''}
              onChange={(e) => handleChange('to_date', e.target.value)}
              disabled={isLoading}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
            />
          </div>

          {/* Machine Selector */}
          <div>
            <label
              htmlFor="machine"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] mb-1.5"
            >
              <Cpu size={13} className="text-[#0F766E]" />
              Machine
            </label>
            <select
              id="machine"
              value={localFilters.machine_id || ''}
              onChange={(e) => handleChange('machine_id', e.target.value)}
              disabled={isLoading}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
            >
              <option value="">All Machines</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name} ({machine.code})
                </option>
              ))}
            </select>
          </div>

          {/* Shift Selector */}
          <div>
            <label
              htmlFor="shift"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] mb-1.5"
            >
              <Clock size={13} className="text-[#0F766E]" />
              Work Shift
            </label>
            <select
              id="shift"
              value={localFilters.shift_id || ''}
              onChange={(e) => handleChange('shift_id', e.target.value)}
              disabled={isLoading}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
            >
              <option value="">All Shifts</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} ({shift.start_local} - {shift.end_local})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Action Buttons */}
        <div className="flex items-center gap-2 pt-2 lg:pt-0 self-end">
          <button
            onClick={handleApply}
            disabled={isLoading}
            className="h-9 px-4 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Check size={14} />
            Apply Filters
          </button>

          <button
            onClick={handleReset}
            disabled={isLoading}
            className="h-9 px-3 rounded-lg bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#64748B] hover:text-[#172033] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset to default 30-day range"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      </div>

      {/* Quick Date Presets Row */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[#64748B] font-medium text-[11px]">Quick Ranges:</span>
          <button
            onClick={() => handleQuickPreset(7)}
            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-[#0F766E] text-slate-600 transition-colors"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => handleQuickPreset(30)}
            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-[#0F766E] text-slate-600 transition-colors"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => handleQuickPreset(-1)}
            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-[#0F766E] text-slate-600 transition-colors"
          >
            This Month
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
          <span>
            Active: <strong>{localFilters.from_date || 'Past'}</strong> to{' '}
            <strong>{localFilters.to_date || 'Today'}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
