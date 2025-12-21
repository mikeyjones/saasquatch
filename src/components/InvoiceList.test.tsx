import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvoiceList, type Invoice } from './InvoiceList'

describe('InvoiceList', () => {
	const mockOnViewInvoice = vi.fn()
	const mockOnMarkAsPaid = vi.fn()
	const mockOnDownloadPDF = vi.fn()

	const mockInvoice: Invoice = {
		id: 'invoice-1',
		invoiceNumber: 'INV-001',
		status: 'draft',
		subtotal: 10000,
		tax: 1000,
		total: 11000,
		currency: 'USD',
		issueDate: '2024-01-01',
		dueDate: '2024-01-31',
		paidAt: null,
		lineItems: [
			{
				description: 'Product A',
				quantity: 1,
				unitPrice: 10000,
				total: 10000,
			},
		],
		pdfPath: null,
		billingName: 'Acme Corp',
		billingEmail: 'billing@acme.com',
		notes: null,
		subscription: {
			id: 'sub-1',
			subscriptionNumber: 'SUB-001',
			status: 'active',
			plan: 'Enterprise',
		},
		tenantOrganization: {
			id: 'org-1',
			name: 'Acme Corp',
		},
		createdAt: '2024-01-01',
		updatedAt: '2024-01-01',
	}

	describe('Empty State', () => {
		it('should show empty state when no invoices', () => {
			render(<InvoiceList invoices={[]} />)

			expect(screen.getByText(/no invoices found/i)).toBeInTheDocument()
		})
	})

	describe('Render Behavior', () => {
		it('should render invoice list', () => {
			render(<InvoiceList invoices={[mockInvoice]} />)

			// Invoice number and company name appear in both mobile and desktop views
			const invElements = screen.getAllByText('INV-001')
			expect(invElements.length).toBeGreaterThan(0)
			
			const companyElements = screen.getAllByText('Acme Corp')
			expect(companyElements.length).toBeGreaterThan(0)
		})

		it('should display invoice status', () => {
			render(<InvoiceList invoices={[mockInvoice]} />)

			// Status appears in both mobile and desktop views
			const draftElements = screen.getAllByText('Draft')
			expect(draftElements.length).toBeGreaterThan(0)
		})

		it('should display invoice total', () => {
			render(<InvoiceList invoices={[mockInvoice]} />)

			// Total is $110.00 (11000 cents)
			// Amount appears in both mobile and desktop views
			const totalElements = screen.getAllByText(/\$110\.00/i)
			expect(totalElements.length).toBeGreaterThan(0)
		})

		it('should display different statuses correctly', () => {
			const paidInvoice = { ...mockInvoice, status: 'paid' as const }
			render(<InvoiceList invoices={[paidInvoice]} />)

			// Status appears in both mobile and desktop views
			const paidElements = screen.getAllByText('Paid')
			expect(paidElements.length).toBeGreaterThan(0)
		})
	})

	describe('User Interactions', () => {
		it('should call onViewInvoice when view button is clicked', async () => {
			const user = userEvent.setup()
			render(
				<InvoiceList
					invoices={[mockInvoice]}
					onViewInvoice={mockOnViewInvoice}
				/>
			)

			// Mobile view shows "View" text button, desktop shows icon with title "View Details"
			// Both views render, so use getAllByRole and click the first one
			const viewButtons = screen.getAllByRole('button', { name: /(view|view details)/i })
			expect(viewButtons.length).toBeGreaterThan(0)
			await user.click(viewButtons[0])

			expect(mockOnViewInvoice).toHaveBeenCalledWith(mockInvoice)
		})

		it('should call onMarkAsPaid when mark as paid button is clicked', async () => {
			const user = userEvent.setup()
			render(
				<InvoiceList
					invoices={[mockInvoice]}
					onMarkAsPaid={mockOnMarkAsPaid}
				/>
			)

			// Button text can be "Mark Paid" (mobile) or "Pay" (desktop)
			// Both views render, so use getAllByRole and click the first one
			const markPaidButtons = screen.getAllByRole('button', { name: /(mark paid|pay)/i })
			expect(markPaidButtons.length).toBeGreaterThan(0)
			await user.click(markPaidButtons[0])

			expect(mockOnMarkAsPaid).toHaveBeenCalledWith(mockInvoice)
		})

		it('should call onDownloadPDF when download button is clicked', async () => {
			const user = userEvent.setup()
			const invoiceWithPDF = { ...mockInvoice, pdfPath: '/path/to/invoice.pdf' }

			render(
				<InvoiceList
					invoices={[invoiceWithPDF]}
					onDownloadPDF={mockOnDownloadPDF}
				/>
			)

			// Mobile view shows "PDF" text button, desktop shows icon with title "Download PDF"
			// Both views render, so use getAllByRole and click the first one
			const downloadButtons = screen.getAllByRole('button', { name: /(pdf|download pdf)/i })
			expect(downloadButtons.length).toBeGreaterThan(0)
			await user.click(downloadButtons[0])

			expect(mockOnDownloadPDF).toHaveBeenCalledWith(invoiceWithPDF)
		})

		it('should disable mark as paid button when isMarkingPaid matches invoice id', () => {
			render(
				<InvoiceList
					invoices={[mockInvoice]}
					onMarkAsPaid={mockOnMarkAsPaid}
					isMarkingPaid="invoice-1"
				/>
			)

			// Button text can be "Mark Paid" (mobile) or "Pay" (desktop)
			// Both views render, so use getAllByRole and check all buttons
			const markPaidButtons = screen.getAllByRole('button', { name: /(mark paid|pay|processing)/i })
			expect(markPaidButtons.length).toBeGreaterThan(0)
			// All buttons should be disabled when marking as paid
			markPaidButtons.forEach(button => {
				expect(button).toBeDisabled()
			})
		})
	})

	describe('Multiple Invoices', () => {
		it('should render multiple invoices', () => {
			const invoice2 = { ...mockInvoice, id: 'invoice-2', invoiceNumber: 'INV-002' }
			render(<InvoiceList invoices={[mockInvoice, invoice2]} />)

			// Each invoice appears twice (mobile + desktop views), so use getAllByText
			const inv001Elements = screen.getAllByText('INV-001')
			expect(inv001Elements.length).toBeGreaterThan(0)
			
			const inv002Elements = screen.getAllByText('INV-002')
			expect(inv002Elements.length).toBeGreaterThan(0)
		})
	})
})

