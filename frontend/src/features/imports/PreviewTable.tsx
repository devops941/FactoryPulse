import GlassCard from '@/components/ui/GlassCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { ImportPreviewRow } from '@/hooks/useImports'
import { Table } from 'lucide-react'

interface PreviewTableProps {
  rows: ImportPreviewRow[]
}

export default function PreviewTable({ rows }: PreviewTableProps) {
  if (rows.length === 0) {
    return null
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
          <Table size={16} className="text-[#0F766E]" />
          Import Staging Preview (Sample First {rows.length} Rows)
        </h3>
        <span className="text-xs text-[#64748B]">Verify data integrity before committing to database</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider font-semibold text-[#64748B] border-b border-[#E2E8F0]">
            <tr>
              <th className="py-2.5 px-3">Row #</th>
              <th className="py-2.5 px-3">Validation</th>
              <th className="py-2.5 px-3">Machine Code</th>
              <th className="py-2.5 px-3">Start Timestamp</th>
              <th className="py-2.5 px-3">End Timestamp</th>
              <th className="py-2.5 px-3">Issues / Diagnostics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.row_number} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-3 font-mono font-medium text-slate-500">
                  #{row.row_number}
                </td>
                <td className="py-2.5 px-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="py-2.5 px-3 font-semibold text-[#172033]">
                  {row.data.machine_code || '-'}
                </td>
                <td className="py-2.5 px-3 text-[#64748B]">
                  {String(row.data.start_time).substring(0, 19)}
                </td>
                <td className="py-2.5 px-3 text-[#64748B]">
                  {String(row.data.end_time).substring(0, 19)}
                </td>
                <td className="py-2.5 px-3">
                  {row.issues.length > 0 ? (
                    <details className="text-[11px] text-rose-600 cursor-pointer">
                      <summary className="font-medium hover:underline">
                        {row.issues.length} issue(s) detected
                      </summary>
                      <ul className="mt-1 space-y-0.5 text-rose-700 pl-3 list-disc">
                        {row.issues.map((iss, i) => (
                          <li key={i}>{iss}</li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    <span className="text-emerald-600 text-[11px] font-medium">Valid</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}
