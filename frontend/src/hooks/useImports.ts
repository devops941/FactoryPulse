/**
 * Custom hooks for import operations using TanStack Query
 */

import { useMutation, useQuery, UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import api from '@/services/api'

export interface ImportPreviewRow {
  row_number: number
  data: Record<string, any>
  status: 'valid' | 'warning' | 'error'
  issues: string[]
}

export interface ImportPreviewResponse {
  batch_id: string
  total_rows: number
  valid_count: number
  warning_count: number
  error_count: number
  duplicate_candidates: number
  column_mapping: Record<string, string>
  preview_rows: ImportPreviewRow[]
  detected_columns: string[]
}

export interface ImportCommitResponse {
  batch_id: string
  accepted: number
  rejected: number
  skipped: number
  total: number
  status: string
}

export interface ImportBatch {
  id: string
  plant_id: string
  file_name: string
  uploaded_by: string
  status: 'processing' | 'completed' | 'failed'
  total_rows: number
  accepted: number
  rejected: number
  skipped: number
  errors: Array<Record<string, any>>
  created_at: string
}

/**
 * Preview import file without committing
 */
export function usePreviewImport(): UseMutationResult<
  ImportPreviewResponse,
  Error,
  { file: File; plant_id: string }
> {
  return useMutation({
    mutationFn: async ({ file, plant_id }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('plant_id', plant_id)

      const response = await api.post<ImportPreviewResponse>('/imports/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
  })
}

/**
 * Commit import batch to database
 */
export function useCommitImport(): UseMutationResult<
  ImportCommitResponse,
  Error,
  { batch_id: string; plant_id: string; skip_duplicates?: boolean }
> {
  return useMutation({
    mutationFn: async ({ batch_id, plant_id, skip_duplicates = true }) => {
      const response = await api.post<ImportCommitResponse>('/imports/commit', {
        batch_id,
        plant_id,
        skip_duplicates,
      })
      return response.data
    },
  })
}

/**
 * List import batches
 */
export function useImportBatches(
  plantId?: string,
  limit?: number
): UseQueryResult<ImportBatch[], Error> {
  const params: Record<string, any> = {}
  if (plantId) params.plant_id = plantId
  if (limit) params.limit = limit

  return useQuery({
    queryKey: ['import_batches', plantId, limit],
    queryFn: async () => {
      const response = await api.get<ImportBatch[]>('/imports', { params })
      return response.data
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Get specific import batch
 */
export function useImportBatch(batchId?: string): UseQueryResult<ImportBatch, Error> {
  return useQuery({
    queryKey: ['import_batch', batchId],
    queryFn: async () => {
      const response = await api.get<ImportBatch>(`/imports/${batchId}`)
      return response.data
    },
    enabled: !!batchId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Download import template
 */
export function useDownloadTemplate(): UseMutationResult<
  Blob,
  Error,
  void
> {
  return useMutation({
    mutationFn: async () => {
      const response = await api.get('/imports/template/download', {
        responseType: 'blob',
      })
      return response.data
    },
  })
}
