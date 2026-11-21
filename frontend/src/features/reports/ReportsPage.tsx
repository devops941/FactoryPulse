import React, { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import GlassCard from '@/components/ui/GlassCard'
import { Loader2, Download, FileText, Clock } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { usePlants, useMachines, useShifts } from '@/hooks/useMasterData'

interface ReportRequest {
  plant_id: string
  from_date: string
  to_date: string
  machine_id?: string
  shift_id?: string
  format: 'pdf' | 'csv' | 'xlsx'
  title: string
}

interface ReportHistoryItem {
  id: string
  plant_id: string
  title: string
  format: string
  status: string
  from_date: string
  to_date: string
  created_by: string
  created_at: string
  file_size_kb?: number
}

export default function ReportsPage() {
  const { data: masterPlants = [] } = usePlants()
  const [selectedPlant, setSelectedPlant] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [machineFilter, setMachineFilter] = useState<string>('')
  const [shiftFilter, setShiftFilter] = useState<string>('')
  const [format, setFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf')
  const [reportTitle, setReportTitle] = useState<string>('Downtime Loss & Root Cause Audit')

  const activePlantId = selectedPlant || masterPlants[0]?.id || ''

  const { data: machines = [] } = useMachines(activePlantId)
  const { data: shifts = [] } = useShifts(activePlantId)

  const reportHistory = useQuery({
    queryKey: ['reportHistory', activePlantId],
    queryFn: async () => {
      if (!activePlantId) return { total: 0, reports: [] }
      try {
        const response = await apiClient.get('/reports', {
          params: { plant_id: activePlantId, limit: 20 },
        })
        return response.data
      } catch (e) {
        return { total: 0, reports: [] }
      }
    },
    enabled: !!activePlantId,
  })

  const generateReportMutation = useMutation({
    mutationFn: async (request: ReportRequest) => {
      const response = await apiClient.post('/reports', request, {
        responseType: 'blob',
      })
      return response
    },
    onSuccess: (response, variables) => {
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `factorypulse_report_${Date.now()}.${variables.format}`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
  })

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!activePlantId || !fromDate || !toDate) {
      alert('Please select plant, from date, and to date')
      return
    }

    const request: ReportRequest = {
      plant_id: activePlantId,
      from_date: fromDate,
      to_date: toDate,
      machine_id: machineFilter || undefined,
      shift_id: shiftFilter || undefined,
      format: format,
      title: reportTitle,
    }

    generateReportMutation.mutate(request)
  }

  const handleDownloadReport = async (reportId: string) => {
    try {
      const response = await apiClient.get(`/reports/${reportId}/download`, {
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${reportId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('Failed to download report')
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-xl shadow-card">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033]">
              Reports & Executive Exports
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
              PDF &bull; Excel &bull; CSV
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
            Generate formal industrial downtime analysis, OEE summaries, and equipment root cause reports
          </p>
        </div>
      </div>

      {/* Report Builder Form */}
      <GlassCard className="p-5">
        <h2 className="text-sm font-bold text-[#172033] mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <FileText size={16} className="text-[#0F766E]" />
          Configure Report Parameters
        </h2>

        <form onSubmit={handleGenerateReport} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Plant */}
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">Target Facility</label>
              <select
                value={activePlantId}
                onChange={(e) => setSelectedPlant(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              >
                {masterPlants.map((plant) => (
                  <option key={plant.id} value={plant.id}>
                    {plant.name} ({plant.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Export Format */}
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">Export Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              >
                <option value="pdf">Adobe PDF Document (.pdf)</option>
                <option value="csv">Standard CSV Spreadsheet (.csv)</option>
                <option value="xlsx">Microsoft Excel (.xlsx)</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">Report Heading</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            {/* From Date */}
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            {/* Machine Filter */}
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">Equipment Scope (Optional)</label>
              <select
                value={machineFilter}
                onChange={(e) => setMachineFilter(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              >
                <option value="">All Registered Machines</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Shift Filter */}
            <div>
              <label className="block font-semibold text-[#64748B] mb-1">Shift Scope (Optional)</label>
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#172033] focus:border-[#0F766E] focus:outline-none"
              >
                <option value="">All Shifts</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={generateReportMutation.isPending || !activePlantId || !fromDate || !toDate}
              className="h-9 px-5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {generateReportMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Document...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generate & Download Report
                </>
              )}
            </button>
          </div>
        </form>
      </GlassCard>

      {/* Report History */}
      <GlassCard className="p-5">
        <h2 className="text-sm font-bold text-[#172033] mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Clock size={16} className="text-[#0F766E]" />
          Generated Report Archive
        </h2>

        {reportHistory.isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F766E]" />
            <p className="text-xs text-[#64748B] mt-2">Loading report history...</p>
          </div>
        ) : reportHistory.data?.reports?.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#64748B]">
            <FileText className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            No reports generated for this plant facility yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider font-semibold text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-4">Title</th>
                  <th className="py-2.5 px-4">Format</th>
                  <th className="py-2.5 px-4">Date Range</th>
                  <th className="py-2.5 px-4">Generated</th>
                  <th className="py-2.5 px-4">Size</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportHistory.data?.reports?.map((report: ReportHistoryItem) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-[#172033]">{report.title}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {report.format.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[#64748B]">
                      {report.from_date} to {report.to_date}
                    </td>
                    <td className="py-2.5 px-4 text-[#64748B]">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 text-[#64748B]">
                      {report.file_size_kb ? `${(report.file_size_kb / 1024).toFixed(2)} MB` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => handleDownloadReport(report.id)}
                        className="text-[#0F766E] hover:underline font-semibold"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
