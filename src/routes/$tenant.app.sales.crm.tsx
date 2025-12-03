import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CRMSegments } from '@/components/CRMSegments'
import { CRMFilters, type CRMFiltersState } from '@/components/CRMFilters'
import { CRMBulkActions } from '@/components/CRMBulkActions'
import { CRMCustomerTable, type CRMCustomer } from '@/components/CRMCustomerTable'

export const Route = createFileRoute('/$tenant/app/sales/crm')({
  component: CRMPage,
})

// Mock data for customers
const mockCustomers: CRMCustomer[] = [
  {
    id: 'cust-1',
    name: 'Acme Corporation',
    industry: 'Technology',
    website: 'https://acme.com',
    status: 'customer',
    subscriptionStatus: 'active',
    subscriptionPlan: 'Enterprise',
    realizedValue: 450000,
    potentialValue: 120000,
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    dealCount: 3,
    contactCount: 8,
    assignedTo: { id: 'user-1', name: 'John Smith' },
    tags: ['enterprise', 'high-value'],
    activities: [
      { id: 'a1', type: 'deal_won', description: 'Closed Enterprise License deal for $120,000', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), userName: 'John Smith' },
      { id: 'a2', type: 'meeting', description: 'Quarterly business review scheduled', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), userName: 'Sarah Jones' },
      { id: 'a3', type: 'note', description: 'Interested in API access tier upgrade', timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), userName: 'John Smith' },
    ],
  },
  {
    id: 'cust-2',
    name: 'TechFlow Solutions',
    industry: 'Technology',
    website: 'https://techflow.io',
    status: 'customer',
    subscriptionStatus: 'active',
    subscriptionPlan: 'Pro',
    realizedValue: 85000,
    potentialValue: 25000,
    lastActivity: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    dealCount: 2,
    contactCount: 4,
    assignedTo: { id: 'user-2', name: 'Mike Ross' },
    tags: ['growth'],
    activities: [
      { id: 'a4', type: 'deal_created', description: 'New Pro Plan Upgrade opportunity created', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), userName: 'Mike Ross' },
    ],
  },
  {
    id: 'cust-3',
    name: 'Global Finance Group',
    industry: 'Finance',
    website: 'https://globalfinance.com',
    status: 'customer',
    subscriptionStatus: 'active',
    subscriptionPlan: 'Enterprise',
    realizedValue: 320000,
    potentialValue: 85000,
    lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    dealCount: 4,
    contactCount: 12,
    assignedTo: { id: 'user-1', name: 'John Smith' },
    tags: ['enterprise', 'finance'],
    activities: [
      { id: 'a5', type: 'contact_added', description: 'Added new contact: CFO Emily Chen', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), userName: 'John Smith' },
    ],
  },
  {
    id: 'cust-4',
    name: 'HealthCare Plus',
    industry: 'Healthcare',
    website: 'https://healthcareplus.org',
    status: 'customer',
    subscriptionStatus: 'trialing',
    subscriptionPlan: 'Pro',
    realizedValue: 0,
    potentialValue: 150000,
    lastActivity: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    dealCount: 1,
    contactCount: 3,
    assignedTo: { id: 'user-3', name: 'Emily Blunt' },
    tags: ['trial', 'healthcare'],
    activities: [
      { id: 'a6', type: 'deal_created', description: 'Enterprise trial started', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), userName: 'Emily Blunt' },
    ],
  },
  {
    id: 'cust-5',
    name: 'StartUp Innovations',
    industry: 'Technology',
    website: 'https://startupinnovations.co',
    status: 'prospect',
    realizedValue: 0,
    potentialValue: 45000,
    lastActivity: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    dealCount: 1,
    contactCount: 2,
    assignedTo: { id: 'user-2', name: 'Mike Ross' },
    tags: ['startup', 'prospect'],
    activities: [
      { id: 'a7', type: 'meeting', description: 'Discovery call completed', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), userName: 'Mike Ross' },
    ],
  },
  {
    id: 'cust-6',
    name: 'DataMinds Analytics',
    industry: 'Technology',
    website: 'https://dataminds.ai',
    status: 'prospect',
    realizedValue: 0,
    potentialValue: 75000,
    lastActivity: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    dealCount: 1,
    contactCount: 1,
    tags: ['ai', 'prospect'],
    activities: [
      { id: 'a8', type: 'note', description: 'Evaluating competitors, need follow-up demo', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), userName: 'Sarah Jones' },
    ],
  },
  {
    id: 'cust-7',
    name: 'RetailMax Inc',
    industry: 'Retail',
    website: 'https://retailmax.com',
    status: 'customer',
    subscriptionStatus: 'canceled',
    subscriptionPlan: 'Starter',
    realizedValue: 15000,
    potentialValue: 0,
    lastActivity: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    dealCount: 1,
    contactCount: 2,
    tags: ['churned'],
    activities: [
      { id: 'a9', type: 'deal_lost', description: 'Subscription canceled - budget constraints', timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), userName: 'John Smith' },
    ],
  },
  {
    id: 'cust-8',
    name: 'EduTech Learning',
    industry: 'Education',
    website: 'https://edutech.edu',
    status: 'prospect',
    realizedValue: 0,
    potentialValue: 200000,
    lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dealCount: 2,
    contactCount: 5,
    assignedTo: { id: 'user-3', name: 'Emily Blunt' },
    tags: ['education', 'high-potential'],
    activities: [
      { id: 'a10', type: 'deal_created', description: 'Campus-wide license opportunity', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), userName: 'Emily Blunt' },
    ],
  },
  {
    id: 'cust-9',
    name: 'Manufacturing Pro',
    industry: 'Manufacturing',
    website: 'https://mfgpro.com',
    status: 'customer',
    subscriptionStatus: 'past_due',
    subscriptionPlan: 'Pro',
    realizedValue: 48000,
    potentialValue: 0,
    lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    dealCount: 1,
    contactCount: 3,
    assignedTo: { id: 'user-1', name: 'John Smith' },
    tags: ['at-risk'],
    activities: [
      { id: 'a11', type: 'note', description: 'Payment failed, need to follow up on billing', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), userName: 'John Smith' },
    ],
  },
  {
    id: 'cust-10',
    name: 'Legal Eagles LLP',
    industry: 'Legal',
    website: 'https://legaleagles.law',
    status: 'customer',
    subscriptionStatus: 'active',
    subscriptionPlan: 'Enterprise',
    realizedValue: 180000,
    potentialValue: 50000,
    lastActivity: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    dealCount: 2,
    contactCount: 6,
    assignedTo: { id: 'user-2', name: 'Mike Ross' },
    tags: ['legal', 'enterprise'],
    activities: [
      { id: 'a12', type: 'meeting', description: 'Expansion discussion - 2 new offices', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), userName: 'Mike Ross' },
    ],
  },
  {
    id: 'cust-11',
    name: 'CloudNine Services',
    industry: 'Technology',
    website: 'https://cloudnine.services',
    status: 'inactive',
    realizedValue: 25000,
    potentialValue: 0,
    lastActivity: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    dealCount: 1,
    contactCount: 1,
    tags: ['inactive'],
    activities: [],
  },
  {
    id: 'cust-12',
    name: 'Green Energy Corp',
    industry: 'Energy',
    website: 'https://greenenergy.co',
    status: 'prospect',
    realizedValue: 0,
    potentialValue: 350000,
    lastActivity: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    dealCount: 1,
    contactCount: 4,
    assignedTo: { id: 'user-1', name: 'John Smith' },
    tags: ['green', 'high-potential', 'enterprise'],
    activities: [
      { id: 'a13', type: 'deal_created', description: 'Enterprise sustainability platform deal', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), userName: 'John Smith' },
      { id: 'a14', type: 'contact_added', description: 'Added VP of Operations to contacts', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), userName: 'John Smith' },
    ],
  },
]

