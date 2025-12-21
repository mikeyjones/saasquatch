import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlaybookDialog } from './PlaybookDialog'
import * as router from '@tanstack/react-router'
import * as knowledgeData from '@/data/knowledge'

vi.mock('@tanstack/react-router', () => ({
	useParams: vi.fn(() => ({ tenant: 'acme' })),
}))

vi.mock('@/data/knowledge', () => ({
	createPlaybook: vi.fn(),
	updatePlaybook: vi.fn(),
	categoryOptions: [],
	playbookStatusOptions: [],
	playbookTypeOptions: [],
}))

const mockUseParams = router.useParams as ReturnType<typeof vi.fn>

describe('PlaybookDialog', () => {
	const mockOnOpenChange = vi.fn()
	const mockOnSaved = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		mockUseParams.mockReturnValue({ tenant: 'acme' })
	})

	describe('Render Behavior', () => {
		it('should render dialog when open', () => {
			render(
				<PlaybookDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>
			)

			expect(screen.getByRole('heading', { name: /playbook/i })).toBeInTheDocument()
		})

		it('should show create title in create mode', () => {
			render(
				<PlaybookDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>
			)

			expect(screen.getByRole('heading', { name: /create new playbook/i })).toBeInTheDocument()
		})

		it('should show edit title in edit mode', () => {
			const mockPlaybook = {
				id: 'playbook-1',
				name: 'Test Playbook',
				description: 'Description',
				type: 'manual' as const,
				steps: [],
				triggers: [],
				actions: [],
				category: null,
				tags: [],
				status: 'draft' as const,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				timeAgo: '1 day ago',
				createdBy: null,
				updatedBy: null,
			}

			render(
				<PlaybookDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
					playbook={mockPlaybook}
				/>
			)

			expect(screen.getByRole('heading', { name: /edit playbook/i })).toBeInTheDocument()
		})
	})

	describe('Form Fields', () => {
		it('should render name field', () => {
			render(
				<PlaybookDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>
			)

			expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
		})

		it('should render description field', () => {
			render(
				<PlaybookDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>
			)

			expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
		})
	})

	describe('Form Submission', () => {
		it('should call createPlaybook when form is submitted', async () => {
			const user = userEvent.setup()
			vi.mocked(knowledgeData.createPlaybook).mockResolvedValueOnce({
				success: true,
				playbook: {
					id: 'playbook-1',
					name: 'New Playbook',
					description: 'Description',
					type: 'manual' as const,
					steps: [],
					triggers: [],
					actions: [],
					category: null,
					tags: [],
					status: 'draft' as const,
					createdAt: '2024-01-01',
					updatedAt: '2024-01-01',
					timeAgo: 'just now',
					createdBy: null,
					updatedBy: null,
				},
			})

			render(
				<PlaybookDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>
			)

			await user.type(screen.getByLabelText(/name/i), 'New Playbook')
			const submitButton = screen.getByRole('button', { name: /create/i })
			await user.click(submitButton)

			await waitFor(() => {
				expect(knowledgeData.createPlaybook).toHaveBeenCalledWith('acme', expect.any(Object))
			})
		})

		it('should call onSaved callback after successful submission', async () => {
			const user = userEvent.setup()
			vi.mocked(knowledgeData.createPlaybook).mockResolvedValueOnce({
				success: true,
				playbook: {
					id: 'playbook-1',
					name: 'New Playbook',
					description: 'Description',
					type: 'manual' as const,
					steps: [],
					triggers: [],
					actions: [],
					category: null,
					tags: [],
					status: 'draft' as const,
					createdAt: '2024-01-01',
					updatedAt: '2024-01-01',
					timeAgo: 'just now',
					createdBy: null,
					updatedBy: null,
				},
			})

			render(
				<PlaybookDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>
			)

			await user.type(screen.getByLabelText(/name/i), 'New Playbook')
			const submitButton = screen.getByRole('button', { name: /create/i })
			await user.click(submitButton)

			await waitFor(() => {
				expect(mockOnSaved).toHaveBeenCalled()
			})
		})
	})

	describe('Cancel Button', () => {
		it('should call onOpenChange(false) when Cancel clicked', async () => {
			const user = userEvent.setup()

			render(
				<PlaybookDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>
			)

			const cancelButton = screen.getByRole('button', { name: /cancel/i })
			await user.click(cancelButton)

			expect(mockOnOpenChange).toHaveBeenCalledWith(false)
		})
	})
})

