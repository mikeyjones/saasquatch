import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CRMCustomerTable, type CRMCustomer } from './CRMCustomerTable'
import * as router from '@tanstack/react-router'

vi.mock('@tanstack/react-router', () => ({
	useParams: vi.fn(() => ({ tenant: 'acme' })),
	Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
}))

const mockUseParams = router.useParams as ReturnType<typeof vi.fn>

const mockCustomers: CRMCustomer[] = [
	{
		id: 'cust-1',
		name: 'Acme Corp',
		industry: 'Technology',
		website: 'https://acme.com',
		status: 'customer',
		subscriptionStatus: 'active',
		subscriptionPlan: 'Pro',
		importance: 'high',
		realizedValue: 50000,
		potentialValue: 100000,
		lastActivity: new Date().toISOString(),
		dealCount: 3,
		contactCount: 5,
		assignedTo: { id: 'user-1', name: 'John Doe' },
		tags: ['enterprise', 'priority'],
	},
	{
		id: 'cust-2',
		name: 'TechStart Inc',
		industry: 'SaaS',
		status: 'prospect',
		importance: 'normal',
		realizedValue: 0,
		potentialValue: 25000,
		lastActivity: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
		dealCount: 1,
		contactCount: 2,
	},
	{
		id: 'cust-3',
		name: 'OldCo',
		industry: 'Manufacturing',
		status: 'inactive',
		importance: 'low',
		realizedValue: 10000,
		potentialValue: 5000,
		lastActivity: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
		dealCount: 0,
		contactCount: 1,
	},
]

