import {
  DollarSign,
  UserPlus,
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

export interface Activity {
  id: string
  type: 'deal_created' | 'deal_won' | 'deal_lost' | 'contact_added' | 'note' | 'meeting'
  description: string
  timestamp: string
  userId?: string
  userName?: string
}

interface CRMActivityTimelineProps {
  activities: Activity[]
}

const activityIcons = {
  deal_created: DollarSign,
  deal_won: TrendingUp,
  deal_lost: TrendingDown,
  contact_added: UserPlus,
  note: FileText,
  meeting: Calendar,
}

const activityColors = {
  deal_created: 'bg-blue-100 text-blue-600',
  deal_won: 'bg-emerald-100 text-emerald-600',
  deal_lost: 'bg-red-100 text-red-600',
  contact_added: 'bg-purple-100 text-purple-600',
  note: 'bg-gray-100 text-gray-600',
  meeting: 'bg-amber-100 text-amber-600',
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) {
    return `${diffMins}m ago`
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }
  return date.toLocaleDateString()
}

export function CRMActivityTimeline({ activities }: CRMActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No recent activity
      </div>
    )
  }

  return (
    <div className="space-y-3 py-2">
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.type]
        const colorClass = activityColors[activity.type]

        return (
          <div key={activity.id} className="flex items-start gap-3">
            {/* Timeline line */}
            <div className="relative flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                <Icon size={16} />
              </div>
              {index < activities.length - 1 && (
                <div className="w-px h-full bg-gray-200 absolute top-8 left-1/2 -translate-x-1/2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-3">
              <p className="text-sm text-gray-900">{activity.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(activity.timestamp)}
                </span>
                {activity.userName && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-500">
                      by {activity.userName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}



