import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OrganizationHeader } from '@/components/OrganizationHeader'
import { OrganizationMetrics } from '@/components/OrganizationMetrics'
import { OrganizationInvoiceHistory } from '@/components/OrganizationInvoiceHistory'
import { OrganizationCustomProperties } from '@/components/OrganizationCustomProperties'
import { CRMContactsList } from '@/components/CRMContactsList'
import { CRMActivityTimeline } from '@/components/CRMActivityTimeline'
import { CreateCustomerDialog } from '@/components/CreateCustomerDialog'
import { CreateContactDialog } from '@/components/CreateContactDialog'
import { CreateStandaloneInvoiceDialog } from '@/components/CreateStandaloneInvoiceDialog'

export const Route = createFileRoute('/$tenant/app/sales/crm/$customerId')({
  component: OrganizationDetailPage,
})

interface Contact {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  title: string | null
  role: string
  isOwner: boolean
  status: string
  lastActivityAt: string | null
  notes: string | null
  createdAt: string
}

interface Subscription {
  id: string
  subscriptionNumber: string
  productPlanId: string
  planName: string
  status: string
  billingCycle: string
  seats: number
  mrr: number
  currentPeriodStart: string
  currentPeriodEnd: string
  createdAt: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  subtotal: number
  tax: number
  total: number
  currency: string
  issueDate: string
  dueDate: string
  paidAt: string | null
  subscriptionId: string
  createdAt: string
}

