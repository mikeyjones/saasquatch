import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Zap,
  MoreHorizontal,
  Users,
  Pause,
  Play,
  ArrowRight,
  Edit,
  Copy,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const Route = createFileRoute('/$tenant/app/marketing/journeys')({
  component: JourneysPage,
})

type JourneyStatus = 'active' | 'paused'

interface Journey {
  id: string
  name: string
  status: JourneyStatus
  enrolled: number
  steps: number
  completed: number
}

// Mock journeys data
const initialJourneys: Journey[] = [
  {
    id: 'journey-1',
    name: 'New Trial Onboarding',
    status: 'active',
    enrolled: 1450,
    steps: 6,
    completed: 850,
  },
  {
    id: 'journey-2',
    name: 'Churn Risk Reactivation',
    status: 'active',
    enrolled: 320,
    steps: 4,
    completed: 45,
  },
  {
    id: 'journey-3',
    name: 'Enterprise Lead Nurture',
    status: 'paused',
    enrolled: 50,
    steps: 12,
    completed: 0,
  },
  {
    id: 'journey-4',
    name: 'Customer Success Check-in',
    status: 'active',
    enrolled: 2800,
    steps: 3,
    completed: 1920,
  },
  {
    id: 'journey-5',
    name: 'Product Adoption Series',
    status: 'active',
    enrolled: 890,
    steps: 8,
    completed: 340,
  },
  {
    id: 'journey-6',
    name: 'Renewal Reminder Sequence',
    status: 'paused',
    enrolled: 150,
    steps: 5,
    completed: 0,
  },
]

const statusStyles: Record<JourneyStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-gray-100 text-gray-600',
}

function JourneysPage() {
  const [journeys, setJourneys] = useState<Journey[]>(initialJourneys)

  const handleToggleStatus = (journeyId: string) => {
    setJourneys((prev) =>
      prev.map((journey) =>
        journey.id === journeyId
          ? { ...journey, status: journey.status === 'active' ? 'paused' : 'active' }
          : journey
      )
    )
  }

  const handleViewAudience = (journey: Journey) => {
    console.log('View audience for:', journey.name)
  }

  const handleEdit = (journey: Journey) => {
    console.log('Edit journey:', journey.name)
  }

  const handleDuplicate = (journey: Journey) => {
    console.log('Duplicate journey:', journey.name)
  }

  const handleDelete = (journey: Journey) => {
    console.log('Delete journey:', journey.name)
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Journeys & Automation</h1>
          <p className="text-gray-500 text-sm mt-1">
            Visualize and manage customer lifecycle workflows.
          </p>
        </div>
        <Button className="bg-rose-500 hover:bg-rose-600 text-white">
          <Zap size={18} className="mr-1" />
          Create Journey
        </Button>
      </div>

      {/* Journey Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {journeys.map((journey) => (
          <JourneyCard
            key={journey.id}
            journey={journey}
            onToggleStatus={() => handleToggleStatus(journey.id)}
            onViewAudience={() => handleViewAudience(journey)}
            onEdit={() => handleEdit(journey)}
            onDuplicate={() => handleDuplicate(journey)}
            onDelete={() => handleDelete(journey)}
          />
        ))}
      </div>
    </main>
  )
}

interface JourneyCardProps {
  journey: Journey
  onToggleStatus: () => void
  onViewAudience: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function JourneyCard({
  journey,
  onToggleStatus,
  onViewAudience,
  onEdit,
  onDuplicate,
  onDelete,
}: JourneyCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
            <Zap size={20} className="text-rose-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{journey.name}</h3>
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded uppercase ${
                statusStyles[journey.status]
              }`}
            >
              {journey.status}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreHorizontal size={18} className="text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit size={14} className="mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy size={14} className="mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 size={14} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Metrics */}
      <div className="flex items-center justify-between py-4 border-y border-gray-100">
        <div className="text-center flex-1">
          <p className="text-lg font-semibold text-gray-900">{journey.enrolled}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Enrolled</p>
        </div>
        <ArrowRight size={16} className="text-gray-300 mx-2" />
        <div className="text-center flex-1">
          <p className="text-lg font-semibold text-gray-900">{journey.steps}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Steps</p>
        </div>
        <ArrowRight size={16} className="text-gray-300 mx-2" />
        <div className="text-center flex-1">
          <p className={`text-lg font-semibold ${journey.completed > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
            {journey.completed}
          </p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onViewAudience}
        >
          <Users size={14} className="mr-1.5" />
          View Audience
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={`flex-1 ${
            journey.status === 'active'
              ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
          }`}
          onClick={onToggleStatus}
        >
          {journey.status === 'active' ? (
            <>
              <Pause size={14} className="mr-1.5" />
              Pause
            </>
          ) : (
            <>
              <Play size={14} className="mr-1.5" />
              Activate
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

