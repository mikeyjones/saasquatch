import { Package, Calendar, Users, DollarSign, CheckCircle2, XCircle, Clock, Pause } from 'lucide-react'

/**
 * Subscription data for display in ProductSubscriptionsCard.
 */
interface Subscription {
  id: string
  subscriptionNumber: string
  planName: string
  productId: string | null
  productName: string | null
  productStatus: string | null
  status: string
  billingCycle: string
  seats: number
  mrr: number
  currentPeriodStart: string
  currentPeriodEnd: string
  createdAt: string
}

/**
 * Props for the ProductSubscriptionsCard component.
 */
interface ProductSubscriptionsCardProps {
  subscriptions: Subscription[]
}

/**
 * Card component displaying product subscriptions grouped by product.
 * 
 * Shows all subscriptions for a customer organization, grouped by product.
 * Displays product name, plan details, status, MRR, seats, and billing cycle.
 * 
 * @param props - Component props
 * @param props.subscriptions - Array of subscriptions to display
 */
export function ProductSubscriptionsCard({ subscriptions }: ProductSubscriptionsCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'canceled':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'paused':
        return <Pause className="h-4 w-4 text-gray-600" />
      case 'past_due':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'paused':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Group subscriptions by product
  const subscriptionsByProduct = new Map<string | null, Subscription[]>()
  
  subscriptions.forEach(sub => {
    const key = sub.productName || null
    const existing = subscriptionsByProduct.get(key) || []
    existing.push(sub)
    subscriptionsByProduct.set(key, existing)
  })

  if (subscriptions.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="text-center text-muted-foreground py-8">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No subscriptions found for this customer</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Array.from(subscriptionsByProduct.entries()).map(([productName, productSubscriptions]) => (
        <div key={productName || 'no-product'} className="bg-card rounded-lg border overflow-hidden">
          {/* Product Header */}
          <div className="bg-muted/50 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">
                  {productName || 'Uncategorized Plans'}
                </h3>
                {productName && productSubscriptions[0]?.productStatus && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    productSubscriptions[0].productStatus === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {productSubscriptions[0].productStatus}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {productSubscriptions.length} subscription{productSubscriptions.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Subscriptions List */}
          <div className="divide-y">
            {productSubscriptions.map((subscription) => (
              <div key={subscription.id} className="p-6 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-base">{subscription.planName}</h4>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(subscription.status)}`}>
                        {getStatusIcon(subscription.status)}
                        {subscription.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Subscription #{subscription.subscriptionNumber}
                    </div>
                  </div>
                </div>

                {/* Subscription Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">MRR</div>
                      <div className="font-medium">${(subscription.mrr / 100).toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">Seats</div>
                      <div className="font-medium">{subscription.seats}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">Billing Cycle</div>
                      <div className="font-medium capitalize">{subscription.billingCycle}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Current Period</div>
                    <div className="font-medium text-sm">
                      {new Date(subscription.currentPeriodStart).toLocaleDateString()} - {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}


