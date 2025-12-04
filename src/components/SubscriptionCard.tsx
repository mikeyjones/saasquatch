import { CreditCard, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export interface Subscription {
  id: string
  subscriptionId: string
  companyName: string
  status: 'active' | 'trial' | 'past_due'
  plan: string
  mrr: number
  renewsAt: string
}

interface SubscriptionCardProps {
  subscription: Subscription
  onViewUsage?: (subscription: Subscription) => void
  onModifyPlan?: (subscription: Subscription) => void
}

const statusConfig = {
  active: {
    label: 'ACTIVE',
    icon: CheckCircle,
    className: 'bg-emerald-50 text-emerald-600',
  },
  trial: {
    label: 'TRIAL',
    icon: Clock,
    className: 'bg-blue-50 text-blue-600',
  },
  past_due: {
    label: 'PAST DUE',
    icon: AlertTriangle,
    className: 'bg-red-50 text-red-600',
  },
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export function SubscriptionCard({
  subscription,
  onViewUsage,
  onModifyPlan,
}: SubscriptionCardProps) {
  const status = statusConfig[subscription.status]
  const StatusIcon = status.icon

  return (
    <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        {/* Header with company name and status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <CreditCard size={20} className="text-gray-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{subscription.companyName}</h3>
              <p className="text-sm text-gray-500">ID: {subscription.subscriptionId}</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${status.className}`}
          >
            <StatusIcon size={12} />
            {status.label}
          </span>
        </div>

        {/* Subscription details */}
        <div className="space-y-2 mb-5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Plan</span>
            <span className="text-sm font-medium text-gray-900">{subscription.plan}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">MRR</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(subscription.mrr)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Renews</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDate(subscription.renewsAt)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-gray-600 border-gray-200 hover:bg-gray-50"
            onClick={() => onViewUsage?.(subscription)}
          >
            View Usage
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            onClick={() => onModifyPlan?.(subscription)}
          >
            Modify Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


