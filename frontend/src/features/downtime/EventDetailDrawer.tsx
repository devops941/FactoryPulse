import { useDowntimeEvent, useDowntimeAuditHistory } from '@/hooks/useMasterData'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import { X, Clock, Calendar } from 'lucide-react'

interface EventDetailDrawerProps {
  eventId: string | null
  isOpen: boolean
  onClose: () => void
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export default function EventDetailDrawer({
  eventId,
  isOpen,
  onClose,
}: EventDetailDrawerProps) {
  const { data: event, isLoading: eventLoading } = useDowntimeEvent(eventId || undefined)
  const { data: auditLogs = [], isLoading: auditLoading } = useDowntimeAuditHistory(
    eventId || undefined
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          className="w-screen max-w-md bg-white border-l border-[#E2E8F0] shadow-2xl p-6 overflow-y-auto"
          style={{ animation: 'slideIn 0.2s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
            <div>
              <h3 className="font-bold text-base text-[#172033]">Incident Inspection</h3>
              <p className="text-xs text-[#64748B] mt-0.5 font-mono">{eventId}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {eventLoading ? (
            <div className="mt-6 space-y-4">
              <LoadingSkeleton className="h-20 w-full" />
              <LoadingSkeleton className="h-40 w-full" />
            </div>
          ) : !event ? (
            <div className="mt-8 text-center text-xs text-[#64748B]">
              Incident details could not be loaded.
            </div>
          ) : (
            <div className="mt-6 space-y-5 text-xs">
              {/* Status and Duration Card */}
              <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#64748B]">
                    Incident Status
                  </span>
                  <div className="mt-1">
                    <StatusBadge status={event.status} size="md" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-[#64748B]">
                    Duration
                  </span>
                  <p className="text-lg font-bold text-[#172033] mt-0.5">
                    {formatDuration(event.duration_min)}
                  </p>
                </div>
              </div>

              {/* Time Details */}
              <div className="space-y-3 rounded-xl border border-[#E2E8F0] p-4 bg-white shadow-sm">
                <div className="flex items-start gap-2.5">
                  <Calendar size={16} className="text-[#0F766E] mt-0.5" />
                  <div>
                    <span className="text-[#64748B] block">Started At</span>
                    <span className="font-semibold text-[#172033]">
                      {formatDateTime(event.start_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock size={16} className="text-[#0F766E] mt-0.5" />
                  <div>
                    <span className="text-[#64748B] block">Resolved At</span>
                    <span className="font-semibold text-[#172033]">
                      {formatDateTime(event.end_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {event.notes && (
                <div className="rounded-xl border border-[#E2E8F0] p-4 bg-white shadow-sm">
                  <span className="text-[10px] uppercase font-semibold text-[#64748B] block mb-1">
                    Operator Notes
                  </span>
                  <p className="text-[#172033] leading-relaxed">{event.notes}</p>
                </div>
              )}

              {/* Audit History */}
              <div>
                <h4 className="font-bold text-sm text-[#172033] mb-3">Audit Log Timeline</h4>
                {auditLoading ? (
                  <LoadingSkeleton className="h-20 w-full" />
                ) : auditLogs.length === 0 ? (
                  <p className="text-xs text-[#64748B]">No modification logs recorded.</p>
                ) : (
                  <div className="space-y-2.5">
                    {auditLogs.map((log: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-[11px]"
                      >
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-semibold text-slate-700">{log.action}</span>
                          <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-600 mt-1">Logged by {log.user_email || 'System'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
