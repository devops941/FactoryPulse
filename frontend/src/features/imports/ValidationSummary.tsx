import GlassCard from '@/components/ui/GlassCard'
import { FileText, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'

interface ValidationSummaryProps {
  total: number
  valid: number
  warnings: number
  errors: number
}

export default function ValidationSummary({
  total,
  valid,
  warnings,
  errors,
}: ValidationSummaryProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <GlassCard className="p-4 text-center">
        <div className="flex items-center justify-center text-slate-400 mb-1">
          <FileText size={18} />
        </div>
        <div className="text-2xl font-bold text-[#172033]">{total}</div>
        <div className="text-xs font-semibold text-[#64748B] mt-0.5">Total Rows</div>
      </GlassCard>

      <GlassCard className="p-4 text-center">
        <div className="flex items-center justify-center text-emerald-500 mb-1">
          <CheckCircle2 size={18} />
        </div>
        <div className="text-2xl font-bold text-[#16A34A]">{valid}</div>
        <div className="text-xs font-semibold text-[#64748B] mt-0.5">Valid Entries</div>
      </GlassCard>

      <GlassCard className="p-4 text-center">
        <div className="flex items-center justify-center text-amber-500 mb-1">
          <AlertTriangle size={18} />
        </div>
        <div className="text-2xl font-bold text-[#F59E0B]">{warnings}</div>
        <div className="text-xs font-semibold text-[#64748B] mt-0.5">Warnings</div>
      </GlassCard>

      <GlassCard className="p-4 text-center">
        <div className="flex items-center justify-center text-rose-500 mb-1">
          <AlertCircle size={18} />
        </div>
        <div className="text-2xl font-bold text-[#DC2626]">{errors}</div>
        <div className="text-xs font-semibold text-[#64748B] mt-0.5">Errors / Discarded</div>
      </GlassCard>
    </div>
  )
}
