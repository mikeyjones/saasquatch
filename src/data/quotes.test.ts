import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	fetchQuotes,
	fetchQuote,
	createQuote,
	updateQuote,
	deleteQuote,
	sendQuote,
	acceptQuote,
	rejectQuote,
	getQuotePDFUrl,
	type Quote,
	type CreateQuoteInput,
	type UpdateQuoteInput,
} from './quotes'
import { mockFetchSuccess, mockFetchError } from '@/test/setup'

describe('Quotes Data Layer', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		global.fetch = vi.fn()
	})

	describe('fetchQuotes', () => {
		it('should fetch quotes without filters', async () => {
			const mockQuotes: Quote[] = [
				{
					id: 'quote-1',
					quoteNumber: 'QUO-ACME-1001',
					status: 'draft',
					version: 1,
					subtotal: 10000,
					tax: 2000,
					total: 12000,
					currency: 'USD',
					validUntil: null,
					lineItems: [],
					pdfPath: null,
					notes: null,
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
					sentAt: null,
					acceptedAt: null,
					rejectedAt: null,
					tenantOrganization: { id: 'tenant-1', name: 'Acme Corp' },
					deal: null,
					productPlan: null,
				},
			]

			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess({ quotes: mockQuotes })
			)

			const result = await fetchQuotes('acme')

			// URL includes trailing ? even with no params due to URLSearchParams.toString()
			expect(fetch).toHaveBeenCalledWith('/api/tenant/acme/quotes?')
			expect(result).toEqual(mockQuotes)
		})

		it('should include status filter in query params', async () => {
			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess({ quotes: [] })
			)

			await fetchQuotes('acme', { status: 'draft' })

			expect(fetch).toHaveBeenCalledWith('/api/tenant/acme/quotes?status=draft')
		})

		it('should include multiple filters in query params', async () => {
			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess({ quotes: [] })
			)

			await fetchQuotes('acme', {
				status: 'sent',
				tenantOrgId: 'tenant-1',
				dealId: 'deal-1',
			})

			const callUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]
			expect(callUrl).toContain('status=sent')
			expect(callUrl).toContain('tenantOrgId=tenant-1')
			expect(callUrl).toContain('dealId=deal-1')
		})

		it('should throw error on API failure', async () => {
			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchError('Failed to fetch quotes', 500)
			)

			await expect(fetchQuotes('acme')).rejects.toThrow('Failed to fetch quotes')
		})
	})

	describe('fetchQuote', () => {
		it('should fetch single quote by ID', async () => {
			const mockQuote: Quote = {
				id: 'quote-1',
				quoteNumber: 'QUO-ACME-1001',
				status: 'draft',
				version: 1,
				subtotal: 10000,
				tax: 2000,
				total: 12000,
				currency: 'USD',
				validUntil: null,
				lineItems: [],
				pdfPath: null,
				notes: null,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				sentAt: null,
				acceptedAt: null,
				rejectedAt: null,
				convertedToInvoiceId: null,
				tenantOrganization: { id: 'tenant-1', name: 'Acme Corp' },
				deal: null,
				productPlan: null,
			}

			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess({ quote: mockQuote })
			)

			const result = await fetchQuote('acme', 'quote-1')

			expect(fetch).toHaveBeenCalledWith('/api/tenant/acme/quotes/quote-1')
			expect(result).toEqual(mockQuote)
		})

		it('should return null on 404', async () => {
			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchError('Quote not found', 404)
			)

			const result = await fetchQuote('acme', 'quote-1')
			expect(result).toBeNull()
		})

		it('should throw error on non-404 API failure', async () => {
			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchError('Internal server error', 500)
			)

			await expect(fetchQuote('acme', 'quote-1')).rejects.toThrow()
		})
	})

	describe('createQuote', () => {
		it('should create quote with required fields', async () => {
			const input: CreateQuoteInput = {
				tenantOrganizationId: 'tenant-1',
				lineItems: [
					{ description: 'Service A', quantity: 1, unitPrice: 10000, total: 10000 },
				],
			}

			const mockResponse = {
				success: true,
				quote: {
					id: 'quote-1',
					quoteNumber: 'QUO-ACME-1001',
					status: 'draft',
					subtotal: 10000,
					total: 10000,
					currency: 'USD',
					createdAt: '2024-01-01T00:00:00.000Z',
				},
			}

			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess(mockResponse, 201)
			)

			const result = await createQuote('acme', input)

			expect(fetch).toHaveBeenCalledWith('/api/tenant/acme/quotes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
			})
			expect(result.success).toBe(true)
		})

		it('should include optional fields when provided', async () => {
			const input: CreateQuoteInput = {
				tenantOrganizationId: 'tenant-1',
				lineItems: [
					{ description: 'Service A', quantity: 1, unitPrice: 10000, total: 10000 },
				],
				dealId: 'deal-1',
				productPlanId: 'plan-1',
				validUntil: '2024-12-31',
				tax: 2000,
				notes: 'Test notes',
			}

			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess({ success: true }, 201)
			)

			await createQuote('acme', input)

			const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
			expect(callBody.dealId).toBe('deal-1')
			expect(callBody.productPlanId).toBe('plan-1')
			expect(callBody.validUntil).toBe('2024-12-31')
			expect(callBody.tax).toBe(2000)
			expect(callBody.notes).toBe('Test notes')
		})

		it('should return error on failure', async () => {
			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchError('Failed to create quote', 400)
			)

			const result = await createQuote('acme', {
				tenantOrganizationId: 'tenant-1',
				lineItems: [],
			})

			expect(result.success).toBe(false)
			expect(result.error).toBe('Failed to create quote')
		})
	})

	describe('updateQuote', () => {
		it('should update quote with provided fields', async () => {
			const input: UpdateQuoteInput = {
				lineItems: [
					{ description: 'Updated Service', quantity: 2, unitPrice: 5000, total: 10000 },
				],
				tax: 2000,
			}

			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess({ success: true })
			)

			const result = await updateQuote('acme', 'quote-1', input)

			expect(fetch).toHaveBeenCalledWith('/api/tenant/acme/quotes/quote-1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
			})
			expect(result.success).toBe(true)
		})

		it('should handle null values for optional fields', async () => {
			const input: UpdateQuoteInput = {
				dealId: null,
				productPlanId: null,
				notes: null,
			}

			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess({ success: true })
			)

			await updateQuote('acme', 'quote-1', input)

			const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
			expect(callBody.dealId).toBeNull()
			expect(callBody.productPlanId).toBeNull()
			expect(callBody.notes).toBeNull()
		})
	})

	describe('deleteQuote', () => {
		it('should delete quote', async () => {
			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess({ success: true })
			)

			const result = await deleteQuote('acme', 'quote-1')

			expect(fetch).toHaveBeenCalledWith('/api/tenant/acme/quotes/quote-1', {
				method: 'DELETE',
			})
			expect(result.success).toBe(true)
		})
	})

	describe('sendQuote', () => {
		it('should send quote', async () => {
			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess({ success: true })
			)

			const result = await sendQuote('acme', 'quote-1')

			expect(fetch).toHaveBeenCalledWith('/api/tenant/acme/quotes/quote-1/send', {
				method: 'POST',
			})
			expect(result.success).toBe(true)
		})
	})

	describe('acceptQuote', () => {
		it('should accept quote', async () => {
			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess({ success: true, invoice: { id: 'inv-1', invoiceNumber: 'INV-001' } })
			)

			const result = await acceptQuote('acme', 'quote-1')

			expect(fetch).toHaveBeenCalledWith('/api/tenant/acme/quotes/quote-1/accept', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			})
			expect(result.success).toBe(true)
		})

		it('should accept quote with options', async () => {
			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess({ success: true, invoice: { id: 'inv-1', invoiceNumber: 'INV-001' } })
			)

			const options = { issueDate: '2024-01-01', dueDate: '2024-02-01' }
			const result = await acceptQuote('acme', 'quote-1', options)

			expect(fetch).toHaveBeenCalledWith('/api/tenant/acme/quotes/quote-1/accept', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(options),
			})
			expect(result.success).toBe(true)
		})
	})

	describe('rejectQuote', () => {
		it('should reject quote', async () => {
			;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess({ success: true })
			)

			const result = await rejectQuote('acme', 'quote-1')

			expect(fetch).toHaveBeenCalledWith('/api/tenant/acme/quotes/quote-1/reject', {
				method: 'POST',
			})
			expect(result.success).toBe(true)
		})
	})

	describe('getQuotePDFUrl', () => {
		it('should return correct PDF URL', () => {
			const url = getQuotePDFUrl('acme', 'quote-1')
			expect(url).toBe('/api/tenant/acme/quotes/quote-1/pdf')
		})
	})
})

