import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Wrench, AlertCircle } from 'lucide-react'
import api from '@/services/api'
import { Machine } from '@/hooks/useMasterData'

interface CreateWorkOrderModalProps {
  isOpen: boolean
  onClose: () => void
  machines: Machine[]
  defaultMachine?: Machine | null
  plantId: string
}

interface WorkOrderFormData {
  machine_id: string
  title: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  assigned_technician: string
  scheduled_date: string
  estimated_duration_hours: number
  notes: string
}

export default function CreateWorkOrderModal({
  isOpen,
  onClose,
  machines,
  defaultMachine,
  plantId,
}: CreateWorkOrderModalProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string>('')

  const { register, handleSubmit, reset } = useForm<WorkOrderFormData>({
    defaultValues: {
      machine_id: defaultMachine?.id || '',
      title: defaultMachine ? `Preventive Overhaul - ${defaultMachine.name}` : '',
      priority: 'medium',
      assigned_technician: 'Lead Mechanical Technician',
      scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      estimated_duration_hours: 2.0,
      notes: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: WorkOrderFormData) => {
      const selectedM = machines.find((m) => m.id === data.machine_id) || defaultMachine
      const payload = {
        plant_id: plantId,
        machine_id: data.machine_id || selectedM?.id || '',
        machine_code: selectedM?.code || 'MACH_01',
        machine_name: selectedM?.name || 'Machine Asset',
        title: data.title,
        priority: data.priority,
        assigned_technician: data.assigned_technician,
        scheduled_date: data.scheduled_date,
        estimated_duration_hours: Number(data.estimated_duration_hours),
        notes: data.notes,
      }
      const response = await api.post('/reliability/work-orders', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] })
      queryClient.invalidateQueries({ queryKey: ['reliabilityMetrics'] })
      reset()
      setError('')
      onClose()
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || 'Failed to dispatch work order.')
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-100">
              <Wrench size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#172033]">Dispatch Preventive Work Order</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Schedule technician service before equipment failure occurs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
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
          <div>
            <label className="block font-semibold text-[#64748B] mb-1">
              Target Machine Asset <span className="text-rose-500">*</span>
            </label>
            <select
              {...register('machine_id', { required: true })}
              defaultValue={defaultMachine?.id || ''}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
            >
              <option value="">Select equipment...</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#64748B] mb-1">
              Work Order Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Spindle Bearing Replacement & Calibration"
              {...register('title', { required: true })}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">Priority Level</label>
              <select
                {...register('priority')}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              >
                <option value="low">Low (General Upkeep)</option>
                <option value="medium">Medium (Scheduled)</option>
                <option value="high">High (Warning Detected)</option>
                <option value="critical">Critical (Immediate Action)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#64748B] mb-1">
                Estimated Duration (Hrs)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                {...register('estimated_duration_hours')}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">Scheduled Date</label>
              <input
                type="date"
                {...register('scheduled_date', { required: true })}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#64748B] mb-1">Assigned Specialist</label>
              <input
                type="text"
                placeholder="Technician Name"
                {...register('assigned_technician')}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#64748B] mb-1">
              Maintenance Instructions / Checklist
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Detail required component replacements, lubricant specs, or torque tests..."
              className="w-full rounded-lg border border-[#E2E8F0] bg-white p-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
            />
          </div>

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
              {createMutation.isPending ? 'Scheduling...' : 'Dispatch Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
