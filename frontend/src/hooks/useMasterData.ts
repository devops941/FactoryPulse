/**
 * Custom hooks for master data fetching using TanStack Query
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import api from '@/services/api'

export interface Plant {
  id: string
  name: string
  code: string
  timezone: string
}

export interface Line {
  id: string
  plant_id: string
  name: string
  code: string
}

export interface Machine {
  id: string
  plant_id: string
  line_id: string
  code: string
  name: string
  rated_output_per_hour: number
  status: string
}

export interface Shift {
  id: string
  plant_id: string
  name: string
  start_local: string
  end_local: string
}

export interface Reason {
  id: string
  plant_id: string
  code: string
  label: string
  category: string
  is_planned: boolean
  active: boolean
}

/**
 * Fetch all plants
 */
export function usePlants(): UseQueryResult<Plant[], Error> {
  return useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const response = await api.get<Plant[]>('/plants')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch production lines for a specific plant
 */
export function useLines(plantId?: string): UseQueryResult<Line[], Error> {
  const params: Record<string, string> = {}
  if (plantId) params.plant_id = plantId

  return useQuery({
    queryKey: ['lines', plantId],
    queryFn: async () => {
      const response = await api.get<Line[]>('/lines', { params })
      return response.data
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!plantId || !plantId,
  })
}

/**
 * Fetch machines for a specific plant and/or line
 */
export function useMachines(
  plantId?: string,
  lineId?: string
): UseQueryResult<Machine[], Error> {
  const params: Record<string, string> = {}
  if (plantId) params.plant_id = plantId
  if (lineId) params.line_id = lineId

  return useQuery({
    queryKey: ['machines', plantId, lineId],
    queryFn: async () => {
      const response = await api.get<Machine[]>('/machines', { params })
      return response.data
    },
    staleTime: 30 * 1000, // 30 seconds for dynamic freshness
    enabled: true,
  })
}

/**
 * Fetch shifts for a specific plant
 */
export function useShifts(plantId?: string): UseQueryResult<Shift[], Error> {
  return useQuery({
    queryKey: ['shifts', plantId],
    queryFn: async () => {
      const params = plantId ? { plant_id: plantId } : {}
      const response = await api.get<Shift[]>('/shifts', { params })
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  })
}

/**
 * Fetch downtime reasons for a specific plant
 */
export function useReasons(plantId?: string): UseQueryResult<Reason[], Error> {
  return useQuery({
    queryKey: ['reasons', plantId],
    queryFn: async () => {
      const params = plantId ? { plant_id: plantId } : {}
      const response = await api.get<Reason[]>('/reasons', { params })
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!plantId || !plantId, // Always fetch
  })
}

/**
 * Downtime Event types for frontend
 */
export interface DowntimeEvent {
  id: string
  plant_id: string
  machine_id: string
  line_id: string
  start_at: string
  end_at: string
  duration_min: number
  reason_id: string
  shift_id: string
  source: string
  batch_id?: string
  notes?: string
  created_by: string
  created_at: string
  status: string
}

export interface DowntimeEventListResponse {
  items: DowntimeEvent[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  before?: Record<string, any>
  after?: Record<string, any>
  created_at: string
}

/**
 * Fetch downtime events with filters and pagination
 */
export function useDowntimeEvents(
  filters?: {
    plantId?: string
    machineId?: string
    shiftId?: string
    reasonId?: string
    fromDate?: string
    toDate?: string
    page?: number
    limit?: number
  }
): UseQueryResult<DowntimeEventListResponse, Error> {
  return useQuery({
    queryKey: ['downtime-events', filters],
    queryFn: async () => {
      const params: Record<string, any> = {
        page: filters?.page || 1,
        limit: filters?.limit || 20,
      }
      if (filters?.plantId) params.plant_id = filters.plantId
      if (filters?.machineId) params.machine_id = filters.machineId
      if (filters?.shiftId) params.shift_id = filters.shiftId
      if (filters?.reasonId) params.reason_id = filters.reasonId
      if (filters?.fromDate) params.from_date = filters.fromDate
      if (filters?.toDate) params.to_date = filters.toDate

      const response = await api.get<DowntimeEventListResponse>('/downtime-events', { params })
      return response.data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Fetch a single downtime event
 */
export function useDowntimeEvent(eventId?: string): UseQueryResult<DowntimeEvent, Error> {
  return useQuery({
    queryKey: ['downtime-event', eventId],
    queryFn: async () => {
      const response = await api.get<DowntimeEvent>(`/downtime-events/${eventId}`)
      return response.data
    },
    enabled: !!eventId,
  })
}

/**
 * Fetch audit history for a downtime event
 */
export function useDowntimeAuditHistory(
  eventId?: string,
  limit: number = 50
): UseQueryResult<AuditLog[], Error> {
  return useQuery({
    queryKey: ['downtime-audit', eventId, limit],
    queryFn: async () => {
      const response = await api.get<AuditLog[]>(`/downtime-events/${eventId}/audit`, {
        params: { limit },
      })
      return response.data
    },
    enabled: !!eventId,
  })
}
