import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PipelineColumn, type PipelineStage } from './PipelineColumn'
import { DndContext } from '@dnd-kit/core'

// Mock useDroppable
vi.mock('@dnd-kit/core', async () => {
	const actual = await vi.importActual('@dnd-kit/core')
	return {
		...actual,
		useDroppable: vi.fn(() => ({
			setNodeRef: vi.fn(),
			isOver: false,
		})),
	}
})

// Mock useSortable
vi.mock('@dnd-kit/sortable', () => ({
	useSortable: vi.fn(() => ({
		attributes: {},
		listeners: {},
		setNodeRef: vi.fn(),
		transform: null,
		transition: null,
		isDragging: false,
	})),
	SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	verticalListSortingStrategy: {},
}))

describe('PipelineColumn', () => {
	const mockStage: PipelineStage = {
		id: 'stage-1',
		name: 'Negotiation',
		order: 3,
		color: 'blue',
		bgColor: 'bg-blue-500',
		dotColor: 'bg-blue-500',
	}

	const mockDeals = [
		{
			id: 'deal-1',
			name: 'Enterprise Deal',
			company: 'Acme Corp',
			value: 5000000, // $50,000
			stageId: 'stage-1',
			stage: {
				id: 'stage-1',
				name: 'Negotiation',
				order: 3,
				color: 'blue',
			},
			assignedTo: {
				id: 'user-1',
				name: 'John Doe',
			},
			lastUpdated: '2 days ago',
			badges: ['Hot'],
		},
	]

	describe('Render Behavior', () => {
		it('should render stage name', () => {
			render(
				<DndContext>
					<PipelineColumn stage={mockStage} deals={mockDeals} totalPotential={5000000} />
				</DndContext>
			)

			// Stage name is rendered with uppercase and tracking-wide class
			expect(screen.getByText(/negotiation/i)).toBeInTheDocument()
		})

		it('should display deal count', () => {
			render(
				<DndContext>
					<PipelineColumn stage={mockStage} deals={mockDeals} totalPotential={5000000} />
				</DndContext>
			)

			expect(screen.getByText('1')).toBeInTheDocument()
		})

		it('should display potential value', () => {
			render(
				<DndContext>
					<PipelineColumn stage={mockStage} deals={mockDeals} totalPotential={5000000} />
				</DndContext>
			)

			// $50,000 = $50K (formatCurrency uses Math.floor and toFixed(0))
			// "50K" appears in both potential value and deal card, so use getAllByText
			const potentialElements = screen.getAllByText(/50K/i)
			expect(potentialElements.length).toBeGreaterThan(0)
			expect(screen.getByText(/Potential/i)).toBeInTheDocument()
		})

		it('should format large potential values correctly', () => {
			render(
				<DndContext>
					<PipelineColumn stage={mockStage} deals={[]} totalPotential={500000000} />
				</DndContext>
			)

			// $5M Potential (formatCurrency: 5000000 / 100 = 5000000 dollars, / 1000000 = 5.0M)
			expect(screen.getByText(/5\.0M/i)).toBeInTheDocument()
			expect(screen.getByText(/Potential/i)).toBeInTheDocument()
		})

		it('should render deal cards', () => {
			render(
				<DndContext>
					<PipelineColumn stage={mockStage} deals={mockDeals} totalPotential={5000000} />
				</DndContext>
			)

			expect(screen.getByText('Enterprise Deal')).toBeInTheDocument()
		})

		it('should render empty state when no deals', () => {
			render(
				<DndContext>
					<PipelineColumn stage={mockStage} deals={[]} totalPotential={0} />
				</DndContext>
			)

			expect(screen.getByText('0')).toBeInTheDocument()
			expect(screen.getByText(/\$0/i)).toBeInTheDocument()
			expect(screen.getByText(/Potential/i)).toBeInTheDocument()
		})
	})
})

