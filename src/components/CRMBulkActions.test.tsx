import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CRMBulkActions } from './CRMBulkActions'

describe('CRMBulkActions', () => {
	const mockOnTag = vi.fn()
	const mockOnAssign = vi.fn()
	const mockOnExport = vi.fn()
	const mockOnDelete = vi.fn()
	const mockOnClearSelection = vi.fn()

	describe('Render Behavior', () => {
		it('should not render when no customers selected', () => {
			const { container } = render(
				<CRMBulkActions
					selectedCount={0}
					onTag={mockOnTag}
					onAssign={mockOnAssign}
					onExport={mockOnExport}
					onDelete={mockOnDelete}
					onClearSelection={mockOnClearSelection}
				/>
			)

			expect(container.firstChild).toBeNull()
		})

		it('should render when customers are selected', () => {
			render(
				<CRMBulkActions
					selectedCount={3}
					onTag={mockOnTag}
					onAssign={mockOnAssign}
					onExport={mockOnExport}
					onDelete={mockOnDelete}
					onClearSelection={mockOnClearSelection}
				/>
			)

			expect(screen.getByText('3 customers selected')).toBeInTheDocument()
		})

		it('should display singular form for one customer', () => {
			render(
				<CRMBulkActions
					selectedCount={1}
					onTag={mockOnTag}
					onAssign={mockOnAssign}
					onExport={mockOnExport}
					onDelete={mockOnDelete}
					onClearSelection={mockOnClearSelection}
				/>
			)

			expect(screen.getByText('1 customer selected')).toBeInTheDocument()
		})

		it('should display all action buttons', () => {
			render(
				<CRMBulkActions
					selectedCount={2}
					onTag={mockOnTag}
					onAssign={mockOnAssign}
					onExport={mockOnExport}
					onDelete={mockOnDelete}
					onClearSelection={mockOnClearSelection}
				/>
			)

			expect(screen.getByRole('button', { name: /tag/i })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /assign/i })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
		})
	})

	describe('User Interactions', () => {
		it('should call onTag when tag button is clicked', async () => {
			const user = userEvent.setup()
			render(
				<CRMBulkActions
					selectedCount={2}
					onTag={mockOnTag}
					onAssign={mockOnAssign}
					onExport={mockOnExport}
					onDelete={mockOnDelete}
					onClearSelection={mockOnClearSelection}
				/>
			)

			const tagButton = screen.getByRole('button', { name: /tag/i })
			await user.click(tagButton)

			expect(mockOnTag).toHaveBeenCalledTimes(1)
		})

		it('should call onAssign when assign button is clicked', async () => {
			const user = userEvent.setup()
			render(
				<CRMBulkActions
					selectedCount={2}
					onTag={mockOnTag}
					onAssign={mockOnAssign}
					onExport={mockOnExport}
					onDelete={mockOnDelete}
					onClearSelection={mockOnClearSelection}
				/>
			)

			const assignButton = screen.getByRole('button', { name: /assign/i })
			await user.click(assignButton)

			expect(mockOnAssign).toHaveBeenCalledTimes(1)
		})

		it('should call onExport when export button is clicked', async () => {
			const user = userEvent.setup()
			render(
				<CRMBulkActions
					selectedCount={2}
					onTag={mockOnTag}
					onAssign={mockOnAssign}
					onExport={mockOnExport}
					onDelete={mockOnDelete}
					onClearSelection={mockOnClearSelection}
				/>
			)

			const exportButton = screen.getByRole('button', { name: /export/i })
			await user.click(exportButton)

			expect(mockOnExport).toHaveBeenCalledTimes(1)
		})

		it('should call onDelete when delete button is clicked', async () => {
			const user = userEvent.setup()
			render(
				<CRMBulkActions
					selectedCount={2}
					onTag={mockOnTag}
					onAssign={mockOnAssign}
					onExport={mockOnExport}
					onDelete={mockOnDelete}
					onClearSelection={mockOnClearSelection}
				/>
			)

			const deleteButton = screen.getByRole('button', { name: /delete/i })
			await user.click(deleteButton)

			expect(mockOnDelete).toHaveBeenCalledTimes(1)
		})

		it('should call onClearSelection when clear button is clicked', async () => {
			const user = userEvent.setup()
			render(
				<CRMBulkActions
					selectedCount={2}
					onTag={mockOnTag}
					onAssign={mockOnAssign}
					onExport={mockOnExport}
					onDelete={mockOnDelete}
					onClearSelection={mockOnClearSelection}
				/>
			)

			const clearButton = screen.getByRole('button', { name: /clear/i })
			await user.click(clearButton)

			expect(mockOnClearSelection).toHaveBeenCalledTimes(1)
		})
	})
})

