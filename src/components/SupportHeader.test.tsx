import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupportHeader } from './SupportHeader'
import * as router from '@tanstack/react-router'

vi.mock('@tanstack/react-router', () => ({
	useParams: vi.fn(() => ({ tenant: 'acme' })),
}))

// Mock CreateTicketDialog to simplify testing
vi.mock('./CreateTicketDialog', () => ({
	CreateTicketDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
		open ? (
			<div data-testid="create-ticket-dialog">
				<button type="button" onClick={() => onOpenChange(false)}>Close</button>
			</div>
		) : null,
}))

describe('SupportHeader', () => {
	describe('Render Behavior', () => {
		it('should render search input', () => {
			render(<SupportHeader />)

			expect(screen.getByPlaceholderText(/search tickets, members/i)).toBeInTheDocument()
		})

		it('should render notification bell button', () => {
			render(<SupportHeader />)

			const buttons = screen.getAllByRole('button')
			expect(buttons.length).toBeGreaterThanOrEqual(1)
		})

		it('should render New Ticket button', () => {
			render(<SupportHeader />)

			expect(screen.getByRole('button', { name: /new ticket/i })).toBeInTheDocument()
		})

		it('should render notification indicator', () => {
			const { container } = render(<SupportHeader />)

			const indicator = container.querySelector('.bg-red-500.rounded-full')
			expect(indicator).toBeInTheDocument()
		})
	})

	describe('New Ticket Dialog', () => {
		it('should open CreateTicketDialog when New Ticket is clicked', async () => {
			const user = userEvent.setup()
			render(<SupportHeader />)

			await user.click(screen.getByRole('button', { name: /new ticket/i }))

			expect(screen.getByTestId('create-ticket-dialog')).toBeInTheDocument()
		})

		it('should close dialog when close button is clicked', async () => {
			const user = userEvent.setup()
			render(<SupportHeader />)

			await user.click(screen.getByRole('button', { name: /new ticket/i }))
			expect(screen.getByTestId('create-ticket-dialog')).toBeInTheDocument()

			await user.click(screen.getByRole('button', { name: /close/i }))

			await waitFor(() => {
				expect(screen.queryByTestId('create-ticket-dialog')).not.toBeInTheDocument()
			})
		})
	})

	describe('Layout', () => {
		it('should render header element', () => {
			const { container } = render(<SupportHeader />)

			const header = container.querySelector('header')
			expect(header).toBeInTheDocument()
		})

		it('should have search input with correct styling', () => {
			render(<SupportHeader />)

			const searchInput = screen.getByPlaceholderText(/search tickets, members/i)
			expect(searchInput).toHaveClass('pl-10')
		})
	})
})

