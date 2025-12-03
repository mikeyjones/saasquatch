import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, DollarSign, MoreHorizontal } from 'lucide-react'

export interface Deal {
  id: string
  name: string
  company: string
  value: number // in cents
  stageId: string
  stage: {
    id: string
    name: string
    order: number
    color: string
  }
  assignedTo: {
    id: string
    name: string
    avatar?: string
  } | null
  lastUpdated: string
  badges: string[]
}

interface DealCardProps {
  deal: Deal
}

export function DealCard({ deal }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatAmount = (amount: number) => {
    // Amount is in cents
    const dollars = amount / 100
    if (dollars >= 1000000) {
      return `$${(dollars / 1000000).toFixed(1)}M`
    }
    if (dollars >= 1000) {
      return `$${Math.floor(dollars / 1000).toLocaleString()}K`
    }
    return `$${dollars.toLocaleString()}`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg border border-gray-200 p-4 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      {/* Company Name & Menu */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {deal.company}
            </span>
            {deal.badges?.map((badge) => (
              <span
                key={badge}
                className="px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-600 rounded-full"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
        <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Description */}
      <h3 className="font-medium text-gray-900 text-sm mb-3">
        {deal.name}
      </h3>

      {/* Amount & Date */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
        <div className="flex items-center gap-1">
          <DollarSign size={14} />
          <span>{formatAmount(deal.value).replace('$', '')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          <span>{deal.lastUpdated}</span>
        </div>
      </div>

      {/* Assigned User */}
      {deal.assignedTo ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center overflow-hidden">
            {deal.assignedTo.avatar ? (
              <img
                src={deal.assignedTo.avatar}
                alt={deal.assignedTo.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-xs font-medium">
                {getInitials(deal.assignedTo.name)}
              </span>
            )}
          </div>
          <span className="text-sm text-gray-600">{deal.assignedTo.name}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-xs">?</span>
          </div>
          <span className="text-sm text-gray-400">Unassigned</span>
        </div>
      )}
    </div>
  )
}
