import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, AlertCircle, Cpu, Plus, Building2, Layers, Check } from 'lucide-react'
import api from '@/services/api'
import { usePlants, useLines, Machine, Plant, Line } from '@/hooks/useMasterData'

interface AddMachineModalProps {
  isOpen: boolean
  onClose: () => void
  onMachineCreated?: (machineId: string) => void
}

interface MachineFormData {
  plant_id: string
  line_id: string
  code: string
  name: string
  rated_output_per_hour: number
  status: 'active' | 'inactive' | 'maintenance'
}

export default function AddMachineModal({
  isOpen,
  onClose,
  onMachineCreated,
}: AddMachineModalProps) {
  const queryClient = useQueryClient()
  const [selectedPlant, setSelectedPlant] = useState<string>('')
  const [error, setError] = useState<string>('')

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

  const { data: plants = [] } = usePlants()
  const { data: lines = [] } = useLines(selectedPlant)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<MachineFormData>({
    defaultValues: {
      plant_id: '',
      line_id: '',
      code: '',
      name: '',
      rated_output_per_hour: 100,
      status: 'active',
    },
  })

  const watchedPlantId = watch('plant_id')

  useEffect(() => {
    if (plants.length > 0 && !selectedPlant) {
      setSelectedPlant(plants[0].id)
      setValue('plant_id', plants[0].id)
    }
  }, [plants, selectedPlant, setValue])

  useEffect(() => {
    if (watchedPlantId && watchedPlantId !== selectedPlant) {
      setSelectedPlant(watchedPlantId)
    }
  }, [watchedPlantId, selectedPlant])

  useEffect(() => {
    if (lines.length > 0) {
      setValue('line_id', lines[0].id)
    }
  }, [lines, setValue])

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
      setSelectedPlant(newPlant.id)
      setValue('plant_id', newPlant.id)
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
      if (!selectedPlant) {
        throw new Error('Please select a facility plant first')
      }
      const payload = {
        plant_id: selectedPlant,
        name: newLineName.trim(),
        code: newLineCode.trim().toUpperCase(),
      }
      const response = await api.post<Line>('/lines', payload)
      return response.data
    },
    onSuccess: (newLine) => {
      queryClient.invalidateQueries({ queryKey: ['lines', selectedPlant] })
      setValue('line_id', newLine.id)
      setNewLineName('')
      setNewLineCode('')
      setIsAddingLine(false)
    },
    onError: (err: any) => {
      setLineError(err?.response?.data?.detail || err.message || 'Failed to create line')
    },
  })

  // Mutation: Create Machine
  const createMutation = useMutation({
    mutationFn: async (data: MachineFormData) => {
      const payload = {
        plant_id: data.plant_id || selectedPlant,
        line_id: data.line_id,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        rated_output_per_hour: Number(data.rated_output_per_hour),
        status: data.status,
      }
      const response = await api.post<Machine>('/machines', payload)
      return response.data
    },
    onSuccess: (newMachine) => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['overviewAnalytics'] })
      reset()
      setError('')
      onClose()
      if (onMachineCreated && newMachine?.id) {
        onMachineCreated(newMachine.id)
      }
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || 'Failed to create new machine.')
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-100">
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#172033]">Register New Machine</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Add factory equipment, or create new plants and production lines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
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
          {/* Facility Plant Section with "+ New Plant" Trigger */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-[#64748B] flex items-center gap-1.5">
                <Building2 size={13} className="text-[#0F766E]" />
                Facility Plant <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingPlant(!isAddingPlant)}
                className="text-[11px] font-semibold text-[#0F766E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                {isAddingPlant ? 'Cancel' : '+ New Plant'}
              </button>
            </div>

            {/* Inline Add Plant Panel */}
            {isAddingPlant ? (
              <div className="p-3 mb-2 rounded-xl bg-teal-50/60 border border-teal-200 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0F766E] uppercase tracking-wider">
                    Create New Facility Plant
                  </span>
                </div>
                {plantError && (
                  <p className="text-[11px] text-rose-600 font-medium">{plantError}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Plant Name (e.g. Plant Beta)"
                    value={newPlantName}
                    onChange={(e) => setNewPlantName(e.target.value)}
                    className="h-8 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033]"
                  />
                  <input
                    type="text"
                    placeholder="Plant Code (e.g. PLANT_B)"
                    value={newPlantCode}
                    onChange={(e) => setNewPlantCode(e.target.value)}
                    className="h-8 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs font-mono uppercase text-[#172033]"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <input
                    type="text"
                    placeholder="Timezone (e.g. Asia/Kolkata)"
                    value={newPlantTimezone}
                    onChange={(e) => setNewPlantTimezone(e.target.value)}
                    className="h-8 w-44 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033]"
                  />
                  <button
                    type="button"
                    onClick={() => createPlantMutation.mutate()}
                    disabled={createPlantMutation.isPending}
                    className="h-8 px-3 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Check size={13} />
                    {createPlantMutation.isPending ? 'Saving...' : 'Save & Select Plant'}
                  </button>
                </div>
              </div>
            ) : (
              <select
                {...register('plant_id', { required: 'Plant is required' })}
                value={selectedPlant}
                onChange={(e) => setSelectedPlant(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Production Line Section with "+ New Line" Trigger */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-[#64748B] flex items-center gap-1.5">
                <Layers size={13} className="text-[#0F766E]" />
                Production Line <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingLine(!isAddingLine)}
                className="text-[11px] font-semibold text-[#0F766E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                {isAddingLine ? 'Cancel' : '+ New Line'}
              </button>
            </div>

            {/* Inline Add Line Panel */}
            {isAddingLine ? (
              <div className="p-3 mb-2 rounded-xl bg-teal-50/60 border border-teal-200 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0F766E] uppercase tracking-wider">
                    Create New Production Line
                  </span>
                </div>
                {lineError && (
                  <p className="text-[11px] text-rose-600 font-medium">{lineError}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Line Name (e.g. Line B - CNC Unit)"
                    value={newLineName}
                    onChange={(e) => setNewLineName(e.target.value)}
                    className="h-8 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033]"
                  />
                  <input
                    type="text"
                    placeholder="Line Code (e.g. LINE_B)"
                    value={newLineCode}
                    onChange={(e) => setNewLineCode(e.target.value)}
                    className="h-8 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs font-mono uppercase text-[#172033]"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => createLineMutation.mutate()}
                    disabled={createLineMutation.isPending}
                    className="h-8 px-3 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Check size={13} />
                    {createLineMutation.isPending ? 'Saving...' : 'Save & Select Line'}
                  </button>
                </div>
              </div>
            ) : (
              <select
                {...register('line_id', { required: 'Line is required' })}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              >
                {lines.length === 0 ? (
                  <option value="">No lines found - Click "+ New Line" above</option>
                ) : (
                  lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code})
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Machine Code & Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">
                Machine Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CNC_B02"
                {...register('code', { required: 'Code is required' })}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs font-mono uppercase text-[#172033] focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#64748B] mb-1">
                Equipment Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 5-Axis Milling Unit"
                {...register('name', { required: 'Name is required' })}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              />
            </div>
          </div>

          {/* Rated Output & Initial Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">
                Rated Output (units/hr) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                {...register('rated_output_per_hour', {
                  required: 'Rated capacity is required',
                  valueAsNumber: true,
                })}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#64748B] mb-1">
                Operational Status
              </label>
              <select
                {...register('status')}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              >
                <option value="active">Active (Operational)</option>
                <option value="maintenance">Maintenance (Servicing)</option>
                <option value="inactive">Inactive (Decommissioned)</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || lines.length === 0}
              className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {createMutation.isPending ? 'Registering...' : 'Register Machine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
