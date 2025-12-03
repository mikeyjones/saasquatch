import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { PipelineColumn, type PipelineStage } from './PipelineColumn'
import { DealCard, type Deal } from './DealCard'

const stages: PipelineStage[] = [
  {
    id: 'lead',
    name: 'Lead',
    color: 'text-gray-500',
    bgColor: 'bg-gray-400',
    dotColor: 'bg-gray-400',
  },
  {
    id: 'meeting',
    name: 'Meeting',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'negotiation',
    name: 'Negotiation',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'closed_won',
    name: 'Closed Won',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
    dotColor: 'bg-emerald-500',
  },
]

const initialDeals: Deal[] = [
  {
    id: 'deal-1',
    company: 'STARTUP INC',
    description: 'Starter Plan - Annual',
    amount: 5000,
    stage: 'lead',
    assignedTo: {
      id: 'user-1',
      name: 'Sarah Jones',
    },
    lastUpdated: '1 day ago',
  },
  {
    id: 'deal-2',
    company: 'TECHFLOW',
    description: 'Pro Plan Upgrade',
    amount: 25000,
    stage: 'meeting',
    assignedTo: {
      id: 'user-2',
      name: 'Mike Ross',
    },
    lastUpdated: '4 hours ago',
  },
  {
    id: 'deal-3',
    company: 'ACME CORP',
    description: 'Enterprise License - 500 Seats',
    amount: 120000,
    stage: 'negotiation',
    assignedTo: {
      id: 'user-3',
      name: 'John Smith',
    },
    lastUpdated: '2 hours ago',
    badges: ['Hot'],
  },
  {
    id: 'deal-4',
    company: 'DATAMINDS',
    description: 'API Access Tier 3',
    amount: 45000,
    stage: 'negotiation',
    assignedTo: {
      id: 'user-4',
      name: 'David Lee',
    },
    lastUpdated: 'Today',
  },
  {
    id: 'deal-5',
    company: 'GLOBAL LOGISTICS',
    description: 'Custom Integration',
    amount: 85000,
    stage: 'closed_won',
    assignedTo: {
      id: 'user-5',
      name: 'Emily Blunt',
    },
    lastUpdated: '1 week ago',
  },
]

interface PipelineKanbanProps {
  filterUserId?: string
}

export function PipelineKanban({ filterUserId }: PipelineKanbanProps) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals)
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const filteredDeals = filterUserId
    ? deals.filter((deal) => deal.assignedTo.id === filterUserId)
    : deals

  const getDealsByStage = (stageId: string) => {
    return filteredDeals.filter((deal) => deal.stage === stageId)
  }

  const getTotalPotential = (stageId: string) => {
    return getDealsByStage(stageId).reduce((sum, deal) => sum + deal.amount, 0)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const deal = deals.find((d) => d.id === active.id)
    if (deal) {
      setActiveDeal(deal)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find the deal being dragged
    const activeDeal = deals.find((d) => d.id === activeId)
    if (!activeDeal) return

    // Check if we're dropping over a column (stage)
    const overStage = stages.find((s) => s.id === overId)
    if (overStage && activeDeal.stage !== overStage.id) {
      setDeals((prev) =>
        prev.map((deal) =>
          deal.id === activeId ? { ...deal, stage: overStage.id } : deal
        )
      )
      return
    }

    // Check if we're dropping over another deal
    const overDeal = deals.find((d) => d.id === overId)
    if (overDeal && activeDeal.stage !== overDeal.stage) {
      setDeals((prev) =>
        prev.map((deal) =>
          deal.id === activeId ? { ...deal, stage: overDeal.stage } : deal
        )
      )
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveDeal(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find the deal being dragged
    const activeDealData = deals.find((d) => d.id === activeId)
    if (!activeDealData) return

    // Check if dropping over a stage
    const overStage = stages.find((s) => s.id === overId)
    if (overStage) {
      setDeals((prev) =>
        prev.map((deal) =>
          deal.id === activeId ? { ...deal, stage: overStage.id } : deal
        )
      )
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-w-0">
        {stages.map((stage) => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            deals={getDealsByStage(stage.id)}
            totalPotential={getTotalPotential(stage.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <div className="rotate-3 scale-105">
            <DealCard deal={activeDeal} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

