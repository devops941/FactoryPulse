import { useState, useMemo } from 'react'
import {
  Clock,
  TrendingDown,
  Gauge,
  AlertTriangle,
  Package,
  AlertCircle,
  RefreshCw,
  Download,
  ArrowUpRight,
  Brain,
  DollarSign,
  Activity,
  Layers,
} from 'lucide-react'
import { subDays, format } from 'date-fns'
import KpiCard from '@/components/dashboard/KpiCard'
import FilterBar, { DashboardFilters } from '@/components/dashboard/FilterBar'
import DowntimeTrendChart from '@/components/charts/DowntimeTrendChart'
import ParetoChart from '@/components/charts/ParetoChart'
import MachineRankingChart from '@/components/charts/MachineRankingChart'
import ShiftComparisonChart from '@/components/charts/ShiftComparisonChart'
import DataQualityPanel from '@/components/dashboard/DataQualityPanel'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import GlassCard from '@/components/ui/GlassCard'
import { useOverviewAnalytics, useShiftAnalytics, useReasonAnalytics } from '@/hooks/useAnalytics'
import { usePlants, useMachines, useShifts } from '@/hooks/useMasterData'
import { Link } from 'react-router-dom'

// Helper: format minutes to "Xh Ym" format
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export default function OverviewPage() {
  // Master data queries
  const { data: plants, isLoading: plantsLoading, refetch: refetchPlants } = usePlants()
  const { data: machines = [], isLoading: machinesLoading, refetch: refetchMachines } = useMachines()
  const { data: shifts = [], isLoading: shiftsLoading } = useShifts()

  // Default filters: first plant, 30 days ago to today
  const defaultPlantId = plants?.[0]?.id
  const today = format(new Date(), 'yyyy-MM-dd')
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')

  const [filters, setFilters] = useState<DashboardFilters>({
    plant_id: defaultPlantId,
    from_date: thirtyDaysAgo,
    to_date: today,
  })

  const [lastUpdated, setLastUpdated] = useState<string>(format(new Date(), 'HH:mm:ss'))
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Analytics queries
  const {
    data: overviewData,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useOverviewAnalytics({
    plant_id: filters.plant_id,
    from_date: filters.from_date,
    to_date: filters.to_date,
    machine_id: filters.machine_id,
    shift_id: filters.shift_id,
  })

  const {
    data: shiftsData = [],
    isLoading: shiftsAnalyticsLoading,
    refetch: refetchShifts,
  } = useShiftAnalytics(filters.plant_id, filters.from_date, filters.to_date)

  const {
    data: reasonsData = [],
    isLoading: reasonsAnalyticsLoading,
    refetch: refetchReasons,
  } = useReasonAnalytics(filters.plant_id, filters.from_date, filters.to_date)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([
      refetchOverview(),
      refetchShifts(),
      refetchReasons(),
      refetchMachines(),
      refetchPlants(),
    ])
    setLastUpdated(format(new Date(), 'HH:mm:ss'))
    setIsRefreshing(false)
  }

  const handleExportDashboard = () => {
    // Generate CSV snapshot of KPI metrics and charts
    const kpiSummary = [
      ['Metric', 'Value'],
      ['Total Downtime (min)', totalDowntime],
      ['Downtime Rate (%)', downtimeRate],
      ['Availability (%)', availability],
      ['Event Count', eventCount],
      ['Estimated Units Lost', unitsLost],
      ['Date Range', `${filters.from_date} to ${filters.to_date}`],
    ]
      .map((r) => r.join(','))
      .join('\n')

    const blob = new Blob([kpiSummary], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `FactoryPulse_Dashboard_${filters.from_date}_to_${filters.to_date}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter machines for the selected plant
  const filteredMachines = useMemo(
    () => machines.filter((m) => !filters.plant_id || m.plant_id === filters.plant_id),
    [machines, filters.plant_id]
  )

  // Filter shifts for the selected plant
  const filteredShifts = useMemo(
    () => shifts.filter((s) => !filters.plant_id || s.plant_id === filters.plant_id),
    [shifts, filters.plant_id]
  )

  const isLoading =
    plantsLoading ||
    machinesLoading ||
    shiftsLoading ||
    overviewLoading ||
    shiftsAnalyticsLoading ||
    reasonsAnalyticsLoading

  // Extract KPI metrics safely
  const kpis = overviewData?.kpis
  const totalDowntime = kpis?.downtime_minutes ?? overviewData?.total_downtime_min ?? 0
  const downtimeRate = kpis?.downtime_rate_pct ?? overviewData?.downtime_rate_pct ?? 0
  const availability = kpis?.availability_pct ?? overviewData?.availability_pct ?? 100
  const eventCount = kpis?.event_count ?? overviewData?.event_count ?? 0
  const unitsLost = kpis?.estimated_units_lost ?? overviewData?.est_units_lost ?? 0

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-xl shadow-card">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033]">
              Plant Overview Dashboard
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
              Live Feed
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
            Real-time machine telemetry, overall equipment efficiency (OEE), and production loss analytics
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-[#64748B] block">Last Synced</span>
            <span className="text-xs font-semibold text-[#172033]">{lastUpdated}</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#334155] text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#0F766E]' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportDashboard}
            className="h-9 px-3.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Export Snapshot</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        plants={plants || []}
        machines={filteredMachines}
        shifts={filteredShifts}
        isLoading={isLoading}
      />

      {/* Error Alert State if API fails */}
      {overviewError && (
        <div className="rounded-xl border-l-4 border-l-[#DC2626] bg-rose-50 border border-rose-200 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-[#DC2626] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs sm:text-sm text-[#DC2626]">
                Failed to load live analytics data
              </p>
              <p className="text-xs text-rose-700 mt-0.5">
                Please check connection to the backend service or try resetting the date range filters.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Cards Strip (5 Cards) */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Total Downtime"
            value={overviewData ? formatDuration(totalDowntime) : '0m'}
            unit=""
            icon={Clock}
            color="primary"
            subtitle={`${eventCount} downtime stoppage events`}
          />

          <KpiCard
            title="Downtime Rate"
            value={overviewData ? (typeof downtimeRate === 'number' ? downtimeRate.toFixed(2) : '0.00') : '0.00'}
            unit="%"
            icon={TrendingDown}
            color={downtimeRate > 10 ? 'warning' : 'primary'}
            subtitle={downtimeRate <= 5 ? 'Target: < 5% (Optimal)' : 'Target: < 5% (Elevated)'}
          />

          <KpiCard
            title="Fleet Availability"
            value={overviewData ? (typeof availability === 'number' ? availability.toFixed(2) : '100.00') : '100.00'}
            unit="%"
            icon={Gauge}
            color={availability > 90 ? 'success' : 'warning'}
            subtitle="Standard threshold: 92.0%"
          />

          <KpiCard
            title="Incident Count"
            value={overviewData ? eventCount : 0}
            unit="events"
            icon={AlertTriangle}
            color="secondary"
            subtitle="Across all logged shifts"
          />

          <KpiCard
            title="Est. Production Loss"
            value={overviewData ? Math.round(unitsLost).toLocaleString() : 0}
            unit="units"
            icon={Package}
            color={unitsLost > 100 ? 'critical' : 'primary'}
            subtitle="Calculated from rated output"
          />
        </div>
      )}

      {/* Primary Analytics Grid (Downtime Trend 8 cols + Pareto 4 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {isLoading ? (
            <LoadingSkeleton className="h-84 w-full" />
          ) : (
            <DowntimeTrendChart
              data={Array.isArray(overviewData?.trend) ? overviewData.trend : []}
            />
          )}
        </div>

        <div className="lg:col-span-4">
          {isLoading ? (
            <LoadingSkeleton className="h-84 w-full" />
          ) : (
            <ParetoChart
              data={
                overviewData?.top_reasons?.length
                  ? overviewData.top_reasons
                  : reasonsData
              }
            />
          )}
        </div>
      </div>

      {/* Secondary Analytics Grid (Machine Ranking 6 cols + Shift Comparison 6 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          {isLoading ? (
            <LoadingSkeleton className="h-80 w-full" />
          ) : (
            <MachineRankingChart
              data={overviewData?.machine_ranking ? overviewData.machine_ranking : []}
            />
          )}
        </div>

        <div className="lg:col-span-6">
          {isLoading ? (
            <LoadingSkeleton className="h-80 w-full" />
          ) : (
            <ShiftComparisonChart
              data={
                overviewData?.shift_comparison?.length
                  ? overviewData.shift_comparison
                  : shiftsData
              }
            />
          )}
        </div>
      </div>

      {/* Plant Operational Health & Quick Actions Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-bold text-[#0F766E] uppercase tracking-wider flex items-center gap-1">
              <Brain size={12} />
              Predictive AI
            </span>
            <h4 className="text-sm font-bold text-[#172033] mt-1">Health & Risk Radar</h4>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              MTBF, MTTR & failure forecasting
            </p>
          </div>
          <Link
            to="/predictive-maintenance"
            className="p-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0F766E] border border-teal-200 transition-colors flex-shrink-0"
            title="Open Predictive Maintenance"
          >
            <ArrowUpRight size={16} />
          </Link>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <DollarSign size={12} />
              Financial Loss
            </span>
            <h4 className="text-sm font-bold text-[#172033] mt-1">Monetary ROI Impact</h4>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              USD ($) & INR (₹) loss breakdown
            </p>
          </div>
          <Link
            to="/loss-calculator"
            className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors flex-shrink-0"
            title="Open Financial Loss Calculator"
          >
            <ArrowUpRight size={16} />
          </Link>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1">
              <Activity size={12} />
              Digital Twin
            </span>
            <h4 className="text-sm font-bold text-[#172033] mt-1">Shop Floor Telemetry</h4>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Live equipment layout & nodes
            </p>
          </div>
          <Link
            to="/shop-floor"
            className="p-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors flex-shrink-0"
            title="Open Digital Twin"
          >
            <ArrowUpRight size={16} />
          </Link>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Layers size={12} />
              Audit Logs
            </span>
            <h4 className="text-sm font-bold text-[#172033] mt-1">Incident Registry</h4>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Full audit trail & exports
            </p>
          </div>
          <Link
            to="/downtime-logs"
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#334155] border border-slate-200 transition-colors flex-shrink-0"
            title="Open Downtime Logs"
          >
            <ArrowUpRight size={16} />
          </Link>
        </GlassCard>
      </div>

      {/* Data Quality & Anomaly Detection Panel */}
      <DataQualityPanel
        metrics={{
          total_events: eventCount,
          missing_reason_pct: overviewData?.data_quality?.missing_reason_pct ?? 0,
          invalid_timestamps_pct: overviewData?.data_quality?.invalid_timestamps_pct ?? 0,
          negative_duration_events: overviewData?.data_quality?.negative_duration_events ?? 0,
        }}
      />
    </div>
  )
}