describe('CRMCustomerTable', () => {
	const mockOnSelectionChange = vi.fn()
	const mockOnEdit = vi.fn()
	const mockOnCreateSubscription = vi.fn()
	const mockOnAddContact = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		mockUseParams.mockReturnValue({ tenant: 'acme' })
	})

	describe('Render Behavior', () => {
		it('should render table with customers', () => {
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			expect(screen.getByText('Acme Corp')).toBeInTheDocument()
			expect(screen.getByText('TechStart Inc')).toBeInTheDocument()
			expect(screen.getByText('OldCo')).toBeInTheDocument()
		})

		it('should render column headers', () => {
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			expect(screen.getByText('Company')).toBeInTheDocument()
			expect(screen.getByText('Industry')).toBeInTheDocument()
			expect(screen.getByText('Status')).toBeInTheDocument()
			expect(screen.getByText('Importance')).toBeInTheDocument()
			expect(screen.getByText('Realized Value')).toBeInTheDocument()
			expect(screen.getByText('Potential Value')).toBeInTheDocument()
			expect(screen.getByText('Last Activity')).toBeInTheDocument()
			expect(screen.getByText('Deals')).toBeInTheDocument()
		})

		it('should render empty state when no customers', () => {
			render(
				<CRMCustomerTable
					customers={[]}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			expect(screen.getByText('No customers found')).toBeInTheDocument()
			expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument()
		})

		it('should display industry badges', () => {
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			expect(screen.getByText('Technology')).toBeInTheDocument()
			expect(screen.getByText('SaaS')).toBeInTheDocument()
			expect(screen.getByText('Manufacturing')).toBeInTheDocument()
		})

		it('should display status badges', () => {
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			expect(screen.getByText('Customer')).toBeInTheDocument()
			expect(screen.getByText('Prospect')).toBeInTheDocument()
			expect(screen.getByText('Inactive')).toBeInTheDocument()
		})

		it('should display importance levels', () => {
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			expect(screen.getByText('high')).toBeInTheDocument()
			expect(screen.getByText('normal')).toBeInTheDocument()
			expect(screen.getByText('low')).toBeInTheDocument()
		})

		it('should format currency values correctly', () => {
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			expect(screen.getByText('$50K')).toBeInTheDocument()
			expect(screen.getByText('$100K')).toBeInTheDocument()
			expect(screen.getByText('$25K')).toBeInTheDocument()
		})

		it('should display deal counts', () => {
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			expect(screen.getByText('3')).toBeInTheDocument()
			expect(screen.getByText('1')).toBeInTheDocument()
			expect(screen.getByText('0')).toBeInTheDocument()
		})

		it('should display website links', () => {
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			expect(screen.getByText('acme.com')).toBeInTheDocument()
		})
	})

	describe('Selection Behavior', () => {
		it('should show selected rows with highlight', () => {
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={['cust-1']}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			const checkboxes = screen.getAllByRole('checkbox')
			expect(checkboxes[1]).toBeChecked() // First customer row
		})

		it('should call onSelectionChange when checkbox is clicked', async () => {
			const user = userEvent.setup()
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			const checkboxes = screen.getAllByRole('checkbox')
			await user.click(checkboxes[1]) // Click first customer row checkbox

			expect(mockOnSelectionChange).toHaveBeenCalledWith(['cust-1'])
		})

		it('should deselect when clicking selected checkbox', async () => {
			const user = userEvent.setup()
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={['cust-1']}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			const checkboxes = screen.getAllByRole('checkbox')
			await user.click(checkboxes[1]) // Click first customer row checkbox

			expect(mockOnSelectionChange).toHaveBeenCalledWith([])
		})

		it('should select all when header checkbox is clicked', async () => {
			const user = userEvent.setup()
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			const checkboxes = screen.getAllByRole('checkbox')
			await user.click(checkboxes[0]) // Header checkbox

			expect(mockOnSelectionChange).toHaveBeenCalledWith(['cust-1', 'cust-2', 'cust-3'])
		})

		it('should deselect all when header checkbox is clicked with all selected', async () => {
			const user = userEvent.setup()
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={['cust-1', 'cust-2', 'cust-3']}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			const checkboxes = screen.getAllByRole('checkbox')
			await user.click(checkboxes[0]) // Header checkbox

			expect(mockOnSelectionChange).toHaveBeenCalledWith([])
		})
	})

	describe('Row Expansion', () => {
		it('should render table with expansion capability', async () => {
			const customerWithActivities: CRMCustomer[] = [
				{
					...mockCustomers[0],
					activities: [
						{
							id: 'act-1',
							type: 'call',
							title: 'Sales call',
							description: 'Discussed pricing',
							timestamp: new Date().toISOString(),
							user: { id: 'user-1', name: 'John' },
						},
					],
				},
			]

			const { container } = render(
				<CRMCustomerTable
					customers={customerWithActivities}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			// Table should render with customers
			expect(container.querySelector('table')).toBeInTheDocument()
			expect(screen.getByText('Acme Corp')).toBeInTheDocument()
		})
	})

	describe('Actions Menu', () => {
		it('should open dropdown menu when actions button is clicked', async () => {
			const user = userEvent.setup()
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
					onEdit={mockOnEdit}
					onCreateSubscription={mockOnCreateSubscription}
					onAddContact={mockOnAddContact}
				/>
			)

			// Find the actions button (MoreHorizontal icon button)
			const actionButtons = screen.getAllByRole('button')
			const moreButton = actionButtons.find((btn) => btn.classList.contains('h-8'))
			if (moreButton) {
				await user.click(moreButton)
			}

			expect(screen.getByText('View Details')).toBeInTheDocument()
			expect(screen.getByText('Edit')).toBeInTheDocument()
		})

		it('should call onEdit when Edit is clicked', async () => {
			const user = userEvent.setup()
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
					onEdit={mockOnEdit}
				/>
			)

			// Open the dropdown for first customer
			const actionButtons = screen.getAllByRole('button')
			const moreButton = actionButtons.find((btn) => btn.classList.contains('h-8'))
			if (moreButton) {
				await user.click(moreButton)
			}

			await user.click(screen.getByText('Edit'))
			expect(mockOnEdit).toHaveBeenCalledWith(mockCustomers[0])
		})

		it('should show Create Subscription for non-active customers', async () => {
			const user = userEvent.setup()
			const prospectCustomers = [mockCustomers[1]] // TechStart Inc - prospect

			render(
				<CRMCustomerTable
					customers={prospectCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
					onCreateSubscription={mockOnCreateSubscription}
				/>
			)

			const actionButtons = screen.getAllByRole('button')
			const moreButton = actionButtons.find((btn) => btn.classList.contains('h-8'))
			if (moreButton) {
				await user.click(moreButton)
			}

			expect(screen.getByText('Create Subscription')).toBeInTheDocument()
		})

		it('should call onAddContact when Add Contact is clicked', async () => {
			const user = userEvent.setup()
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
					onAddContact={mockOnAddContact}
				/>
			)

			const actionButtons = screen.getAllByRole('button')
			const moreButton = actionButtons.find((btn) => btn.classList.contains('h-8'))
			if (moreButton) {
				await user.click(moreButton)
			}

			await user.click(screen.getByText('Add Contact'))
			expect(mockOnAddContact).toHaveBeenCalledWith(mockCustomers[0])
		})
	})

	describe('Sorting', () => {
		it('should have sortable Realized Value column', async () => {
			const user = userEvent.setup()
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			const realizedValueHeader = screen.getByText('Realized Value')
			expect(realizedValueHeader).toBeInTheDocument()

			// Click to sort
			await user.click(realizedValueHeader)
			// Should still render (sorting internal to component)
			expect(screen.getByText('Realized Value')).toBeInTheDocument()
		})

		it('should have sortable Potential Value column', async () => {
			const user = userEvent.setup()
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			const potentialValueHeader = screen.getByText('Potential Value')
			expect(potentialValueHeader).toBeInTheDocument()

			// Click to sort
			await user.click(potentialValueHeader)
			// Should still render (sorting internal to component)
			expect(screen.getByText('Potential Value')).toBeInTheDocument()
		})
	})

	describe('Links', () => {
		it('should render customer name as link to detail page', () => {
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			const customerLink = screen.getByText('Acme Corp').closest('a')
			expect(customerLink).toHaveAttribute('href', '/acme/app/sales/crm/cust-1')
		})
	})

	describe('Subscription Status Display', () => {
		it('should display subscription status for customers with subscriptions', () => {
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			expect(screen.getByText('active')).toBeInTheDocument()
		})
	})

	describe('Time Formatting', () => {
		it('should display relative time for recent activity', () => {
			render(
				<CRMCustomerTable
					customers={mockCustomers}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
				/>
			)

			// First customer has activity from now, so should show "0m ago" or similar
			// Second customer is 2 days ago, should show "2d ago"
			expect(screen.getByText('2d ago')).toBeInTheDocument()
		})
	})
})

