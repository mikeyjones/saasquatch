import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuoteList } from './QuoteList'
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
		{ description: 'Service A', quantity: 1, unitPrice: 10000, total: 10000 },
	],
	pdfPath: null,
	notes: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
	sentAt: null,
	acceptedAt: null,
	rejectedAt: null,
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
	quoteNumber: 'QUO-ACME-1002',
	status: 'sent',
	sentAt: '2024-01-02T00:00:00.000Z',
	pdfPath: '/quotes/org-123/QUO-ACME-1002.pdf',
}

const mockAcceptedQuote: Quote = {
	...mockQuote,
	id: 'quote-3',
	quoteNumber: 'QUO-ACME-1003',
	status: 'accepted',
	acceptedAt: '2024-01-03T00:00:00.000Z',
}

describe('QuoteList', () => {
	// Note: The QuoteList component renders both mobile and desktop views,
	// so elements often appear twice. We use getAllByText/getAllByRole where needed.

	describe('Render Behavior', () => {
		it('should render empty state when no quotes', () => {
			render(<QuoteList quotes={[]} />)
			expect(screen.getByText('No quotes found')).toBeInTheDocument()
		})

		it('should render quote items', () => {
			render(<QuoteList quotes={[mockQuote]} />)
			// Component renders both mobile and desktop views
			expect(screen.getAllByText('QUO-ACME-1001').length).toBeGreaterThan(0)
			expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0)
		})

		it('should display quote number', () => {
			render(<QuoteList quotes={[mockQuote]} />)
			expect(screen.getAllByText('QUO-ACME-1001').length).toBeGreaterThan(0)
		})

		it('should display customer name', () => {
			render(<QuoteList quotes={[mockQuote]} />)
			expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0)
		})

		it('should display total amount', () => {
			render(<QuoteList quotes={[mockQuote]} />)
			expect(screen.getAllByText('$120.00').length).toBeGreaterThan(0)
		})

		it('should display valid until date', () => {
			render(<QuoteList quotes={[mockQuote]} />)
			expect(screen.getAllByText(/Dec 31, 2024/i).length).toBeGreaterThan(0)
		})
	})

	describe('Status Display', () => {
		it('should show draft status badge', () => {
			render(<QuoteList quotes={[mockQuote]} />)
			expect(screen.getAllByText('Draft').length).toBeGreaterThan(0)
		})

		it('should show sent status badge', () => {
			render(<QuoteList quotes={[mockSentQuote]} />)
			expect(screen.getAllByText('Sent').length).toBeGreaterThan(0)
		})

		it('should show accepted status badge', () => {
			render(<QuoteList quotes={[mockAcceptedQuote]} />)
			expect(screen.getAllByText('Accepted').length).toBeGreaterThan(0)
		})

		it('should display multiple quotes with different statuses', () => {
			render(<QuoteList quotes={[mockQuote, mockSentQuote, mockAcceptedQuote]} />)
			expect(screen.getAllByText('Draft').length).toBeGreaterThan(0)
			expect(screen.getAllByText('Sent').length).toBeGreaterThan(0)
			expect(screen.getAllByText('Accepted').length).toBeGreaterThan(0)
		})
	})

	describe('Action Buttons', () => {
		it('should show View button when onViewQuote is provided', async () => {
			const user = userEvent.setup()
			const onViewQuote = vi.fn()
			render(<QuoteList quotes={[mockQuote]} onViewQuote={onViewQuote} />)

			// Get all view buttons (mobile + desktop)
			const viewButtons = screen.getAllByRole('button', { name: /view/i })
			expect(viewButtons.length).toBeGreaterThan(0)

			await user.click(viewButtons[0])
			expect(onViewQuote).toHaveBeenCalledWith(mockQuote)
		})

		it('should show Send button for draft quotes when onSendQuote is provided', () => {
			const onSendQuote = vi.fn()
			render(<QuoteList quotes={[mockQuote]} onSendQuote={onSendQuote} />)

			const sendButtons = screen.getAllByRole('button', { name: /send/i })
			expect(sendButtons.length).toBeGreaterThan(0)
		})

		it('should not show Send button for non-draft quotes', () => {
			render(<QuoteList quotes={[mockSentQuote]} onSendQuote={vi.fn()} />)
			expect(screen.queryByRole('button', { name: /send/i })).not.toBeInTheDocument()
		})

		it('should show Download PDF button when pdfPath exists', () => {
			const onDownloadPDF = vi.fn()
			render(<QuoteList quotes={[mockSentQuote]} onDownloadPDF={onDownloadPDF} />)

			// Download button contains Download icon (svg.lucide-download)
			const buttons = screen.getAllByRole('button')
			const downloadButtons = buttons.filter(btn => 
				btn.querySelector('.lucide-download')
			)
			expect(downloadButtons.length).toBeGreaterThan(0)
		})

		it('should not show Download PDF button when pdfPath is null', () => {
			render(<QuoteList quotes={[mockQuote]} onDownloadPDF={vi.fn()} />)
			// Query all buttons - there might be none if no actions are available
			const buttons = screen.queryAllByRole('button')
			const downloadButtons = buttons.filter(btn => 
				btn.querySelector('.lucide-download')
			)
			expect(downloadButtons.length).toBe(0)
		})

		it('should call onDownloadPDF when Download button is clicked', async () => {
			const user = userEvent.setup()
			const onDownloadPDF = vi.fn()
			render(<QuoteList quotes={[mockSentQuote]} onDownloadPDF={onDownloadPDF} />)

			// Download button contains Download icon
			const buttons = screen.getAllByRole('button')
			const downloadButtons = buttons.filter(btn => 
				btn.querySelector('.lucide-download')
			)
			await user.click(downloadButtons[0])

			expect(onDownloadPDF).toHaveBeenCalledWith(mockSentQuote)
		})

		it('should disable Send button when isSending matches quote id', () => {
			render(<QuoteList quotes={[mockQuote]} onSendQuote={vi.fn()} isSending="quote-1" />)

			// Component renders both mobile and desktop views
			const sendButtons = screen.getAllByRole('button', { name: /send/i })
			// At least one button should be disabled
			expect(sendButtons.some(btn => btn.hasAttribute('disabled'))).toBe(true)
		})
	})

	describe('Multiple Quotes', () => {
		it('should render all quotes in list', () => {
			const quotes = [mockQuote, mockSentQuote, mockAcceptedQuote]
			render(<QuoteList quotes={quotes} />)

			// Component renders both mobile and desktop views
			expect(screen.getAllByText('QUO-ACME-1001').length).toBeGreaterThan(0)
			expect(screen.getAllByText('QUO-ACME-1002').length).toBeGreaterThan(0)
			expect(screen.getAllByText('QUO-ACME-1003').length).toBeGreaterThan(0)
		})

		it('should display correct customer for each quote', () => {
			const quotes = [
				mockQuote,
				{ ...mockSentQuote, tenantOrganization: { id: 'tenant-2', name: 'Beta Inc' } },
			]
			render(<QuoteList quotes={quotes} />)

			// Component renders both mobile and desktop views
			expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0)
			expect(screen.getAllByText('Beta Inc').length).toBeGreaterThan(0)
		})
	})
})
