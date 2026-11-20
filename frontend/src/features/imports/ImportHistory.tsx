import GlassCard from '@/components/ui/GlassCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { ImportBatch } from '@/hooks/useImports'
import { History, FileSpreadsheet } from 'lucide-react'

interface ImportHistoryProps {
  batches: ImportBatch[]
  isLoading?: boolean
}

export default function ImportHistory({ batches, isLoading = false }: ImportHistoryProps) {
  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="text-xs text-[#64748B]">Loading import batch audit history...</div>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
          <History size={16} className="text-[#0F766E]" />
          Batch Ingestion History
        </h3>
        <span className="text-xs text-[#64748B]">{batches.length} previous runs</span>
      </div>

      {batches.length === 0 ? (
        <div className="py-10 text-center text-xs text-[#64748B]">
          No import runs have been executed for this facility yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider font-semibold text-[#64748B] border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-3.5">Filename</th>
                <th className="py-3 px-3.5">Processed Date</th>
                <th className="py-3 px-3.5">Total Rows</th>
                <th className="py-3 px-3.5">Accepted</th>
                <th className="py-3 px-3.5">Rejected</th>
                <th className="py-3 px-3.5">Skipped</th>
                <th className="py-3 px-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3.5 font-medium text-[#172033] flex items-center gap-2">
                    <FileSpreadsheet size={14} className="text-[#0F766E]" />
                    {batch.file_name}
                  </td>
                  <td className="py-2.5 px-3.5 text-[#64748B]">
                    {new Date(batch.created_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-2.5 px-3.5 font-semibold text-[#172033]">{batch.total_rows}</td>
                  <td className="py-2.5 px-3.5 font-bold text-[#16A34A]">{batch.accepted}</td>
                  <td className="py-2.5 px-3.5 font-bold text-[#DC2626]">{batch.rejected}</td>
                  <td className="py-2.5 px-3.5 text-[#F59E0B]">{batch.skipped}</td>
                  <td className="py-2.5 px-3.5">
                    <StatusBadge status={batch.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  )
}
