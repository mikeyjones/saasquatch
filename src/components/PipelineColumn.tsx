import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { MoreHorizontal } from 'lucide-react'
import { DealCard, type Deal } from './DealCard'

export interface PipelineStage {
  id: 'lead' | 'meeting' | 'negotiation' | 'closed_won'
  name: string
  color: string
  bgColor: string
  dotColor: string
}

interface PipelineColumnProps {
  stage: PipelineStage
  deals: Deal[]
  totalPotential: number
}

export function PipelineColumn({ stage, deals, totalPotential }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount.toLocaleString()}`
  }

  return (
    <div
      className={`flex flex-col w-[260px] min-w-[260px] flex-shrink-0 rounded-lg bg-gray-50 ${
        isOver ? 'ring-2 ring-indigo-400 ring-opacity-50' : ''
      }`}
    >
      {/* Column Header */}
      <div className="px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
            <span className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
              {stage.name}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {deals.length}
            </span>
          </div>
          <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
        
        {/* Potential Value */}
        <div className="text-xs text-gray-500 mb-2">
          {formatCurrency(totalPotential)} Potential
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${stage.bgColor} rounded-full`}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Deal Cards */}
      <div
        ref={setNodeRef}
        className={`flex-1 px-3 pb-3 overflow-y-auto min-h-[200px] transition-colors ${
          isOver ? 'bg-indigo-50/50' : ''
        }`}
      >
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>
        
        {deals.length === 0 && (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
            Drop deals here
          </div>
        )}
      </div>
    </div>
  )
}

