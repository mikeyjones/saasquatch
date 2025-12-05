import { createFileRoute } from '@tanstack/react-router'
import {
  Filter,
  Target,
  Users,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/$tenant/app/marketing/audiences')({
  component: AudiencesPage,
})

interface Segment {
  id: string
  name: string
  users: number
  criteria: string
  lastSync: string
}

// Mock segments data
const mockSegments: Segment[] = [
  {
    id: 'seg-1',
    name: 'Active Trial Users',
    users: 1450,
    criteria: 'Plan=Trial AND Status=Active',
    lastSync: '1h ago',
  },
  {
    id: 'seg-2',
    name: 'Enterprise Opportunities',
    users: 85,
    criteria: 'Deal_Stage=Negotiation AND Size>500',
    lastSync: '4h ago',
  },
  {
    id: 'seg-3',
    name: 'Churn Risk (High Usage Drop)',
    users: 210,
    criteria: 'Usage_Drop > 50% AND Last_Login > 7d',
    lastSync: '2h ago',
  },
  {
    id: 'seg-4',
    name: 'Power Users',
    users: 890,
    criteria: 'Login_Frequency > 5/week AND Feature_Usage > 80%',
    lastSync: '30m ago',
  },
  {
    id: 'seg-5',
    name: 'Upsell Candidates',
    users: 320,
    criteria: 'Plan=Pro AND Usage > 90% AND Tenure > 6mo',
    lastSync: '3h ago',
  },
  {
    id: 'seg-6',
    name: 'Inactive Accounts',
    users: 145,
    criteria: 'Last_Login > 30d AND Status=Active',
    lastSync: '6h ago',
  },
]

function AudiencesPage() {
  const handleSync = (segment: Segment) => {
    console.log('Sync segment:', segment.name)
  }

  const formatNumber = (value: number): string => {
    if (value >= 1000) {
      return value.toLocaleString()
    }
    return value.toString()
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audiences & Segmentation</h1>
          <p className="text-gray-500 text-sm mt-1">
            Define and manage customer segments.
          </p>
        </div>
        <Button className="bg-rose-500 hover:bg-rose-600 text-white">
          <Filter size={18} className="mr-1" />
          New Segment
        </Button>
      </div>

      {/* Segments Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Segment Name
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Users
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Criteria
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Sync
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {mockSegments.map((segment) => (
              <tr
                key={segment.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                      <Target size={16} className="text-rose-500" />
                    </div>
                    <span className="font-medium text-gray-900">{segment.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users size={16} className="text-gray-400" />
                    <span>{formatNumber(segment.users)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded font-mono">
                    {segment.criteria}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">{segment.lastSync}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleSync(segment)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RefreshCw size={18} className="text-gray-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {mockSegments.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">No segments defined yet.</p>
          </div>
        )}
      </div>
    </main>
  )
}




