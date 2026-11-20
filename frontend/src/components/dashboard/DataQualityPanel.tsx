import { ChevronDown, ShieldCheck, CheckCircle } from 'lucide-react'
import { useState } from 'react'

interface DataQualityMetric {
  label: string
  value: number
  threshold: { warning: number; critical: number }
  unit?: string
}

interface DataQualityPanelProps {
  metrics?: {
    total_events?: number
    missing_reason_pct?: number
    invalid_timestamps_pct?: number
    negative_duration_events?: number
  }
}

function getStatusBadge(value: number, threshold: { warning: number; critical: number }) {
  if (value >= threshold.critical) {
    return {
      label: 'Attention Needed',
      badgeClass: 'bg-rose-50 text-[#DC2626] border-rose-200',
      dotClass: 'bg-rose-500',
    }
  }
  if (value >= threshold.warning) {
    return {
      label: 'Minor Warning',
      badgeClass: 'bg-amber-50 text-[#F59E0B] border-amber-200',
      dotClass: 'bg-amber-500',
    }
  }
  return {
    label: 'Verified Clean',
    badgeClass: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
    dotClass: 'bg-emerald-500',
  }
}

export default function DataQualityPanel({ metrics }: DataQualityPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const qualityMetrics: DataQualityMetric[] = [
    {
      label: 'Total Ingested Events',
      value: metrics?.total_events || 0,
      threshold: { warning: 100, critical: 10 },
      unit: 'events',
    },
    {
      label: 'Missing Reason Tag',
      value: metrics?.missing_reason_pct || 0,
      threshold: { warning: 5, critical: 10 },
      unit: '%',
    },
    {
      label: 'Timestamp Discrepancy',
      value: metrics?.invalid_timestamps_pct || 0,
      threshold: { warning: 2, critical: 5 },
      unit: '%',
    },
    {
      label: 'Negative Duration Anomalies',
      value: metrics?.negative_duration_events || 0,
      threshold: { warning: 1, critical: 5 },
    },
  ]

  const totalAnomalies =
    (metrics?.missing_reason_pct || 0) +
    (metrics?.invalid_timestamps_pct || 0) +
    (metrics?.negative_duration_events || 0)

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] shadow-card overflow-hidden transition-all">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/70 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-50 border border-teal-100 text-[#0F766E]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              Telemetry Data Quality & Integrity Monitor
              {totalAnomalies === 0 && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle size={10} /> 100% Validated
                </span>
              )}
            </h4>
            <p className="text-xs text-[#64748B] mt-0.5">
              Automated anomaly detection, timestamp verification, and reason attribution audits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#0F766E]">
          <span>{isExpanded ? 'Hide Details' : 'View Audit'}</span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#E2E8F0] bg-slate-50/40 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {qualityMetrics.map((m, idx) => {
              const status = getStatusBadge(m.value, m.threshold)
              return (
                <div
                  key={idx}
                  className="rounded-lg bg-white border border-[#E2E8F0] p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#64748B]">{m.label}</span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${status.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-2 text-xl font-bold text-[#172033]">
                    {m.value}
                    {m.unit && <span className="text-xs font-normal text-[#64748B] ml-1">{m.unit}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
