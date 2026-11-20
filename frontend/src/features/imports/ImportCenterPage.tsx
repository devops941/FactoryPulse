import { useState } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import {
  usePreviewImport,
  useCommitImport,
  useImportBatches,
  useDownloadTemplate,
  ImportPreviewResponse,
} from '@/hooks/useImports'
import { usePlants } from '@/hooks/useMasterData'
import queryClient from '@/app/queryClient'
import UploadZone from './UploadZone'
import ValidationSummary from './ValidationSummary'
import PreviewTable from './PreviewTable'
import ImportHistory from './ImportHistory'
import { Download, Upload, Check, Building2 } from 'lucide-react'

export default function ImportCenterPage() {
  const [selectedPlantId, setSelectedPlantId] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  const { data: plants = [] } = usePlants()
  const activePlantId = selectedPlantId || plants[0]?.id || ''

  const { data: batches = [], isLoading: batchesLoading } = useImportBatches(
    activePlantId || undefined
  )

  const previewMutation = usePreviewImport()
  const commitMutation = useCommitImport()
  const downloadMutation = useDownloadTemplate()

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setPreview(null)
  }

  const handlePreview = async () => {
    if (!selectedFile || !activePlantId) return

    await previewMutation.mutateAsync(
      { file: selectedFile, plant_id: activePlantId },
      {
        onSuccess: (data) => {
          setPreview(data)
        },
      }
    )
  }

  const handleCommit = async () => {
    if (!preview) return

    await commitMutation.mutateAsync(
      { batch_id: preview.batch_id, plant_id: activePlantId, skip_duplicates: skipDuplicates },
      {
        onSuccess: () => {
          setSelectedFile(null)
          setPreview(null)
          queryClient.invalidateQueries({ queryKey: ['importBatches'] })
          queryClient.invalidateQueries({ queryKey: ['downtimeEvents'] })
          queryClient.invalidateQueries({ queryKey: ['events'] })
          queryClient.invalidateQueries({ queryKey: ['overviewAnalytics'] })
          queryClient.invalidateQueries({ queryKey: ['analytics'] })
          queryClient.invalidateQueries({ queryKey: ['machines'] })
          queryClient.invalidateQueries({ queryKey: ['reliability'] })
          queryClient.invalidateQueries({ queryKey: ['financial'] })
          queryClient.invalidateQueries({ queryKey: ['reports'] })
        },
      }
    )
  }

  const handleDownloadTemplate = async () => {
    await downloadMutation.mutateAsync()
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-xl shadow-card">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033]">
              Downtime Data Import Center
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
              Batch Pipeline
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
            Bulk ingest historical machine stoppages via validated CSV or Excel spreadsheets
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          disabled={downloadMutation.isPending}
          className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#334155] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Download size={14} />
          <span>{downloadMutation.isPending ? 'Downloading...' : 'Download Template (.csv)'}</span>
        </button>
      </div>

      {/* Main Upload Card */}
      <GlassCard className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-[#172033]">1. Select Target Plant Facility</h2>
            <p className="text-xs text-[#64748B]">Choose which manufacturing site this batch belongs to</p>
          </div>

          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-[#0F766E]" />
            <select
              value={activePlantId}
              onChange={(e) => setSelectedPlantId(e.target.value)}
              className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#172033] shadow-sm focus:outline-none focus:border-[#0F766E]"
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-5">
          <UploadZone
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            disabled={previewMutation.isPending || commitMutation.isPending}
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <label className="flex items-center gap-2 text-xs font-medium text-[#64748B] cursor-pointer">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
            />
            Skip duplicate event timestamps automatically
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!preview ? (
              <button
                onClick={handlePreview}
                disabled={!selectedFile || previewMutation.isPending}
                className="h-9 w-full sm:w-auto px-5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Upload size={14} />
                <span>{previewMutation.isPending ? 'Validating Batch...' : 'Inspect & Preview'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setPreview(null)
                  }}
                  className="h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium"
                >
                  Discard
                </button>
                <button
                  onClick={handleCommit}
                  disabled={commitMutation.isPending || preview.error_count > 0}
                  className="h-9 px-5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Check size={14} />
                  <span>{commitMutation.isPending ? 'Committing...' : 'Commit to Database'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Validation Summary */}
      {preview && (
        <div className="space-y-4">
          <ValidationSummary
            total={preview.total_rows}
            valid={preview.valid_count}
            warnings={preview.warning_count}
            errors={preview.error_count}
          />
          <PreviewTable rows={preview.preview_rows} />
        </div>
      )}

      {/* Ingestion Batch History */}
      <ImportHistory batches={batches} isLoading={batchesLoading} />
    </div>
  )
}
