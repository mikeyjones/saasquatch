import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CRMSegments } from './CRMSegments'

describe('CRMSegments', () => {
	const mockOnSegmentChange = vi.fn()
	const mockSegments = [
		{ id: 'all', label: 'All', count: 10 },
		{ id: 'customers', label: 'Customers', count: 5 },
		{ id: 'prospects', label: 'Prospects', count: 3 },
		{ id: 'inactive', label: 'Inactive', count: 2 },
	]

	describe('Render Behavior', () => {
		it('should render all segments', () => {
			render(
				<CRMSegments
					segments={mockSegments}
					activeSegment="all"
					onSegmentChange={mockOnSegmentChange}
				/>
			)

			expect(screen.getByText('All')).toBeInTheDocument()
			expect(screen.getByText('Customers')).toBeInTheDocument()
			expect(screen.getByText('Prospects')).toBeInTheDocument()
			expect(screen.getByText('Inactive')).toBeInTheDocument()
		})

		it('should display segment counts', () => {
			render(
				<CRMSegments
					segments={mockSegments}
					activeSegment="all"
					onSegmentChange={mockOnSegmentChange}
				/>
			)

			// Counts are displayed in spans within buttons
			// Button accessible name includes both label and count (e.g., "All 10")
			const allButton = screen.getByRole('button', { name: /all/i })
			expect(allButton.textContent).toContain('10')
			
			const customersButton = screen.getByRole('button', { name: /customers/i })
			expect(customersButton.textContent).toContain('5')
		})

		it('should highlight active segment', () => {
			render(
				<CRMSegments
					segments={mockSegments}
					activeSegment="customers"
					onSegmentChange={mockOnSegmentChange}
				/>
			)

			// Button contains both label and count, so accessible name might include count
			const customersButton = screen.getByRole('button', { name: /customers/i })
			expect(customersButton.className).toContain('border-indigo-500')
		})
	})

	describe('User Interactions', () => {
		it('should call onSegmentChange when segment is clicked', async () => {
			const user = userEvent.setup()
			render(
				<CRMSegments
					segments={mockSegments}
					activeSegment="all"
					onSegmentChange={mockOnSegmentChange}
				/>
			)

			const customersButton = screen.getByRole('button', { name: /customers/i })
			await user.click(customersButton)

			expect(mockOnSegmentChange).toHaveBeenCalledWith('customers')
		})

		it('should handle clicking different segments', async () => {
			const user = userEvent.setup()
			render(
				<CRMSegments
					segments={mockSegments}
					activeSegment="all"
					onSegmentChange={mockOnSegmentChange}
				/>
			)

			const prospectsButton = screen.getByRole('button', { name: /prospects/i })
			await user.click(prospectsButton)

			expect(mockOnSegmentChange).toHaveBeenCalledWith('prospects')
		})
	})
})

