import { DollarSign, TrendingUp, Users, Briefcase, FileText } from 'lucide-react'

interface Metrics {
  totalMRR: number
  lifetimeIncome: number
  contactCount: number
  dealCount: number
  invoiceCount: number
}

interface OrganizationMetricsProps {
  metrics: Metrics
}

export function OrganizationMetrics({ metrics }: OrganizationMetricsProps) {
  const cards = [
    {
      title: 'Monthly Recurring Revenue',
      value: `$${(metrics.totalMRR / 100).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Lifetime Income',
      value: `$${(metrics.lifetimeIncome / 100).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Contacts',
      value: metrics.contactCount.toString(),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Deals',
      value: metrics.dealCount.toString(),
      icon: Briefcase,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Invoices',
      value: metrics.invoiceCount.toString(),
      icon: FileText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.title} className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold mb-1">{card.value}</div>
            <div className="text-sm text-muted-foreground">{card.title}</div>
          </div>
        )
      })}
    </div>
  )
}
