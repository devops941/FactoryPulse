export interface User {
  id: string
  name: string
  email: string
  role: string
  plantIds: string[]
}

export interface Plant {
  id: string
  name: string
  timezone: string
  code: string
}

export interface Machine {
  id: string
  plantId: string
  lineId: string
  code: string
  name: string
  ratedOutputPerHour: number
  status: string
}

export interface DowntimeEvent {
  id: string
  plantId: string
  machineId: string
  startAt: string
  endAt: string
  durationMin: number
  reasonId: string
  shiftId: string
  source: string
  notes?: string
}

export interface KpiSummary {
  downtimeMinutes: number
  downtimeRatePct: number
  eventCount: number
  estimatedUnitsLost: number
  availabilityPct: number
}

export interface ApiError {
  error: {
    code: string
    message: string
    details: Array<{
      row?: number
      field?: string
      issue?: string
    }>
    requestId: string
  }
}
