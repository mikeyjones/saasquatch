/**
 * Quotes Data Layer
 *
 * Functions for fetching and mutating quotes from the API.
 * These functions are used by the UI components to interact with quotes.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a line item in a quote.
 */
export interface QuoteLineItem {
	description: string
	quantity: number
	unitPrice: number // in cents
	total: number // in cents
}

/**
 * Represents a quote with all its details.
 */
export interface Quote {
	id: string
	quoteNumber: string
	status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'
	version: number
	parentQuoteId?: string | null
	subtotal: number // in cents
	tax: number // in cents
	total: number // in cents
	currency: string
	validUntil?: string | null
	lineItems: QuoteLineItem[]
	pdfPath?: string | null
	billingName?: string | null
	billingEmail?: string | null
	notes?: string | null
	sentAt?: string | null
	acceptedAt?: string | null
	rejectedAt?: string | null
	tenantOrganization: {
		id: string
		name: string
	}
	deal?: {
		id: string
		name: string
	} | null
	productPlan?: {
		id: string
		name: string
	} | null
	convertedInvoice?: {
		id: string
		invoiceNumber: string
	} | null
	createdAt: string
	updatedAt: string
}

/**
 * Input structure for creating a new quote.
 */
export interface CreateQuoteInput {
	tenantOrganizationId: string
	lineItems: QuoteLineItem[]
	dealId?: string
	productPlanId?: string
	validUntil?: string
	tax?: number
	notes?: string
}

/**
 * Input structure for updating an existing quote.
 */
export interface UpdateQuoteInput {
	lineItems?: QuoteLineItem[]
	dealId?: string | null
	productPlanId?: string | null
	validUntil?: string | null
	tax?: number
	notes?: string | null
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetches all quotes for a tenant organization.
 * @param tenantSlug The slug of the tenant organization.
 * @param filters Optional filters to apply (e.g., status, tenantOrgId, dealId).
 * @returns A promise that resolves to an array of Quote objects.
 */
export async function fetchQuotes(
	tenantSlug: string,
	filters?: { status?: string; tenantOrgId?: string; dealId?: string }
): Promise<Quote[]> {
	const params = new URLSearchParams()
	if (filters?.status) params.append('status', filters.status)
	if (filters?.tenantOrgId) params.append('tenantOrgId', filters.tenantOrgId)
	if (filters?.dealId) params.append('dealId', filters.dealId)

	const response = await fetch(`/api/tenant/${tenantSlug}/quotes?${params.toString()}`)
	if (!response.ok) {
		throw new Error(`Failed to fetch quotes: ${response.statusText}`)
	}

	const data = await response.json()
	return data.quotes || []
}

/**
 * Fetches a single quote by ID.
 * @param tenantSlug The slug of the tenant organization.
 * @param quoteId The ID of the quote to fetch.
 * @returns A promise that resolves to a Quote object or null if not found.
 */
export async function fetchQuote(tenantSlug: string, quoteId: string): Promise<Quote | null> {
	const response = await fetch(`/api/tenant/${tenantSlug}/quotes/${quoteId}`)
	if (!response.ok) {
		if (response.status === 404) return null
		throw new Error(`Failed to fetch quote: ${response.statusText}`)
	}

	const data = await response.json()
	return data.quote || null
}

/**
 * Creates a new quote.
 * @param tenantSlug The slug of the tenant organization.
 * @param quoteData The data for the new quote.
 * @returns A promise that resolves to an object indicating success, with the new quote or an error message.
 */
export async function createQuote(
	tenantSlug: string,
	quoteData: CreateQuoteInput
): Promise<{ success: boolean; quote?: Quote; error?: string }> {
	try {
		const response = await fetch(`/api/tenant/${tenantSlug}/quotes`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(quoteData),
		})

		if (!response.ok) {
			const error = await response.json()
			return { success: false, error: error.error || 'Failed to create quote' }
		}

		const data = await response.json()
		return { success: true, quote: data.quote }
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create quote',
		}
	}
}

