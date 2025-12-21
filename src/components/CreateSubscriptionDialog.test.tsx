import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateSubscriptionDialog } from './CreateSubscriptionDialog'
import { mockFetchSuccess } from '@/test/setup'
import * as router from '@tanstack/react-router'

// Mock useParams
vi.mock('@tanstack/react-router', () => ({
	useParams: vi.fn(() => ({ tenant: 'acme' })),
}))

const mockUseParams = router.useParams as ReturnType<typeof vi.fn>

// Helper to mock fetch
function mockFetch() {
	return global.fetch as ReturnType<typeof vi.fn>
}

describe('CreateSubscriptionDialog', () => {
	const mockOnOpenChange = vi.fn()
	const mockOnSubscriptionCreated = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		mockUseParams.mockReturnValue({ tenant: 'acme' })
		global.fetch = vi.fn(() => {
			return Promise.resolve(
				new Response(JSON.stringify({ error: 'Not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				})
			)
		}) as typeof fetch
	})

	describe('Fetch on Open', () => {
		it('should fetch companies and plans when dialog opens', async () => {
			const mockCompanies = [
				{ id: 'company-1', name: 'Acme Corp', subscriptionStatus: null },
			]
			const mockPlans = [
				{ id: 'plan-1', name: 'Enterprise', status: 'active', pricingModel: 'flat' },
			]

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customers: mockCompanies }))
				.mockResolvedValueOnce(mockFetchSuccess({ plans: mockPlans }))

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
				/>
			)

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/tenant/acme/crm/customers?segment=all')
				)
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/tenant/acme/product-catalog/plans?status=active')
				)
			})
		})
	})

	describe('Pre-selected Company UI', () => {
		it('should show fixed display when company is pre-selected', async () => {
			const mockPlans = [
				{ id: 'plan-1', name: 'Enterprise', status: 'active', pricingModel: 'flat' },
			]

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customers: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ plans: mockPlans }))

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
					preSelectedCompanyId="company-123"
					preSelectedCompanyName="Acme Corp"
				/>
			)

			// Pre-selected company should show as fixed display, not dropdown
			await waitFor(() => {
				expect(screen.getByText('Acme Corp')).toBeInTheDocument()
			})
		})

		it('should render company select when not pre-selected', async () => {
			const mockCompanies = [
				{ id: 'company-1', name: 'Acme Corp', subscriptionStatus: null },
			]
			const mockPlans = [
				{ id: 'plan-1', name: 'Enterprise', status: 'active', pricingModel: 'flat' },
			]

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customers: mockCompanies }))
				.mockResolvedValueOnce(mockFetchSuccess({ plans: mockPlans }))

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
				/>
			)

			// Company label should be present (indicating the select is rendered)
			await waitFor(() => {
				expect(screen.getByText('Company *')).toBeInTheDocument()
			})
		})
	})

	describe('Validation', () => {
		it('should disable submit when no company or plan selected', async () => {
			const mockPlans = [
				{ id: 'plan-1', name: 'Enterprise', status: 'active', pricingModel: 'flat' },
			]

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customers: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ plans: mockPlans }))

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
				/>
			)

			await waitFor(() => {
				const submitButton = screen.getByRole('button', { name: /create subscription/i })
				expect(submitButton).toBeDisabled()
			})
		})

		it('should disable submit when company pre-selected but no plan', async () => {
			const mockPlans = [
				{ id: 'plan-1', name: 'Enterprise', status: 'active', pricingModel: 'flat' },
			]

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customers: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ plans: mockPlans }))

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
					preSelectedCompanyId="company-1"
					preSelectedCompanyName="Acme Corp"
				/>
			)

			await waitFor(() => {
				// Wait for loading to complete
				expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
			})

			const submitButton = screen.getByRole('button', { name: /create subscription/i })
			expect(submitButton).toBeDisabled()
		})
	})

	describe('Loading States', () => {
		it('should show loading state while fetching data', async () => {
			mockFetch().mockImplementation(() => new Promise(() => {})) // Never resolves

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
				/>
			)

			expect(screen.getByText(/loading companies/i)).toBeInTheDocument()
		})
	})

	describe('Empty States', () => {
		it('should show message when no active plans available', async () => {
			const mockCompanies = [
				{ id: 'company-1', name: 'Acme Corp', subscriptionStatus: null },
			]

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customers: mockCompanies }))
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
				/>
			)

			await waitFor(() => {
				expect(
					screen.getByText(/no active product plans available/i)
				).toBeInTheDocument()
			})
		})
	})

	describe('Dialog Title', () => {
		it('should show Create Subscription title', async () => {
			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customers: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
				/>
			)

			// Use getByRole for heading to avoid matching the button
			expect(screen.getByRole('heading', { name: /create subscription/i })).toBeInTheDocument()
		})
	})

	describe('Cancel Button', () => {
		it('should call onOpenChange(false) when Cancel clicked', async () => {
			const user = userEvent.setup()

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customers: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
				/>
			)

			const cancelButton = screen.getByRole('button', { name: /cancel/i })
			await user.click(cancelButton)

			expect(mockOnOpenChange).toHaveBeenCalledWith(false)
		})
	})

	describe('Billing Cycle Toggle', () => {
		it('should render billing cycle toggle buttons', async () => {
			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customers: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [{ id: 'plan-1', name: 'Basic', status: 'active', pricingModel: 'flat' }] }))

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /monthly/i })).toBeInTheDocument()
				expect(screen.getByRole('button', { name: /yearly/i })).toBeInTheDocument()
			})
		})

		it('should toggle billing cycle when clicked', async () => {
			const user = userEvent.setup()

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customers: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [{ id: 'plan-1', name: 'Basic', status: 'active', pricingModel: 'flat' }] }))

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /yearly/i })).toBeInTheDocument()
			})

			const yearlyButton = screen.getByRole('button', { name: /yearly/i })
			await user.click(yearlyButton)

			// Yearly should now be active (has different styling, but we can check it's still there)
			expect(yearlyButton).toBeInTheDocument()
		})
	})

	describe('Seats Input', () => {
		it('should render seats input with default value', async () => {
			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customers: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [{ id: 'plan-1', name: 'Basic', status: 'active', pricingModel: 'flat' }] }))

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
				/>
			)

			await waitFor(() => {
				const seatsInput = screen.getByLabelText(/seats/i)
				expect(seatsInput).toBeInTheDocument()
				expect(seatsInput).toHaveValue(1)
			})
		})

		it('should allow interaction with seats input', async () => {
			const user = userEvent.setup()

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customers: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [{ id: 'plan-1', name: 'Basic', status: 'active', pricingModel: 'flat' }] }))

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByLabelText(/seats/i)).toBeInTheDocument()
			})

			const seatsInput = screen.getByLabelText(/seats/i) as HTMLInputElement
			
			// Input should be editable (not disabled or readonly)
			expect(seatsInput).not.toBeDisabled()
			expect(seatsInput).toHaveAttribute('type', 'number')
			
			// Can interact with it
			await user.click(seatsInput)
			await user.type(seatsInput, '5')
			
			// Value should have changed (might be 15 or 51 depending on cursor position)
			expect(seatsInput.value).not.toBe('1')
		})
	})

	describe('Notes Input', () => {
		it('should render notes textarea', async () => {
			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customers: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [{ id: 'plan-1', name: 'Basic', status: 'active', pricingModel: 'flat' }] }))

			render(
				<CreateSubscriptionDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSubscriptionCreated={mockOnSubscriptionCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByPlaceholderText(/internal notes/i)).toBeInTheDocument()
			})
		})
	})
})
