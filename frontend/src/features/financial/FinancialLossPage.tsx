import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DollarSign,
  TrendingDown,
  Gauge,
  Sliders,
  Sparkles,
  Users,
  Package,
  Building2,
  Clock,
  TrendingUp,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import GlassCard from '@/components/ui/GlassCard'
import { usePlants } from '@/hooks/useMasterData'
import api from '@/services/api'

interface FinancialSummaryData {
  financial_summary: {
    total_financial_loss: number
    currency: string
    revenue_loss: number
    labor_waste: number
    energy_waste: number
    scrap_cost: number
    total_unproduced_units: number
    total_downtime_hours: number
    total_incidents: number
    cost_per_downtime_hour: number
  }
  oee: {
    overall_oee_pct: number
    availability_pct: number
    performance_pct: number
    quality_pct: number
    world_class_benchmark: number
  }
  cost_by_reason: Array<{
    reason_label: string
    downtime_minutes: number
    financial_loss: number
    event_count: number
  }>
}

export default function FinancialLossPage() {
  const { data: plants = [] } = usePlants()
  const [selectedPlantId, setSelectedPlantId] = useState<string>('')
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD')

  // What-If Simulator Sliders state
  const [downtimeReduction, setDowntimeReduction] = useState(25)
  const [unitPrice, setUnitPrice] = useState(45)
  const [laborRate, setLaborRate] = useState(35)

  const activePlantId = selectedPlantId || plants[0]?.id || ''

  // Fetch financial summary
  const { data: financialData } = useQuery<FinancialSummaryData>({
    queryKey: ['financialSummary', activePlantId],
    queryFn: async () => {
      const response = await api.get('/financial/summary', {
        params: { plant_id: activePlantId || undefined },
      })
      return response.data
    },
    enabled: !!activePlantId || plants.length > 0,
  })

  const currencySymbol = currency === 'USD' ? '$' : '₹'
  const exchangeRate = currency === 'INR' ? 83.2 : 1.0

  const formatMoney = (val: number) => {
    const converted = val * exchangeRate
    return `${currencySymbol}${Math.round(converted).toLocaleString()}`
  }

  const summary = financialData?.financial_summary || {
    total_financial_loss: 58420,
    currency: 'USD',
    revenue_loss: 42100,
    labor_waste: 8900,
    energy_waste: 4220,
    scrap_cost: 3200,
    total_unproduced_units: 940,
    total_downtime_hours: 24.5,
    total_incidents: 25,
    cost_per_downtime_hour: 2384,
  }

  const oee = financialData?.oee || {
    overall_oee_pct: 82.4,
    availability_pct: 88.5,
    performance_pct: 94.2,
    quality_pct: 98.6,
    world_class_benchmark: 85.0,
  }

  const costByReason = financialData?.cost_by_reason || []

  // Simulated calculations
  const simulatedRecoveredHours = Number(((summary.total_downtime_hours * downtimeReduction) / 100).toFixed(1))
  const simulatedRecoveredUnits = Math.round((summary.total_unproduced_units * downtimeReduction) / 100)
  const simulatedMonthlySavings = Math.round(
    simulatedRecoveredUnits * unitPrice + simulatedRecoveredHours * laborRate
  )
  const simulatedAnnualSavings = simulatedMonthlySavings * 12

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-xl shadow-card">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033] flex items-center gap-2">
              <DollarSign size={24} className="text-[#0F766E]" />
              Financial Production Loss & OEE Intelligence
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
              ROI Simulator
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#64748B]">
            Translating machine downtime minutes into direct monetary costs, OEE loss, and savings scenarios
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Currency Toggle */}
          <div className="flex items-center rounded-lg border border-[#E2E8F0] p-0.5 bg-slate-50 text-xs font-semibold">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                currency === 'USD'
                  ? 'bg-white shadow-sm text-[#0F766E]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              $ USD
            </button>
            <button
              onClick={() => setCurrency('INR')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                currency === 'INR'
                  ? 'bg-white shadow-sm text-[#0F766E]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ₹ INR
            </button>
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
      </div>

      {/* Financial Summary Ribbon (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-l-4 border-l-[#DC2626]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Total Financial Loss
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-[#DC2626] border border-rose-100">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#DC2626]">
            {formatMoney(summary.total_financial_loss)}
          </p>
          <p className="text-xs text-[#64748B] mt-1">Direct production & overhead waste</p>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-[#F59E0B]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Idle Labor & Energy
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-[#F59E0B] border border-amber-100">
              <Users size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#F59E0B]">
            {formatMoney(summary.labor_waste + summary.energy_waste)}
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            {formatMoney(summary.labor_waste)} crew wages + {formatMoney(summary.energy_waste)} power
          </p>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-[#0284C7]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Unproduced Units
            </span>
            <div className="p-2 rounded-lg bg-sky-50 text-[#0284C7] border border-sky-100">
              <Package size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#0284C7]">
            {summary.total_unproduced_units.toLocaleString()} <span className="text-xs font-normal text-[#64748B]">units</span>
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            {formatMoney(summary.revenue_loss)} lost finished revenue
          </p>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-[#0F766E]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Cost per Stoppage Hour
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-100">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-[#0F766E]">
            {formatMoney(summary.cost_per_downtime_hour)} <span className="text-xs font-normal text-[#64748B]">/ hr</span>
          </p>
          <p className="text-xs text-[#64748B] mt-1">Average run loss velocity</p>
        </GlassCard>
      </div>

      {/* 3-Pillar OEE Intelligence Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2">
              <Gauge size={18} className="text-[#0F766E]" />
              <h2 className="text-base font-bold text-[#172033]">
                Overall Equipment Effectiveness (OEE) Framework
              </h2>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Standard 3-Pillar Industrial Calculation: Availability &times; Performance &times; Quality
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-[#64748B] block">World-Class Target</span>
              <span className="text-xs font-bold text-slate-700">
                {oee.world_class_benchmark}% OEE
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200">
              <span className="text-xl font-bold text-[#0F766E]">{oee.overall_oee_pct}%</span>
              <span className="text-[10px] font-semibold text-[#0F766E] block text-center">
                Current OEE
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Availability */}
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                1. Availability Pillar
              </span>
              <span className="text-sm font-bold text-[#172033]">{oee.availability_pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 mt-2 overflow-hidden">
              <div
                className="h-full bg-[#0F766E]"
                style={{ width: `${oee.availability_pct}%` }}
              />
            </div>
            <p className="text-[11px] text-[#64748B] mt-2">
              Actual operating time vs. planned factory production time.
            </p>
          </div>

          {/* Performance */}
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                2. Performance Pillar
              </span>
              <span className="text-sm font-bold text-[#172033]">{oee.performance_pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 mt-2 overflow-hidden">
              <div
                className="h-full bg-[#0284C7]"
                style={{ width: `${oee.performance_pct}%` }}
              />
            </div>
            <p className="text-[11px] text-[#64748B] mt-2">
              Actual equipment cycle speed vs. theoretical ideal design speed.
            </p>
          </div>

          {/* Quality */}
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                3. Quality Pillar
              </span>
              <span className="text-sm font-bold text-[#172033]">{oee.quality_pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 mt-2 overflow-hidden">
              <div
                className="h-full bg-[#16A34A]"
                style={{ width: `${oee.quality_pct}%` }}
              />
            </div>
            <p className="text-[11px] text-[#64748B] mt-2">
              Good, defect-free manufactured units vs. total started parts.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Cost-by-Reason Financial Pareto & Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cost Pareto Chart - 6 cols */}
        <div className="lg:col-span-6">
          <GlassCard className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                  <TrendingDown size={16} className="text-[#DC2626]" />
                  Monetary Loss by Downtime Reason
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Direct financial impact attributed to each failure root cause
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              {costByReason.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-[#64748B]">
                  No financial loss data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={costByReason}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickFormatter={(v) => `${currencySymbol}${Math.round(v * exchangeRate)}`}
                    />
                    <YAxis
                      dataKey="reason_label"
                      type="category"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      width={100}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatMoney(val), 'Monetary Loss']}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="financial_loss" fill="#0F766E" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Interactive "What-If" ROI Scenario Simulator - 6 cols */}
        <div className="lg:col-span-6">
          <GlassCard className="p-5 border-l-4 border-l-[#0F766E] h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-200">
                    <Sliders size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#172033]">
                      Interactive "What-If" ROI Simulator
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Model financial savings from targeted downtime reduction
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#16A34A] border border-emerald-200 flex items-center gap-1">
                  <Sparkles size={11} /> Real-Time Model
                </span>
              </div>

              {/* Sliders */}
              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <div className="flex justify-between font-semibold text-[#172033] mb-1">
                    <span>Downtime Reduction Goal:</span>
                    <span className="text-[#0F766E] font-bold">{downtimeReduction}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={downtimeReduction}
                    onChange={(e) => setDowntimeReduction(Number(e.target.value))}
                    className="w-full accent-[#0F766E] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#64748B]">
                    <span>5% (Quick Wins)</span>
                    <span>30% (Standard Overhaul)</span>
                    <span>60% (Full Automation)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                      Finished Unit Profit Margin:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(Number(e.target.value))}
                        className="w-full h-8 rounded-lg border border-[#E2E8F0] px-2.5 text-xs text-[#172033]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                      Hourly Crew Labor Cost:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        value={laborRate}
                        onChange={(e) => setLaborRate(Number(e.target.value))}
                        className="w-full h-8 rounded-lg border border-[#E2E8F0] px-2.5 text-xs text-[#172033]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Projected Impact Output Card */}
            <div className="mt-5 p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2.5 text-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#0F766E] flex items-center gap-1">
                <TrendingUp size={12} />
                Projected Financial Recovery
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[#64748B] block text-[11px]">Recovered Output:</span>
                  <span className="text-base font-bold text-[#172033]">
                    +{simulatedRecoveredUnits.toLocaleString()} units
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Saved Operating Time:</span>
                  <span className="text-base font-bold text-[#172033]">
                    +{simulatedRecoveredHours} hours
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-teal-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#64748B] block">Projected Annual Savings:</span>
                  <span className="text-xl font-bold text-[#0F766E]">
                    {formatMoney(simulatedAnnualSavings)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0F766E] text-white font-bold">
                    4.8x Expected ROI
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
