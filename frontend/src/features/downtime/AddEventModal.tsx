import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { usePlants, useMachines, useShifts, useReasons, Plant, Machine, Shift, Reason } from '@/hooks/useMasterData'
import { X, AlertCircle } from 'lucide-react'

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  defaultPlantId?: string
  plants?: Plant[]
  machines?: Machine[]
  shifts?: Shift[]
  reasons?: Reason[]
}

interface DowntimeEventFormData {
  plant_id: string
  machine_id: string
  start_at: string
  start_time: string
  end_at: string
  end_time: string
  shift_id: string
  reason_id: string
  notes?: string
}

export default function AddEventModal({
  isOpen,
  onClose,
  defaultPlantId,
  plants: propPlants,
  machines: propMachines,
  shifts: propShifts,
  reasons: propReasons,
}: AddEventModalProps) {
  const queryClient = useQueryClient()
  const [selectedPlant, setSelectedPlant] = useState<string>(defaultPlantId || '')
  const [error, setError] = useState<string>('')

  const { data: fetchedPlants = [] } = usePlants()
  const plants = propPlants && propPlants.length > 0 ? propPlants : fetchedPlants

  const activePlant = selectedPlant || defaultPlantId || plants[0]?.id || ''

  const { data: fetchedMachines = [] } = useMachines(activePlant)
  const machines = propMachines && propMachines.length > 0 ? propMachines : fetchedMachines

  const { data: fetchedShifts = [] } = useShifts(activePlant)
  const shifts = propShifts && propShifts.length > 0 ? propShifts : fetchedShifts

  const { data: fetchedReasons = [] } = useReasons(activePlant)
  const reasons = propReasons && propReasons.length > 0 ? propReasons : fetchedReasons

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<DowntimeEventFormData>({
    defaultValues: {
      plant_id: activePlant,
      start_at: new Date().toISOString().split('T')[0],
      start_time: '08:00',
      end_at: new Date().toISOString().split('T')[0],
      end_time: '09:00',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: DowntimeEventFormData) => {
      const startDateTime = new Date(`${data.start_at}T${data.start_time}:00`).toISOString()
      const endDateTime = new Date(`${data.end_at}T${data.end_time}:00`).toISOString()

      const payload = {
        plant_id: data.plant_id || activePlant,
        machine_id: data.machine_id,
        shift_id: data.shift_id,
        reason_id: data.reason_id,
        start_at: startDateTime,
        end_at: endDateTime,
        notes: data.notes || '',
        source: 'manual',
      }

      const response = await api.post('/downtime-events', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downtimeEvents'] })
      queryClient.invalidateQueries({ queryKey: ['overviewAnalytics'] })
      reset()
      setError('')
      onClose()
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || 'Failed to record downtime incident.')
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div>
            <h3 className="font-bold text-base text-[#172033]">Log Downtime Incident</h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Record an unplanned stoppage or planned maintenance window
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-[#DC2626] flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="mt-4 space-y-4 text-xs">
          {/* Plant & Machine */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">Plant Facility</label>
              <select
                {...register('plant_id')}
                onChange={(e) => setSelectedPlant(e.target.value)}
                defaultValue={activePlant}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#64748B] mb-1">
                Machine Equipment <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('machine_id', { required: 'Machine selection required' })}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              >
                <option value="">Select machine...</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">Start Date</label>
              <input
                type="date"
                {...register('start_at', { required: true })}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">Start Time</label>
              <input
                type="time"
                {...register('start_time', { required: true })}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              />
            </div>
          </div>

          {/* End Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">End Date</label>
              <input
                type="date"
                {...register('end_at', { required: true })}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">End Time</label>
              <input
                type="time"
                {...register('end_time', { required: true })}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              />
            </div>
          </div>

          {/* Shift and Reason */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">
                Shift <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('shift_id', { required: 'Shift is required' })}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              >
                <option value="">Select shift...</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#64748B] mb-1">
                Reason Tag <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('reason_id', { required: 'Reason is required' })}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              >
                <option value="">Select reason...</option>
                {reasons.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-[#64748B] mb-1">
              Operator Observations / Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="E.g., Spindle bearing overheating, replaced sensor harness."
              className="w-full rounded-lg border border-[#E2E8F0] bg-white p-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold disabled:opacity-50"
            >
              {createMutation.isPending ? 'Logging Incident...' : 'Save Downtime Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
