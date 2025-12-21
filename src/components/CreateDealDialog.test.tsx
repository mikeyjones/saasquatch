import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateDealDialog } from './CreateDealDialog'
import { mockFetchSuccess, mockFetchError } from '@/test/setup'
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

describe('CreateDealDialog', () => {
	const mockOnOpenChange = vi.fn()
	const mockOnDealCreated = vi.fn()

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

	describe('Render Behavior', () => {
		it('should render dialog when open', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: [] }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			expect(screen.getByRole('heading', { name: /create new deal/i })).toBeInTheDocument()
		})

		it('should not render dialog when closed', () => {
			render(
				<CreateDealDialog
					open={false}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			expect(screen.queryByRole('heading', { name: /create new deal/i })).not.toBeInTheDocument()
		})

		it('should show dialog description', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: [] }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			expect(screen.getByText(/add a new deal to your sales pipeline/i)).toBeInTheDocument()
		})
	})

	describe('Fetch on Open', () => {
		it('should fetch pipelines when dialog opens', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: [] }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/tenant/acme/pipelines')
				)
			})
		})

		it('should not fetch pipelines when dialog is closed', () => {
			render(
				<CreateDealDialog
					open={false}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			expect(fetch).not.toHaveBeenCalled()
		})
	})

	describe('Organization Search', () => {
		it('should render organization search input', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: [] }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByPlaceholderText(/search for organization/i)).toBeInTheDocument()
			})
		})

		it('should filter organizations when typing in search', async () => {
			const user = userEvent.setup()
			const mockPipelines = [
				{
					id: 'pipeline-1',
					name: 'Sales Pipeline',
					tenantOrganization: {
						id: 'org-1',
						name: 'Acme Corp',
						slug: 'acme',
					},
					stages: [],
				},
				{
					id: 'pipeline-2',
					name: 'Sales Pipeline',
					tenantOrganization: {
						id: 'org-2',
						name: 'TechFlow Inc',
						slug: 'techflow',
					},
					stages: [],
				},
			]

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: mockPipelines }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByPlaceholderText(/search for organization/i)).toBeInTheDocument()
			})

			const searchInput = screen.getByPlaceholderText(/search for organization/i)
			await user.type(searchInput, 'Acme')

			// The organization name might be split across elements due to highlighting
			await waitFor(() => {
				const buttons = screen.getAllByRole('button')
				const orgButton = buttons.find(button => 
					button.textContent?.toLowerCase().includes('acme corp')
				)
				expect(orgButton).toBeDefined()
			}, { timeout: 2000 })
		})

		it('should show "No organizations found" when search has no results', async () => {
			const user = userEvent.setup()
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: [] }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByPlaceholderText(/search for organization/i)).toBeInTheDocument()
			})

			const searchInput = screen.getByPlaceholderText(/search for organization/i)
			await user.type(searchInput, 'Nonexistent')

			await waitFor(() => {
				expect(screen.getByText(/no organizations found/i)).toBeInTheDocument()
			})
		})
	})

	describe('Organization Selection', () => {
		it('should allow selecting an organization from dropdown', async () => {
			const user = userEvent.setup()
			const mockPipelines = [
				{
					id: 'pipeline-1',
					name: 'Sales Pipeline',
					tenantOrganization: {
						id: 'org-1',
						name: 'Acme Corp',
						slug: 'acme',
					},
					stages: [
						{
							id: 'stage-1',
							name: 'Qualification',
							order: 1,
							color: '#3b82f6',
						},
					],
				},
			]

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: mockPipelines }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByPlaceholderText(/search for organization/i)).toBeInTheDocument()
			})

			const searchInput = screen.getByPlaceholderText(/search for organization/i)
			await user.type(searchInput, 'Acme')

			// The organization name might be split across elements due to highlighting
			await waitFor(() => {
				const buttons = screen.getAllByRole('button')
				const orgButton = buttons.find(button => 
					button.textContent?.toLowerCase().includes('acme corp')
				)
				expect(orgButton).toBeDefined()
			}, { timeout: 2000 })

			const buttons = screen.getAllByRole('button')
			const orgButton = buttons.find(button => {
				const text = button.textContent?.toLowerCase() || ''
				return text.includes('acme corp') && !text.includes('cancel') && !text.includes('create')
			})
			if (orgButton) {
				await user.click(orgButton)
			}

			// After selection, check for the selected organization display (no highlighting)
			await waitFor(() => {
				expect(screen.getByText('Acme Corp')).toBeInTheDocument()
			})
		})

		it('should show selected organization display', async () => {
			const user = userEvent.setup()
			const mockPipelines = [
				{
					id: 'pipeline-1',
					name: 'Sales Pipeline',
					tenantOrganization: {
						id: 'org-1',
						name: 'Acme Corp',
						slug: 'acme',
					},
					stages: [
						{
							id: 'stage-1',
							name: 'Qualification',
							order: 1,
							color: '#3b82f6',
						},
					],
				},
			]

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: mockPipelines }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByPlaceholderText(/search for organization/i)).toBeInTheDocument()
			})

			const searchInput = screen.getByPlaceholderText(/search for organization/i)
			await user.type(searchInput, 'Acme')

			// The organization name might be split across elements due to highlighting
			await waitFor(() => {
				const buttons = screen.getAllByRole('button')
				const orgButton = buttons.find(button => 
					button.textContent?.toLowerCase().includes('acme corp')
				)
				expect(orgButton).toBeDefined()
			}, { timeout: 2000 })

			const buttons = screen.getAllByRole('button')
			const orgButton = buttons.find(button => 
				button.textContent?.toLowerCase().includes('acme corp')
			)
			if (orgButton) {
				await user.click(orgButton)
			}

			await waitFor(() => {
				// Should show selected organization display
				const selectedDisplay = screen.getByText('Acme Corp').closest('div')
				expect(selectedDisplay).toBeInTheDocument()
			})
		})
	})

	describe('Pipeline and Stage Selection', () => {
		it('should show pipelines after selecting organization', async () => {
			const user = userEvent.setup()
			const mockPipelines = [
				{
					id: 'pipeline-1',
					name: 'Sales Pipeline',
					tenantOrganization: {
						id: 'org-1',
						name: 'Acme Corp',
						slug: 'acme',
					},
					stages: [
						{
							id: 'stage-1',
							name: 'Qualification',
							order: 1,
							color: '#3b82f6',
						},
					],
				},
			]

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: mockPipelines }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByPlaceholderText(/search for organization/i)).toBeInTheDocument()
			})

			const searchInput = screen.getByPlaceholderText(/search for organization/i)
			await user.type(searchInput, 'Acme')

			// The organization name might be split across elements due to highlighting
			await waitFor(() => {
				const buttons = screen.getAllByRole('button')
				const orgButton = buttons.find(button => 
					button.textContent?.toLowerCase().includes('acme corp')
				)
				expect(orgButton).toBeDefined()
			}, { timeout: 2000 })

			const buttons = screen.getAllByRole('button')
			const orgButton = buttons.find(button => 
				button.textContent?.toLowerCase().includes('acme corp')
			)
			if (orgButton) {
				await user.click(orgButton)
			}

			await waitFor(() => {
				// Check for the specific pipeline name instead of generic "pipeline" text
				expect(screen.getByText('Sales Pipeline')).toBeInTheDocument()
			})
		})

		it('should show stages after selecting pipeline', async () => {
			const user = userEvent.setup()
			const mockPipelines = [
				{
					id: 'pipeline-1',
					name: 'Sales Pipeline',
					tenantOrganization: {
						id: 'org-1',
						name: 'Acme Corp',
						slug: 'acme',
					},
					stages: [
						{
							id: 'stage-1',
							name: 'Qualification',
							order: 1,
							color: '#3b82f6',
						},
						{
							id: 'stage-2',
							name: 'Proposal',
							order: 2,
							color: '#10b981',
						},
					],
				},
			]

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: mockPipelines }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByPlaceholderText(/search for organization/i)).toBeInTheDocument()
			})

			const searchInput = screen.getByPlaceholderText(/search for organization/i)
			await user.type(searchInput, 'Acme')

			// The organization name might be split across elements due to highlighting
			await waitFor(() => {
				const buttons = screen.getAllByRole('button')
				const orgButton = buttons.find(button => 
					button.textContent?.toLowerCase().includes('acme corp')
				)
				expect(orgButton).toBeDefined()
			}, { timeout: 2000 })

			const buttons = screen.getAllByRole('button')
			const orgButton = buttons.find(button => 
				button.textContent?.toLowerCase().includes('acme corp')
			)
			if (orgButton) {
				await user.click(orgButton)
			}

			await waitFor(() => {
				expect(screen.getByText('Qualification')).toBeInTheDocument()
			})
		})
	})

	describe('Form Fields', () => {
		it('should render deal name field', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: [] }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByLabelText(/deal name/i)).toBeInTheDocument()
			})
		})

		it('should render deal value field', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: [] }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				// Deal value field uses Label without form control association
				expect(screen.getByText(/deal value/i)).toBeInTheDocument()
				expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
			})
		})

		it('should render notes field', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: [] }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
			})
		})
	})

	describe('Form Submission', () => {
		it('should call API when form is submitted', async () => {
			const user = userEvent.setup()
			const mockPipelines = [
				{
					id: 'pipeline-1',
					name: 'Sales Pipeline',
					tenantOrganization: {
						id: 'org-1',
						name: 'Acme Corp',
						slug: 'acme',
					},
					stages: [
						{
							id: 'stage-1',
							name: 'Qualification',
							order: 1,
							color: '#3b82f6',
						},
					],
				},
			]

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ pipelines: mockPipelines }))
				.mockResolvedValueOnce(mockFetchSuccess({ deal: { id: 'deal-1' } }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByPlaceholderText(/search for organization/i)).toBeInTheDocument()
			})

			// Select organization
			const searchInput = screen.getByPlaceholderText(/search for organization/i)
			await user.type(searchInput, 'Acme')

			// The organization name might be split across elements due to highlighting
			// Use a function matcher to find text across multiple elements
			await waitFor(() => {
				const buttons = screen.getAllByRole('button')
				const orgButton = buttons.find(button => 
					button.textContent?.toLowerCase().includes('acme corp')
				)
				expect(orgButton).toBeDefined()
			}, { timeout: 2000 })

			const buttons = screen.getAllByRole('button')
			const orgButton = buttons.find(button => 
				button.textContent?.toLowerCase().includes('acme corp')
			)
			if (orgButton) {
				await user.click(orgButton)
			}

			// Fill form
			await user.type(screen.getByLabelText(/deal name/i), 'Enterprise Deal')
			await user.type(screen.getByPlaceholderText('0.00'), '1000')

			// Submit
			const submitButton = screen.getByRole('button', { name: /create deal/i })
			await user.click(submitButton)

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/tenant/acme/deals'),
					expect.objectContaining({
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
					})
				)
			})
		})

		it('should call onDealCreated callback after successful submission', async () => {
			const user = userEvent.setup()
			const mockPipelines = [
				{
					id: 'pipeline-1',
					name: 'Sales Pipeline',
					tenantOrganization: {
						id: 'org-1',
						name: 'Acme Corp',
						slug: 'acme',
					},
					stages: [
						{
							id: 'stage-1',
							name: 'Qualification',
							order: 1,
							color: '#3b82f6',
						},
					],
				},
			]

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ pipelines: mockPipelines }))
				.mockResolvedValueOnce(mockFetchSuccess({ deal: { id: 'deal-1' } }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByPlaceholderText(/search for organization/i)).toBeInTheDocument()
			})

			// Select organization
			const searchInput = screen.getByPlaceholderText(/search for organization/i)
			await user.type(searchInput, 'Acme')

			// The organization name might be split across elements due to highlighting
			// Use a function matcher to find text across multiple elements
			await waitFor(() => {
				const buttons = screen.getAllByRole('button')
				const orgButton = buttons.find(button => 
					button.textContent?.toLowerCase().includes('acme corp')
				)
				expect(orgButton).toBeDefined()
			}, { timeout: 2000 })

			const buttons = screen.getAllByRole('button')
			const orgButton = buttons.find(button => 
				button.textContent?.toLowerCase().includes('acme corp')
			)
			if (orgButton) {
				await user.click(orgButton)
			}

			// Fill form
			await user.type(screen.getByLabelText(/deal name/i), 'Enterprise Deal')
			await user.type(screen.getByPlaceholderText('0.00'), '1000')

			// Submit
			const submitButton = screen.getByRole('button', { name: /create deal/i })
			await user.click(submitButton)

			await waitFor(() => {
				expect(mockOnDealCreated).toHaveBeenCalled()
			})
		})

		it('should close dialog after successful submission', async () => {
			const user = userEvent.setup()
			const mockPipelines = [
				{
					id: 'pipeline-1',
					name: 'Sales Pipeline',
					tenantOrganization: {
						id: 'org-1',
						name: 'Acme Corp',
						slug: 'acme',
					},
					stages: [
						{
							id: 'stage-1',
							name: 'Qualification',
							order: 1,
							color: '#3b82f6',
						},
					],
				},
			]

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ pipelines: mockPipelines }))
				.mockResolvedValueOnce(mockFetchSuccess({ deal: { id: 'deal-1' } }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByPlaceholderText(/search for organization/i)).toBeInTheDocument()
			})

			// Wait a bit for pipelines to be processed and organizations extracted
			await new Promise(resolve => setTimeout(resolve, 100))

			// Select organization
			const searchInput = screen.getByPlaceholderText(/search for organization/i)
			await user.type(searchInput, 'Acme')

			// The organization name might be split across elements due to highlighting
			// Use a function matcher to find text across multiple elements
			await waitFor(() => {
				const buttons = screen.getAllByRole('button')
				const orgButton = buttons.find(button => 
					button.textContent?.toLowerCase().includes('acme corp')
				)
				expect(orgButton).toBeDefined()
			}, { timeout: 2000 })

			const buttons = screen.getAllByRole('button')
			const orgButton = buttons.find(button => 
				button.textContent?.toLowerCase().includes('acme corp')
			)
			if (orgButton) {
				await user.click(orgButton)
			}

			// Fill form
			await user.type(screen.getByLabelText(/deal name/i), 'Enterprise Deal')
			await user.type(screen.getByPlaceholderText('0.00'), '1000')

			// Submit
			const submitButton = screen.getByRole('button', { name: /create deal/i })
			await user.click(submitButton)

			await waitFor(() => {
				expect(mockOnOpenChange).toHaveBeenCalledWith(false)
			})
		})
	})

	describe('Cancel Button', () => {
		it('should call onOpenChange(false) when Cancel clicked', async () => {
			const user = userEvent.setup()
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ pipelines: [] }))

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
			})

			const cancelButton = screen.getByRole('button', { name: /cancel/i })
			await user.click(cancelButton)

			expect(mockOnOpenChange).toHaveBeenCalledWith(false)
		})
	})

	describe('Loading States', () => {
		it('should show loading state while fetching pipelines', async () => {
			mockFetch().mockImplementation(() => new Promise(() => {})) // Never resolves

			render(
				<CreateDealDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onDealCreated={mockOnDealCreated}
				/>
			)

			await waitFor(() => {
				expect(screen.getByPlaceholderText(/search for organization/i)).toBeInTheDocument()
			})

			const searchInput = screen.getByPlaceholderText(/search for organization/i)
			await userEvent.type(searchInput, 'test')

			await waitFor(() => {
				// Loading spinner should be visible
				const loadingIcon = document.querySelector('.animate-spin')
				expect(loadingIcon).toBeInTheDocument()
			})
		})
	})
})