interface Deal {
  id: string
  name: string
  value: number
  stageId: string
  stageName: string
  stageColor: string
  assignedToUserId: string | null
  badges: string[]
  nextTask: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface Activity {
  id: string
  dealId: string
  activityType: string
  description: string
  userId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface Customer {
  id: string
  name: string
  slug: string
  logo: string | null
  industry: string | null
  website: string | null
  billingEmail: string | null
  billingAddress: string | null
  assignedToUserId: string | null
  importance: string | null
  tags: string[]
  notes: string | null
  metadata: Record<string, unknown>
  subscriptionPlan: string | null
  subscriptionStatus: string | null
  createdAt: string
  updatedAt: string
}

interface OrganizationData {
  customer: Customer
  subscriptions: Subscription[]
  contacts: Contact[]
  invoices: Invoice[]
  deals: Deal[]
  activities: Activity[]
  metrics: {
    totalMRR: number
    totalDealValue: number
    contactCount: number
    dealCount: number
    invoiceCount: number
  }
}

function OrganizationDetailPage() {
  const { tenant, customerId } = useParams({
    from: '/$tenant/app/sales/crm/$customerId'
  })

  const [data, setData] = useState<OrganizationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'invoices' | 'deals' | 'activity' | 'properties'>('overview')
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false)
  const [isCreateInvoiceDialogOpen, setIsCreateInvoiceDialogOpen] = useState(false)

  // Fetch organization data
  const fetchOrganization = useCallback(async () => {
    if (!tenant || !customerId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const url = `/api/tenant/${tenant}/crm/customers/${customerId}`
      const response = await fetch(url)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch organization data')
      }

      setData(result)
    } catch (err) {
      console.error('Error fetching organization:', err)
      setError(err instanceof Error ? err.message : 'Failed to load organization')
    } finally {
      setIsLoading(false)
    }
  }, [tenant, customerId])

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  const handleMetadataUpdate = async (newMetadata: Record<string, unknown>) => {
    if (!tenant || !customerId) return

    try {
      const response = await fetch(`/api/tenant/${tenant}/crm/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: newMetadata }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update custom properties')
      }

      // Update local data
      if (data) {
        setData({
          ...data,
          customer: {
            ...data.customer,
            metadata: newMetadata,
          },
        })
      }
    } catch (err) {
      console.error('Error updating metadata:', err)
      alert(err instanceof Error ? err.message : 'Failed to update custom properties')
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link to={`/${tenant}/app/sales/crm`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to CRM
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading organization...</div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link to={`/${tenant}/app/sales/crm`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to CRM
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">{error || 'Organization not found'}</div>
        </div>
      </div>
    )
  }

  const { customer, subscriptions, contacts, invoices, deals, activities, metrics } = data

  // Get active subscription
  const activeSubscription = subscriptions.find(s => s.status === 'active')

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2">
        <Link to={`/${tenant}/app/sales/crm`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to CRM
          </Button>
        </Link>
      </div>

      {/* Organization Header */}
      <OrganizationHeader
        customer={customer}
        subscription={activeSubscription || null}
        onEdit={() => setIsEditDialogOpen(true)}
        onAddContact={() => setIsAddContactDialogOpen(true)}
        onCreateInvoice={() => setIsCreateInvoiceDialogOpen(true)}
      />

      {/* Metrics Cards */}
      <OrganizationMetrics metrics={metrics} />

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'contacts'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Contacts ({contacts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invoices'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Invoices ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deals')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'deals'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Deals ({deals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activity'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Activity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('properties')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'properties'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Custom Properties
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Subscription Info */}
              {activeSubscription && (
                <div className="bg-card rounded-lg border p-6">
                  <h2 className="text-lg font-semibold mb-4">Current Subscription</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Plan</div>
                      <div className="font-medium">{activeSubscription.planName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Billing Cycle</div>
                      <div className="font-medium capitalize">{activeSubscription.billingCycle}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Seats</div>
                      <div className="font-medium">{activeSubscription.seats}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">MRR</div>
                      <div className="font-medium">${(activeSubscription.mrr / 100).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Current Period</div>
                      <div className="font-medium text-sm">
                        {new Date(activeSubscription.currentPeriodStart).toLocaleDateString()} - {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {customer.notes && (
                <div className="bg-card rounded-lg border p-6">
                  <h2 className="text-lg font-semibold mb-4">Notes</h2>
                  <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
                </div>
              )}

              {/* Recent Activity */}
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                <CRMActivityTimeline activities={activities.slice(0, 10)} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Details */}
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Details</h2>
                <div className="space-y-3">
                  {customer.industry && (
                    <div>
                      <div className="text-sm text-muted-foreground">Industry</div>
                      <div className="font-medium">{customer.industry}</div>
                    </div>
                  )}
                  {customer.website && (
                    <div>
                      <div className="text-sm text-muted-foreground">Website</div>
                      <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {customer.website}
                      </a>
                    </div>
                  )}
                  {customer.billingEmail && (
                    <div>
                      <div className="text-sm text-muted-foreground">Billing Email</div>
                      <div className="font-medium">{customer.billingEmail}</div>
                    </div>
                  )}
                  {customer.billingAddress && (
                    <div>
                      <div className="text-sm text-muted-foreground">Billing Address</div>
                      <div className="font-medium whitespace-pre-wrap">{customer.billingAddress}</div>
                    </div>
                  )}
                  {customer.tags.length > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Tags</div>
                      <div className="flex flex-wrap gap-2">
                        {customer.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="bg-card rounded-lg border">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Contacts</h2>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
            <CRMContactsList
              contacts={contacts.map(c => ({
                ...c,
                customer: {
                  id: customer.id,
                  name: customer.name,
                  slug: customer.slug,
                  industry: customer.industry,
                },
                updatedAt: c.createdAt,
              }))}
              selectedIds={selectedContactIds}
              onSelectionChange={setSelectedContactIds}
              showCustomer={false}
            />
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="bg-card rounded-lg border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Invoice History</h2>
            </div>
            <OrganizationInvoiceHistory invoices={invoices} />
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="bg-card rounded-lg border">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Deals</h2>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Deal
              </Button>
            </div>
            <div className="p-6">
              {deals.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No deals found for this organization
                </div>
              ) : (
                <div className="space-y-4">
                  {deals.map((deal) => (
                    <div key={deal.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{deal.name}</h3>
                        <div className="text-lg font-bold">${(deal.value / 100).toFixed(2)}</div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium`} style={{ backgroundColor: `${deal.stageColor}20`, color: deal.stageColor }}>
                          {deal.stageName}
                        </span>
                        {deal.badges.map((badge) => (
                          <span key={badge} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {badge}
                          </span>
                        ))}
                      </div>
                      {deal.nextTask && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Next: </span>
                          {deal.nextTask}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-card rounded-lg border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Activity Timeline</h2>
            </div>
            <div className="p-6">
              <CRMActivityTimeline activities={activities} />
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="bg-card rounded-lg border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Custom Properties</h2>
            </div>
            <OrganizationCustomProperties
              metadata={customer.metadata}
              onUpdate={handleMetadataUpdate}
            />
          </div>
        )}
      </div>

      {/* Edit Customer Dialog */}
      <CreateCustomerDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onCustomerCreated={fetchOrganization}
        customerId={customerId}
      />

      {/* Add Contact Dialog */}
      <CreateContactDialog
        open={isAddContactDialogOpen}
        onOpenChange={setIsAddContactDialogOpen}
        onContactCreated={fetchOrganization}
        customerId={customerId}
        customerName={customer.name}
      />

      {/* Create Standalone Invoice Dialog */}
      <CreateStandaloneInvoiceDialog
        open={isCreateInvoiceDialogOpen}
        onOpenChange={setIsCreateInvoiceDialogOpen}
        onInvoiceCreated={fetchOrganization}
        customerId={customerId}
        customerName={customer.name}
      />
    </div>
  )
}
