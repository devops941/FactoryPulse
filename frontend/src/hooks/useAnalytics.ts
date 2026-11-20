import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export interface AnalyticsFilters {
  plant_id?: string
  from_date?: string
  to_date?: string
  machine_id?: string
  shift_id?: string
  planned_hours?: number
}

export interface OverviewKpis {
  downtime_minutes: number
  downtime_rate_pct: number
  availability_pct: number
  event_count: number
  estimated_units_lost: number
  mttr_min?: number
  mtbf_min?: number
}

export interface OverviewAnalytics {
  kpis?: OverviewKpis
  trend?: Array<{
    date: string
    downtime_minutes: number
    event_count: number
  }>
  top_reasons?: Array<{
    reason_id: string
    reason_label: string
    total_minutes: number
    event_count: number
    share_pct: number
    cumulative_pct: number
  }>
  machine_ranking?: Array<{
    machine_id: string
    machine_name: string
    machine_code: string
    total_minutes: number
    event_count: number
    estimated_units_lost: number
  }>
  shift_comparison?: Array<{
    shift_id: string
    shift_name: string
    total_minutes: number
    event_count: number
  }>
  data_quality?: Record<string, any>
  total_downtime_min?: number
  downtime_rate_pct?: number
  availability_pct?: number
  event_count?: number
  est_units_lost?: number
}

export interface MachineAnalytics {
  machine_id: string
  machine_name: string
  total_downtime_min: number
  event_count: number
  est_units_lost: number
  downtime_by_reason: Array<{
    reason_label: string
    total_minutes: number
    share_pct: number
  }>
  trend: Array<{
    date: string
    downtime_minutes: number
    event_count: number
  }>
}

export interface ShiftAnalytics {
  shift_id: string
  shift_name: string
  total_downtime_min: number
  event_count: number
  avg_duration_min: number
}

export interface ReasonAnalytics {
  reason_id: string
  reason_label: string
  total_minutes: number
  share_pct: number
  cumulative_pct: number
  event_count: number
}

export function useOverviewAnalytics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'overview', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, String(v)))
      const { data } = await api.get<OverviewAnalytics>(`/analytics/overview?${params}`)
      return data
    },
    enabled: !!filters.plant_id,
    staleTime: 60_000,
  })
}

export function useMachineAnalytics(machineId: string | null, fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: ['analytics', 'machine', machineId, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (fromDate) params.set('from_date', fromDate)
      if (toDate) params.set('to_date', toDate)
      const { data } = await api.get<any>(
        `/analytics/machines/${machineId}?${params}`
      )
      return {
        ...data,
        total_downtime_min: Number(data?.kpis?.downtime_minutes ?? data?.total_downtime_min ?? 0),
        event_count: Number(data?.kpis?.event_count ?? data?.event_count ?? 0),
        est_units_lost: Number(data?.kpis?.estimated_units_lost ?? data?.est_units_lost ?? 0),
        downtime_by_reason: data?.reason_breakdown ?? data?.downtime_by_reason ?? [],
        trend: Array.isArray(data?.trend) ? data.trend : [],
      } as MachineAnalytics
    },
    enabled: !!machineId,
  })
}

export function useShiftAnalytics(plantId?: string, fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: ['analytics', 'shifts', plantId, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (plantId) params.set('plant_id', plantId)
      if (fromDate) params.set('from_date', fromDate)
      if (toDate) params.set('to_date', toDate)
      const { data } = await api.get<any>(`/analytics/shifts?${params}`)
      const rawList: any[] = Array.isArray(data) ? data : (data?.shifts ?? [])
      return rawList.map((item: any) => ({
        shift_id: item.shift_id ?? item.id ?? '',
        shift_name: item.shift_name ?? item.name ?? 'Unknown',
        total_downtime_min: Number(item.total_downtime_min ?? item.total_minutes ?? 0),
        total_minutes: Number(item.total_minutes ?? item.total_downtime_min ?? 0),
        event_count: Number(item.event_count ?? 0),
        avg_duration_min: Number(
          item.avg_duration_min ??
            (item.event_count > 0 ? (item.total_minutes || 0) / item.event_count : 0)
        ),
      })) as ShiftAnalytics[]
    },
    enabled: !!plantId,
  })
}

export function useReasonAnalytics(plantId?: string, fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: ['analytics', 'reasons', plantId, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (plantId) params.set('plant_id', plantId)
      if (fromDate) params.set('from_date', fromDate)
      if (toDate) params.set('to_date', toDate)
      const { data } = await api.get<any>(`/analytics/reasons?${params}`)
      const rawList: any[] = Array.isArray(data) ? data : (data?.pareto ?? [])
      return rawList.map((item: any) => ({
        reason_id: item.reason_id ?? '',
        reason_label: item.reason_label ?? item.label ?? 'Other',
        total_minutes: Number(item.total_minutes ?? 0),
        share_pct: Number(item.share_pct ?? 0),
        cumulative_pct: Number(item.cumulative_pct ?? 0),
        event_count: Number(item.event_count ?? 0),
      })) as ReasonAnalytics[]
    },
    enabled: !!plantId,
  })
}