const industries = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Education', 'Manufacturing', 'Legal', 'Energy']

function CRMPage() {
  const [activeSegment, setActiveSegment] = useState('all')
  const [filters, setFilters] = useState<CRMFiltersState>({
    search: '',
    industry: '',
    status: '',
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Segment counts
  const segmentCounts = useMemo(() => {
    const all = mockCustomers.length
    const customers = mockCustomers.filter(
      (c) => c.status === 'customer' && c.subscriptionStatus === 'active'
    ).length
    const prospects = mockCustomers.filter((c) => c.status === 'prospect').length
    const inactive = mockCustomers.filter(
      (c) => c.status === 'inactive' || c.subscriptionStatus === 'canceled'
    ).length
    return { all, customers, prospects, inactive }
  }, [])

  const segments = [
    { id: 'all', label: 'All', count: segmentCounts.all },
    { id: 'customers', label: 'Current Customers', count: segmentCounts.customers },
    { id: 'prospects', label: 'Prospects', count: segmentCounts.prospects },
    { id: 'inactive', label: 'Inactive', count: segmentCounts.inactive },
  ]

  // Filter customers based on segment and filters
  const filteredCustomers = useMemo(() => {
    let result = [...mockCustomers]

    // Apply segment filter
    if (activeSegment === 'customers') {
      result = result.filter(
        (c) => c.status === 'customer' && c.subscriptionStatus === 'active'
      )
    } else if (activeSegment === 'prospects') {
      result = result.filter((c) => c.status === 'prospect')
    } else if (activeSegment === 'inactive') {
      result = result.filter(
        (c) => c.status === 'inactive' || c.subscriptionStatus === 'canceled'
      )
    }

    // Apply search filter
    if (filters.search) {
      const search = filters.search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.industry.toLowerCase().includes(search) ||
          c.tags?.some((t) => t.toLowerCase().includes(search))
      )
    }

    // Apply industry filter
    if (filters.industry) {
      result = result.filter((c) => c.industry === filters.industry)
    }

    // Apply status filter
    if (filters.status) {
      result = result.filter((c) => c.subscriptionStatus === filters.status)
    }

    return result
  }, [activeSegment, filters])

  // Calculate totals
  const totals = useMemo(() => {
    const realizedValue = filteredCustomers.reduce((sum, c) => sum + c.realizedValue, 0)
    const potentialValue = filteredCustomers.reduce((sum, c) => sum + c.potentialValue, 0)
    return { realizedValue, potentialValue }
  }, [filteredCustomers])

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value.toLocaleString()}`
  }

  const handleExportAll = () => {
    console.log('Export all customers')
    // TODO: Implement CSV export
  }

  const handleBulkTag = () => {
    console.log('Tag selected:', selectedIds)
  }

  const handleBulkAssign = () => {
    console.log('Assign selected:', selectedIds)
  }

  const handleBulkExport = () => {
    console.log('Export selected:', selectedIds)
  }

  const handleBulkDelete = () => {
    console.log('Delete selected:', selectedIds)
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">CRM</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage customers and prospects with realized and potential value tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExportAll}>
            <Download size={18} className="mr-1" />
            Export
          </Button>
          <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
            <Plus size={18} className="mr-1" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Customers</p>
          <p className="text-2xl font-semibold text-gray-900">{filteredCustomers.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Realized Value</p>
          <p className="text-2xl font-semibold text-emerald-600">
            {formatCurrency(totals.realizedValue)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Potential Value</p>
          <p className="text-2xl font-semibold text-blue-600">
            {formatCurrency(totals.potentialValue)}
          </p>
        </div>
      </div>

      {/* Segments */}
      <div className="bg-white rounded-lg border border-gray-200 mb-4">
        <CRMSegments
          segments={segments}
          activeSegment={activeSegment}
          onSegmentChange={setActiveSegment}
        />
      </div>

      {/* Filters */}
      <CRMFilters
        filters={filters}
        onFiltersChange={setFilters}
        industries={industries}
      />

      {/* Bulk Actions */}
      <CRMBulkActions
        selectedCount={selectedIds.length}
        onTag={handleBulkTag}
        onAssign={handleBulkAssign}
        onExport={handleBulkExport}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Customer Table */}
      <CRMCustomerTable
        customers={filteredCustomers}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </main>
  )
}

