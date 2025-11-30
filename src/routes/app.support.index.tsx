import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, lazy, Suspense } from 'react'
import {
  Monitor,
  Clock,
  CheckCircle,
  UserCircle,
  AlertCircle,
  TrendingUp,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const TicketVolumeChart = lazy(() =>
  import('@/components/TicketVolumeChart').then((mod) => ({
    default: mod.TicketVolumeChart,
  }))
)

export const Route = createFileRoute('/app/support/')({
  component: SupportOverview,
})

// Mock data for KPI cards
const kpiData = [
  {
    id: 'ticket-volume',
    title: 'Active Ticket Volume',
    value: '42',
    change: '+10%',
    trend: 'up',
    icon: Monitor,
    iconColor: 'text-slate-600',
  },
  {
    id: 'first-response',
    title: 'Avg First Response',
    value: '12m',
    change: '-2m',
    trend: 'up',
    icon: Clock,
    iconColor: 'text-amber-500',
  },
  {
    id: 'csat',
    title: 'CSAT Score',
    value: '4.8/5',
    change: '+0.1',
    trend: 'up',
    icon: CheckCircle,
    iconColor: 'text-green-500',
  },
  {
    id: 'ai-resolution',
    title: 'AI Resolution Rate',
    value: '35%',
    change: '+5%',
    trend: 'up',
    icon: UserCircle,
    iconColor: 'text-slate-600',
  },
]

// Mock data for ticket volume chart
const ticketVolumeData = [
  { day: 'Mon', chat: 80, email: 35 },
  { day: 'Tue', chat: 65, email: 70 },
  { day: 'Wed', chat: 85, email: 50 },
  { day: 'Thu', chat: 95, email: 60 },
  { day: 'Fri', chat: 70, email: 45 },
  { day: 'Sat', chat: 30, email: 20 },
  { day: 'Sun', chat: 25, email: 15 },
]

// Mock data for live issues
const liveIssues = [
  {
    id: 'billing',
    title: 'Billing Service Latency',
    description: 'High number of failing API calls detected in US-East.',
    severity: 'critical',
    action: 'View Status',
  },
  {
    id: 'sla',
    title: 'SLA Warning',
    description: '5 Enterprise tickets approaching breach time.',
    severity: 'warning',
    action: 'View Queue',
  },
]

function SupportOverview() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Support Overview</h1>
          <p className="text-gray-500 text-sm mt-1">
            Real-time insights into ticket volume and agent performance.
          </p>
        </div>
        <Button variant="outline" className="text-gray-600">
          Last 7 Days
          <ChevronDown size={16} className="ml-1" />
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
                    <div className={`${kpi.iconColor}`}>
                      <Icon size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                        {kpi.title}
                      </p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {kpi.value}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm font-medium ${
                      kpi.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    <TrendingUp size={14} />
                    <span>{kpi.change}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart and Live Issues Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Volume Chart */}
        <Card className="lg:col-span-2 bg-white border-gray-200 py-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Ticket Volume</h2>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-gray-600">Chat</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-gray-600">Email</span>
                </div>
              </div>
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
                  <TicketVolumeChart data={ticketVolumeData} />
                </Suspense>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Loading chart...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Issues */}
        <Card className="bg-white border-gray-200 py-0">
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Issues</h2>
            <div className="space-y-3">
              {liveIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 rounded-lg border ${
                    issue.severity === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={20}
                      className={
                        issue.severity === 'critical'
                          ? 'text-red-500 mt-0.5'
                          : 'text-amber-500 mt-0.5'
                      }
                    />
                    <div className="flex-1">
                      <h3
                        className={`font-medium ${
                          issue.severity === 'critical'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {issue.title}
                      </h3>
                      <p
                        className={`text-sm mt-1 ${
                          issue.severity === 'critical'
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {issue.description}
                      </p>
                      <button
                        className={`mt-3 px-3 py-1.5 text-sm font-medium rounded border transition-colors ${
                          issue.severity === 'critical'
                            ? 'text-red-600 border-red-300 hover:bg-red-100'
                            : 'text-amber-600 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {issue.action}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

