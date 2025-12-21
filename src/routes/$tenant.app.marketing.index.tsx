import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, lazy, Suspense } from 'react'
import {
  Users,
  TrendingUp,
  Target,
  DollarSign,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const TrafficSourcesChart = lazy(() =>
  import('@/components/TrafficSourcesChart').then((mod) => ({
    default: mod.TrafficSourcesChart,
  }))
)

const PipelineFunnelChart = lazy(() =>
  import('@/components/PipelineFunnelChart').then((mod) => ({
    default: mod.PipelineFunnelChart,
  }))
)

export const Route = createFileRoute('/$tenant/app/marketing/')({
  component: MarketingDashboard,
})

// Mock data for KPI cards
const kpiData = [
  {
    id: 'site-traffic',
    title: 'Site Traffic (MoM)',
    value: '145k',
    change: '+22%',
    trend: 'up' as const,
    icon: Users,
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-50',
  },
  {
    id: 'visit-to-lead',
    title: 'Visit-to-Lead',
    value: '3.4%',
    change: '+0.2%',
    trend: 'up' as const,
    icon: TrendingUp,
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-50',
  },
  {
    id: 'mqls-created',
    title: 'MQLs Created',
    value: '480',
    change: '+15%',
    trend: 'up' as const,
    icon: Target,
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-50',
  },
  {
    id: 'marketing-roi',
    title: 'Marketing ROI',
    value: '4.2x',
    change: '+0.5x',
    trend: 'up' as const,
    icon: DollarSign,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50',
  },
]

// Mock data for traffic sources chart
const trafficChartData = [
  { day: 'Mon', organic: 2800, paid: 1800 },
  { day: 'Tue', organic: 4200, paid: 8500 },
  { day: 'Wed', organic: 3800, paid: 4800 },
  { day: 'Thu', organic: 4500, paid: 4200 },
  { day: 'Fri', organic: 3200, paid: 4600 },
  { day: 'Sat', organic: 2800, paid: 4800 },
  { day: 'Sun', organic: 2400, paid: 5200 },
]

// Mock data for pipeline funnel
const funnelData = [
  { stage: 'Visitors', value: 145000, maxValue: 145000 },
  { stage: 'Leads', value: 4930, maxValue: 145000 },
  { stage: 'MQL', value: 480, maxValue: 145000 },
  { stage: 'SQL', value: 192, maxValue: 145000 },
  { stage: 'Opp', value: 77, maxValue: 145000 },
  { stage: 'Customers', value: 31, maxValue: 145000 },
]

function MarketingDashboard() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Marketing Command Center</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time performance of campaigns, channels, and funnel.</p>
        </div>
        <Button variant="outline" className="text-gray-600">
          Last 30 Days
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.id} className="bg-white border-gray-200 py-0">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${kpi.iconBg}`}>
                      <Icon size={20} className={kpi.iconColor} strokeWidth={1.5} />
                    </div>
                    <div
                      className="flex items-center gap-1 text-sm font-medium text-emerald-500"
                    >
                      <TrendingUp size={14} />
                      <span>{kpi.change}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-gray-500 text-xs font-medium">
                    {kpi.title}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {kpi.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Sources Chart */}
        <Card className="lg:col-span-2 bg-white border-gray-200 py-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Traffic Sources (Organic vs Paid)</h2>
            </div>
            <div className="h-72">
              {isClient ? (
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Loading chart...
                    </div>
                  }
                >
                  <TrafficSourcesChart data={trafficChartData} />
                </Suspense>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Loading chart...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Funnel */}
        <Card className="bg-white border-gray-200 py-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Pipeline Funnel</h2>
            </div>
            <div className="h-72">
              {isClient ? (
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Loading chart...
                    </div>
                  }
                >
                  <PipelineFunnelChart data={funnelData} />
                </Suspense>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Loading chart...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}






