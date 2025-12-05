import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Copy,
  Archive,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const Route = createFileRoute('/$tenant/app/marketing/campaigns')({
  component: CampaignsPage,
})

type CampaignStatus = 'active' | 'scheduled' | 'draft' | 'completed'

interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  startDate: string
  endDate: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  roi: number
}

// Mock campaigns data
const mockCampaigns: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Summer Sale 2024',
    status: 'active',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    impressions: 2450000,
    clicks: 89500,
    conversions: 4280,
    spend: 45000,
    roi: 3.8,
  },
  {
    id: 'camp-2',
    name: 'Product Launch - Enterprise Suite',
    status: 'active',
    startDate: '2024-07-15',
    endDate: '2024-09-15',
    impressions: 1850000,
    clicks: 72000,
    conversions: 3150,
    spend: 62000,
    roi: 4.2,
  },
  {
    id: 'camp-3',
    name: 'Q4 Brand Awareness',
    status: 'scheduled',
    startDate: '2024-10-01',
    endDate: '2024-12-31',
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
    roi: 0,
  },
  {
    id: 'camp-4',
    name: 'Email Newsletter - August',
    status: 'completed',
    startDate: '2024-08-01',
    endDate: '2024-08-31',
    impressions: 520000,
    clicks: 28400,
    conversions: 1850,
    spend: 8500,
    roi: 5.2,
  },
  {
    id: 'camp-5',
    name: 'Black Friday Prep',
    status: 'draft',
    startDate: '2024-11-20',
    endDate: '2024-11-30',
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
    roi: 0,
  },
  {
    id: 'camp-6',
    name: 'Webinar Series Promotion',
    status: 'active',
    startDate: '2024-07-01',
    endDate: '2024-09-30',
    impressions: 890000,
    clicks: 45200,
    conversions: 2100,
    spend: 28000,
    roi: 3.5,
  },
  {
    id: 'camp-7',
    name: 'Partner Co-Marketing',
    status: 'completed',
    startDate: '2024-05-01',
    endDate: '2024-06-30',
    impressions: 1200000,
    clicks: 56000,
    conversions: 2800,
    spend: 35000,
    roi: 4.0,
  },
  {
    id: 'camp-8',
    name: 'Holiday Season Campaign',
    status: 'scheduled',
    startDate: '2024-12-01',
    endDate: '2024-12-25',
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
    roi: 0,
  },
  {
    id: 'camp-9',
    name: 'LinkedIn Ads - B2B',
    status: 'active',
    startDate: '2024-06-15',
    endDate: '2024-12-31',
    impressions: 680000,
    clicks: 18900,
    conversions: 890,
    spend: 42000,
    roi: 2.8,
  },
  {
    id: 'camp-10',
    name: 'Referral Program Launch',
    status: 'draft',
    startDate: '2024-09-01',
    endDate: '2024-11-30',
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
    roi: 0,
  },
]

const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'draft', label: 'Draft' },
  { id: 'completed', label: 'Completed' },
]

const statusStyles: Record<CampaignStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-blue-100 text-blue-700',
  draft: 'bg-gray-100 text-gray-600',
  completed: 'bg-violet-100 text-violet-700',
}

function CampaignsPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCampaigns = useMemo(() => {
    let result = [...mockCampaigns]

    // Apply status filter
    if (activeFilter !== 'all') {
      result = result.filter((c) => c.status === activeFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((c) => c.name.toLowerCase().includes(query))
    }

    return result
  }, [activeFilter, searchQuery])

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = mockCampaigns.length
    const active = mockCampaigns.filter((c) => c.status === 'active').length
    const totalSpend = mockCampaigns.reduce((sum, c) => sum + c.spend, 0)
    const totalConversions = mockCampaigns.reduce((sum, c) => sum + c.conversions, 0)
    return { total, active, totalSpend, totalConversions }
  }, [])

  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toLocaleString()
  }

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value.toLocaleString()}`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleEdit = (campaign: Campaign) => {
    console.log('Edit campaign:', campaign.id)
  }

  const handleDuplicate = (campaign: Campaign) => {
    console.log('Duplicate campaign:', campaign.id)
  }

  const handleArchive = (campaign: Campaign) => {
    console.log('Archive campaign:', campaign.id)
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create, manage, and track the performance of your marketing campaigns.
          </p>
        </div>
        <Button className="bg-rose-500 hover:bg-rose-600 text-white">
          <Plus size={18} className="mr-1" />
          New Campaign
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Campaigns</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active Campaigns</p>
          <p className="text-2xl font-semibold text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Spend</p>
          <p className="text-2xl font-semibold text-rose-600">{formatCurrency(stats.totalSpend)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Conversions</p>
          <p className="text-2xl font-semibold text-blue-600">{formatNumber(stats.totalConversions)}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200"
            />
          </div>
          <div className="flex gap-2">
            {filterOptions.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeFilter === filter.id
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Campaign
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Impressions
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Clicks
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conversions
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Spend
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                ROI
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.map((campaign) => (
              <tr
                key={campaign.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">{campaign.name}</span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full capitalize ${
                      statusStyles[campaign.status]
                    }`}
                  >
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {formatDate(campaign.startDate)}
                  </div>
                  <div className="text-xs text-gray-500">
                    to {formatDate(campaign.endDate)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm text-gray-900">
                    {campaign.impressions > 0 ? formatNumber(campaign.impressions) : '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm text-gray-900">
                    {campaign.clicks > 0 ? formatNumber(campaign.clicks) : '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm text-gray-900">
                    {campaign.conversions > 0 ? formatNumber(campaign.conversions) : '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm text-gray-900">
                    {campaign.spend > 0 ? formatCurrency(campaign.spend) : '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {campaign.roi > 0 ? (
                    <div className="flex items-center justify-end gap-1">
                      {campaign.roi >= 3.5 ? (
                        <TrendingUp size={14} className="text-emerald-500" />
                      ) : (
                        <TrendingDown size={14} className="text-amber-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          campaign.roi >= 3.5 ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {campaign.roi.toFixed(1)}x
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreHorizontal size={18} className="text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(campaign)}>
                        <Edit size={14} className="mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(campaign)}>
                        <Copy size={14} className="mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleArchive(campaign)}
                        className="text-red-600"
                      >
                        <Archive size={14} className="mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCampaigns.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">No campaigns found matching your criteria.</p>
          </div>
        )}
      </div>
    </main>
  )
}