/**
 * Updates an existing quote.
 * @param tenantSlug The slug of the tenant organization.
 * @param quoteId The ID of the quote to update.
 * @param quoteData The data to update the quote with.
 * @returns A promise that resolves to an object indicating success or an error message.
 */
export async function updateQuote(
	tenantSlug: string,
	quoteId: string,
	quoteData: UpdateQuoteInput
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(`/api/tenant/${tenantSlug}/quotes/${quoteId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(quoteData),
		})

		if (!response.ok) {
			const error = await response.json()
			return { success: false, error: error.error || 'Failed to update quote' }
		}

		return { success: true }
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to update quote',
		}
	}
}

/**
 * Deletes a quote.
 * @param tenantSlug The slug of the tenant organization.
 * @param quoteId The ID of the quote to delete.
 * @returns A promise that resolves to an object indicating success or an error message.
 */
export async function deleteQuote(
	tenantSlug: string,
	quoteId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(`/api/tenant/${tenantSlug}/quotes/${quoteId}`, {
			method: 'DELETE',
		})

		if (!response.ok) {
			const error = await response.json()
			return { success: false, error: error.error || 'Failed to delete quote' }
		}

		return { success: true }
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to delete quote',
		}
	}
}

/**
 * Sends a quote to the customer.
 * @param tenantSlug The slug of the tenant organization.
 * @param quoteId The ID of the quote to send.
 * @returns A promise that resolves to an object indicating success or an error message.
 */
export async function sendQuote(
	tenantSlug: string,
	quoteId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(`/api/tenant/${tenantSlug}/quotes/${quoteId}/send`, {
			method: 'POST',
		})

		if (!response.ok) {
			const error = await response.json()
			return { success: false, error: error.error || 'Failed to send quote' }
		}

		return { success: true }
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to send quote',
		}
	}
}

/**
 * Accepts a quote and converts it to an invoice.
 * @param tenantSlug The slug of the tenant organization.
 * @param quoteId The ID of the quote to accept.
 * @param options Optional invoice dates (issueDate, dueDate).
 * @returns A promise that resolves to an object indicating success, with invoice info or an error message.
 */
export async function acceptQuote(
	tenantSlug: string,
	quoteId: string,
	options?: { issueDate?: string; dueDate?: string }
): Promise<{ success: boolean; invoiceId?: string; invoiceNumber?: string; error?: string }> {
	try {
		const response = await fetch(`/api/tenant/${tenantSlug}/quotes/${quoteId}/accept`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(options || {}),
		})

		if (!response.ok) {
			const error = await response.json()
			return { success: false, error: error.error || 'Failed to accept quote' }
		}

		const data = await response.json()
		return {
			success: true,
			invoiceId: data.invoice?.id,
			invoiceNumber: data.invoice?.invoiceNumber,
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to accept quote',
		}
	}
}

/**
 * Rejects a quote.
 * @param tenantSlug The slug of the tenant organization.
 * @param quoteId The ID of the quote to reject.
 * @returns A promise that resolves to an object indicating success or an error message.
 */
export async function rejectQuote(
	tenantSlug: string,
	quoteId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(`/api/tenant/${tenantSlug}/quotes/${quoteId}/reject`, {
			method: 'POST',
		})

		if (!response.ok) {
			const error = await response.json()
			return { success: false, error: error.error || 'Failed to reject quote' }
		}

		return { success: true }
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to reject quote',
		}
	}
}

/**
 * Gets the PDF URL for a quote.
 * @param tenantSlug The slug of the tenant organization.
 * @param quoteId The ID of the quote.
 * @returns The URL to download the quote PDF.
 */
export function getQuotePDFUrl(tenantSlug: string, quoteId: string): string {
	return `/api/tenant/${tenantSlug}/quotes/${quoteId}/pdf`
}

