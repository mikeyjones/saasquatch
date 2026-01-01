import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuoteDetailDialog } from './QuoteDetailDialog'
import type { Quote } from '@/data/quotes'

const mockQuote: Quote = {
	id: 'quote-1',
	quoteNumber: 'QUO-ACME-1001',
	status: 'draft',
	version: 1,
	subtotal: 10000,
	tax: 2000,
	total: 12000,
	currency: 'USD',
	validUntil: '2024-12-31T00:00:00.000Z',
	lineItems: [
		{ description: 'Service A', quantity: 2, unitPrice: 5000, total: 10000 },
	],
	pdfPath: null,
	notes: 'Test notes',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
	sentAt: null,
	acceptedAt: null,
	rejectedAt: null,
	convertedToInvoiceId: null,
	tenantOrganization: {
		id: 'tenant-1',
		name: 'Acme Corp',
	},
	deal: null,
	productPlan: null,
}

const mockSentQuote: Quote = {
	...mockQuote,
	id: 'quote-2',
	status: 'sent',
	sentAt: '2024-01-02T00:00:00.000Z',
	pdfPath: '/quotes/org-123/QUO-ACME-1002.pdf',
}

describe('QuoteDetailDialog', () => {
	describe('Render Behavior', () => {
		it('should not render when quote is null', () => {
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={null}
				/>
			)
			expect(screen.queryByText('QUO-ACME-1001')).not.toBeInTheDocument()
		})

		it('should render dialog when open with quote', () => {
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
				/>
			)
			// Quote number appears in the title
			expect(screen.getByText(/Quote QUO-ACME-1001/i)).toBeInTheDocument()
		})

		it('should display quote number in title', () => {
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
				/>
			)
			expect(screen.getByText(/Quote QUO-ACME-1001/i)).toBeInTheDocument()
		})

		it('should display customer name', () => {
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
				/>
			)
			expect(screen.getByText('Acme Corp')).toBeInTheDocument()
		})

		it('should display status badge', () => {
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
				/>
			)
			expect(screen.getByText('Draft')).toBeInTheDocument()
		})
	})

	describe('Line Items Display', () => {
		it('should display line items table', () => {
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
				/>
			)
			expect(screen.getByText('Line Items')).toBeInTheDocument()
			expect(screen.getByText('Service A')).toBeInTheDocument()
		})

		it('should display line item details', () => {
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
				/>
			)
			expect(screen.getByText('Service A')).toBeInTheDocument()
			expect(screen.getByText('2')).toBeInTheDocument() // Quantity
			expect(screen.getByText('$50.00')).toBeInTheDocument() // Unit price
			// Total $100.00 may appear in line item and subtotal
			expect(screen.getAllByText('$100.00').length).toBeGreaterThan(0)
		})
	})

	describe('Totals Display', () => {
		it('should display subtotal', () => {
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
				/>
			)
			expect(screen.getByText('Subtotal')).toBeInTheDocument()
			// Subtotal is $100.00 (10000 cents) - may appear multiple times
			expect(screen.getAllByText('$100.00').length).toBeGreaterThan(0)
		})

		it('should display tax', () => {
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
				/>
			)
			expect(screen.getByText('Tax')).toBeInTheDocument()
			// Tax is $20.00 (2000 cents)
			expect(screen.getByText('$20.00')).toBeInTheDocument()
		})

		it('should display total', () => {
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
				/>
			)
			// Total appears in table header and totals section
			expect(screen.getAllByText('Total').length).toBeGreaterThan(0)
			// Total is $120.00 (12000 cents)
			expect(screen.getByText('$120.00')).toBeInTheDocument()
		})
	})

	describe('Notes Display', () => {
		it('should display notes when present', () => {
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
				/>
			)
			expect(screen.getByText('Notes')).toBeInTheDocument()
			expect(screen.getByText('Test notes')).toBeInTheDocument()
		})

		it('should not display notes section when notes is null', () => {
			const quoteWithoutNotes = { ...mockQuote, notes: null }
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={quoteWithoutNotes}
				/>
			)
			expect(screen.queryByText('Notes')).not.toBeInTheDocument()
		})
	})

	describe('Action Buttons', () => {
		it('should show Send button for draft quotes', () => {
			const onSendQuote = vi.fn()
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
					onSendQuote={onSendQuote}
				/>
			)
			expect(screen.getByRole('button', { name: /send quote/i })).toBeInTheDocument()
		})

		it('should show Accept and Reject buttons for sent quotes', () => {
			const onAcceptQuote = vi.fn()
			const onRejectQuote = vi.fn()
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockSentQuote}
					onAcceptQuote={onAcceptQuote}
					onRejectQuote={onRejectQuote}
				/>
			)
			// Button text is "Accept & Convert to Invoice"
			expect(screen.getByRole('button', { name: /accept.*convert/i })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
		})

		it('should show Download PDF button when pdfPath exists', () => {
			const onDownloadPDF = vi.fn()
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockSentQuote}
					onDownloadPDF={onDownloadPDF}
				/>
			)
			expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument()
		})

		it('should call onSendQuote when Send button is clicked', async () => {
			const user = userEvent.setup()
			const onSendQuote = vi.fn()
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
					onSendQuote={onSendQuote}
				/>
			)

			const sendButton = screen.getByRole('button', { name: /send quote/i })
			await user.click(sendButton)

			expect(onSendQuote).toHaveBeenCalledWith(mockQuote)
		})

		it('should call onAcceptQuote when Accept button is clicked', async () => {
			const user = userEvent.setup()
			const onAcceptQuote = vi.fn()
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockSentQuote}
					onAcceptQuote={onAcceptQuote}
				/>
			)

			// Button text is "Accept & Convert to Invoice"
			const acceptButton = screen.getByRole('button', { name: /accept.*convert/i })
			await user.click(acceptButton)

			expect(onAcceptQuote).toHaveBeenCalledWith(mockSentQuote)
		})

		it('should call onRejectQuote when Reject button is clicked', async () => {
			const user = userEvent.setup()
			const onRejectQuote = vi.fn()
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockSentQuote}
					onRejectQuote={onRejectQuote}
				/>
			)

			const rejectButton = screen.getByRole('button', { name: /reject/i })
			await user.click(rejectButton)

			expect(onRejectQuote).toHaveBeenCalledWith(mockSentQuote)
		})

		it('should disable buttons when isProcessing is true', () => {
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
					onSendQuote={vi.fn()}
					isProcessing={true}
				/>
			)
			// When processing, button shows "Sending..."
			const sendButton = screen.getByRole('button', { name: /sending/i })
			expect(sendButton).toBeDisabled()
		})
	})

	describe('Close Behavior', () => {
		it('should call onOpenChange(false) when Close button is clicked', async () => {
			const user = userEvent.setup()
			const onOpenChange = vi.fn()
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={onOpenChange}
					quote={mockQuote}
				/>
			)

			// Get the Close button in the footer (not the X button)
			const closeButtons = screen.getAllByRole('button', { name: /close/i })
			// Click the last one which should be the footer button
			await user.click(closeButtons[closeButtons.length - 1])

			expect(onOpenChange).toHaveBeenCalledWith(false)
		})
	})

	describe('Deal and Product Plan Display', () => {
		it('should display linked deal when present', () => {
			const quoteWithDeal = {
				...mockQuote,
				deal: { id: 'deal-1', name: 'Enterprise Deal' },
			}
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={quoteWithDeal}
				/>
			)
			expect(screen.getByText('Enterprise Deal')).toBeInTheDocument()
		})

		it('should display linked product plan when present', () => {
			const quoteWithPlan = {
				...mockQuote,
				productPlan: { id: 'plan-1', name: 'Pro Plan' },
			}
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={quoteWithPlan}
				/>
			)
			expect(screen.getByText('Pro Plan')).toBeInTheDocument()
		})

		it('should not show deal or plan sections when not present', () => {
			render(
				<QuoteDetailDialog
					open={true}
					onOpenChange={() => {}}
					quote={mockQuote}
				/>
			)
			// Should show customer but not deal or plan sections
			expect(screen.getByText('Acme Corp')).toBeInTheDocument()
			expect(screen.queryByText(/deal/i)).not.toBeInTheDocument()
			expect(screen.queryByText(/product plan/i)).not.toBeInTheDocument()
		})
	})
})

