import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SubscriptionCard, type Subscription } from '@/components/SubscriptionCard'

export const Route = createFileRoute('/$tenant/app/sales/subscriptions')({
  component: SubscriptionsPage,
})

// Mock data matching the screenshot
const mockSubscriptions: Subscription[] = [
  {
    id: '1',
    subscriptionId: 'SUB-992',
    companyName: 'Global Logistics',
    status: 'active',
    plan: 'Enterprise Platform',
    mrr: 7083,
    renewsAt: '2024-11-15',
  },
  {
    id: '2',
    subscriptionId: 'SUB-993',
    companyName: 'StartUp Inc',
    status: 'trial',
    plan: 'Growth Tier',
    mrr: 416,
    renewsAt: '2023-11-01',
  },
  {
    id: '3',
    subscriptionId: 'SUB-994',
    companyName: 'Old Co.',
    status: 'past_due',
    plan: 'Legacy Basic',
    mrr: 100,
    renewsAt: '2023-10-20',
  },
  {
    id: '4',
    subscriptionId: 'SUB-995',
    companyName: 'New Wave',
    status: 'active',
    plan: 'Pro Annual',
    mrr: 2083,
    renewsAt: '2024-12-01',
  },
]

function SubscriptionsPage() {
  const handleViewUsage = (subscription: Subscription) => {
    console.log('View usage for:', subscription.companyName)
  }

  const handleModifyPlan = (subscription: Subscription) => {
    console.log('Modify plan for:', subscription.companyName)
  }

  const handleSyncMeters = () => {
    console.log('Syncing meters...')
  }

  const handleNewSubscription = () => {
    console.log('Creating new subscription...')
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Subscriptions & Usage</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSyncMeters}>
            <RefreshCw size={18} className="mr-1" />
            Sync Meters
          </Button>
          <Button
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
            onClick={handleNewSubscription}
          >
            <Plus size={18} className="mr-1" />
            New Subscription
          </Button>
        </div>
      </div>

      {/* Subscription Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockSubscriptions.map((subscription) => (
          <SubscriptionCard
            key={subscription.id}
            subscription={subscription}
            onViewUsage={handleViewUsage}
            onModifyPlan={handleModifyPlan}
          />
        ))}
      </div>
    </main>
  )
}

