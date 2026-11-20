import { useRef } from 'react'
import { UploadCloud, CheckCircle } from 'lucide-react'

interface UploadZoneProps {
  selectedFile: File | null
  onFileSelect: (file: File) => void
  disabled?: boolean
  isLoading?: boolean
}

export default function UploadZone({
  selectedFile,
  onFileSelect,
  disabled = false,
}: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      e.currentTarget.classList.add('border-[#0F766E]', 'bg-teal-50/50')
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-[#0F766E]', 'bg-teal-50/50')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('border-[#0F766E]', 'bg-teal-50/50')

    if (disabled) return

    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      onFileSelect(file)
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all bg-white ${
        disabled
          ? 'opacity-50 cursor-not-allowed border-slate-200'
          : 'border-slate-300 hover:border-[#0F766E] hover:bg-teal-50/30 shadow-sm'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {selectedFile ? (
        <div className="flex flex-col items-center">
          <div className="p-3 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200 mb-3">
            <CheckCircle size={28} />
          </div>
          <p className="font-bold text-sm text-[#172033]">{selectedFile.name}</p>
          <p className="text-xs text-[#64748B] mt-1">
            {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click to replace file
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="p-3.5 rounded-full bg-slate-100 text-[#0F766E] border border-slate-200 mb-3">
            <UploadCloud size={30} />
          </div>
          <p className="font-bold text-sm text-[#172033]">
            Drop downtime event spreadsheets here, or{' '}
            <span className="text-[#0F766E] underline font-semibold">browse files</span>
          </p>
          <p className="text-xs text-[#64748B] mt-1.5">
            Supported formats: CSV, XLSX &bull; Max recommended batch: 5,000 rows
          </p>
        </div>
      )}
    </div>
  )
}
