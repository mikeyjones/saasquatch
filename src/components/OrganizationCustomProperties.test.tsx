import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrganizationCustomProperties } from './OrganizationCustomProperties'

describe('OrganizationCustomProperties', () => {
	const mockOnUpdate = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		mockOnUpdate.mockResolvedValue(undefined)
	})

	describe('Render Behavior', () => {
		it('should render empty state when no properties', () => {
			render(<OrganizationCustomProperties metadata={{}} onUpdate={mockOnUpdate} />)

			expect(screen.getByText(/no custom properties yet/i)).toBeInTheDocument()
		})

		it('should render Add First Property button when empty', () => {
			render(<OrganizationCustomProperties metadata={{}} onUpdate={mockOnUpdate} />)

			expect(screen.getByRole('button', { name: /add first property/i })).toBeInTheDocument()
		})

		it('should render property count when properties exist', () => {
			const metadata = { key1: 'value1', key2: 'value2' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			expect(screen.getByText(/2 custom properties/i)).toBeInTheDocument()
		})

		it('should render singular property text for one property', () => {
			const metadata = { key1: 'value1' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			expect(screen.getByText(/1 custom property/i)).toBeInTheDocument()
		})

		it('should render property names and values', () => {
			const metadata = { 'Account Manager': 'John Smith', Region: 'EMEA' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			expect(screen.getByText('Account Manager')).toBeInTheDocument()
			expect(screen.getByText('John Smith')).toBeInTheDocument()
			expect(screen.getByText('Region')).toBeInTheDocument()
			expect(screen.getByText('EMEA')).toBeInTheDocument()
		})

		it('should display object values as JSON string', () => {
			const metadata = { config: { nested: true } }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			expect(screen.getByText('{"nested":true}')).toBeInTheDocument()
		})

		it('should show Empty text for empty string values', () => {
			const metadata = { emptyProp: '' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			expect(screen.getByText('Empty')).toBeInTheDocument()
		})
	})

	describe('Edit Mode', () => {
		it('should render Edit Properties button', () => {
			const metadata = { key1: 'value1' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			expect(screen.getByRole('button', { name: /edit properties/i })).toBeInTheDocument()
		})

		it('should enter edit mode when Edit Properties is clicked', async () => {
			const user = userEvent.setup()
			const metadata = { key1: 'value1' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			await user.click(screen.getByRole('button', { name: /edit properties/i }))

			expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
		})

		it('should show Add New Property form in edit mode', async () => {
			const user = userEvent.setup()
			const metadata = { key1: 'value1' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			await user.click(screen.getByRole('button', { name: /edit properties/i }))

			expect(screen.getByText('Add New Property')).toBeInTheDocument()
			expect(screen.getByLabelText(/property name/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/value/i)).toBeInTheDocument()
		})

		it('should show delete buttons in edit mode', async () => {
			const user = userEvent.setup()
			const metadata = { key1: 'value1' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			await user.click(screen.getByRole('button', { name: /edit properties/i }))

			// Should have X button to delete
			const buttons = screen.getAllByRole('button')
			const deleteButton = buttons.find((btn) =>
				btn.classList.contains('text-destructive')
			)
			expect(deleteButton).toBeTruthy()
		})
	})

	describe('Adding Properties', () => {
		it('should add new property when Add button is clicked', async () => {
			const user = userEvent.setup()
			render(<OrganizationCustomProperties metadata={{}} onUpdate={mockOnUpdate} />)

			await user.click(screen.getByRole('button', { name: /add first property/i }))

			const nameInput = screen.getByLabelText(/property name/i)
			const valueInput = screen.getByLabelText(/value/i)

			await user.type(nameInput, 'New Key')
			await user.type(valueInput, 'New Value')
			await user.click(screen.getByRole('button', { name: /^add$/i }))

			expect(screen.getByText('New Key')).toBeInTheDocument()
		})

		it('should disable Add button when property name is empty', async () => {
			const user = userEvent.setup()
			render(<OrganizationCustomProperties metadata={{}} onUpdate={mockOnUpdate} />)

			await user.click(screen.getByRole('button', { name: /add first property/i }))

			const addButton = screen.getByRole('button', { name: /^add$/i })
			expect(addButton).toBeDisabled()
		})

		it('should clear inputs after adding property', async () => {
			const user = userEvent.setup()
			render(<OrganizationCustomProperties metadata={{}} onUpdate={mockOnUpdate} />)

			await user.click(screen.getByRole('button', { name: /add first property/i }))

			const nameInput = screen.getByLabelText(/property name/i) as HTMLInputElement
			const valueInput = screen.getByLabelText(/value/i) as HTMLInputElement

			await user.type(nameInput, 'Test Key')
			await user.type(valueInput, 'Test Value')
			await user.click(screen.getByRole('button', { name: /^add$/i }))

			expect(nameInput.value).toBe('')
			expect(valueInput.value).toBe('')
		})
	})

	describe('Removing Properties', () => {
		it('should remove property when delete button is clicked', async () => {
			const user = userEvent.setup()
			const metadata = { key1: 'value1', key2: 'value2' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			await user.click(screen.getByRole('button', { name: /edit properties/i }))

			// Find and click the first delete button
			const deleteButtons = screen.getAllByRole('button').filter((btn) =>
				btn.classList.contains('text-destructive')
			)
			await user.click(deleteButtons[0])

			// One property should be removed
			expect(screen.queryByText('key1')).not.toBeInTheDocument() || expect(screen.queryByText('key2')).not.toBeInTheDocument()
		})
	})

	describe('Saving Changes', () => {
		it('should call onUpdate when Save is clicked', async () => {
			const user = userEvent.setup()
			const metadata = { key1: 'value1' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			await user.click(screen.getByRole('button', { name: /edit properties/i }))
			await user.click(screen.getByRole('button', { name: /save changes/i }))

			await waitFor(() => {
				expect(mockOnUpdate).toHaveBeenCalledWith(metadata)
			})
		})

		it('should exit edit mode after successful save', async () => {
			const user = userEvent.setup()
			const metadata = { key1: 'value1' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			await user.click(screen.getByRole('button', { name: /edit properties/i }))
			await user.click(screen.getByRole('button', { name: /save changes/i }))

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /edit properties/i })).toBeInTheDocument()
			})
		})

		it('should show Saving... while save is in progress', async () => {
			const user = userEvent.setup()
			// Make onUpdate take some time
			mockOnUpdate.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

			const metadata = { key1: 'value1' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			await user.click(screen.getByRole('button', { name: /edit properties/i }))
			await user.click(screen.getByRole('button', { name: /save changes/i }))

			expect(screen.getByText(/saving/i)).toBeInTheDocument()
		})
	})

	describe('Canceling Changes', () => {
		it('should revert changes when Cancel is clicked', async () => {
			const user = userEvent.setup()
			const metadata = { key1: 'value1' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			await user.click(screen.getByRole('button', { name: /edit properties/i }))

			// Add a new property
			const nameInput = screen.getByLabelText(/property name/i)
			const valueInput = screen.getByLabelText(/value/i)
			await user.type(nameInput, 'New Key')
			await user.type(valueInput, 'New Value')
			await user.click(screen.getByRole('button', { name: /^add$/i }))

			// Cancel
			await user.click(screen.getByRole('button', { name: /cancel/i }))

			// New property should not be visible
			expect(screen.queryByText('New Key')).not.toBeInTheDocument()
		})

		it('should exit edit mode when Cancel is clicked', async () => {
			const user = userEvent.setup()
			const metadata = { key1: 'value1' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			await user.click(screen.getByRole('button', { name: /edit properties/i }))
			await user.click(screen.getByRole('button', { name: /cancel/i }))

			expect(screen.getByRole('button', { name: /edit properties/i })).toBeInTheDocument()
		})
	})

	describe('Editing Values', () => {
		it('should allow editing property values in edit mode', async () => {
			const user = userEvent.setup()
			const metadata = { key1: 'value1' }
			render(<OrganizationCustomProperties metadata={metadata} onUpdate={mockOnUpdate} />)

			await user.click(screen.getByRole('button', { name: /edit properties/i }))

			// Find the value input
			const valueInput = screen.getByDisplayValue('value1') as HTMLInputElement
			await user.clear(valueInput)
			await user.type(valueInput, 'updated value')

			await user.click(screen.getByRole('button', { name: /save changes/i }))

			await waitFor(() => {
				expect(mockOnUpdate).toHaveBeenCalledWith({ key1: 'updated value' })
			})
		})
	})
})

