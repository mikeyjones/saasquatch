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
 * Represents a single line item in a quote.
 * Each line item describes a product or service being offered.
 */
export interface QuoteLineItem {
	/** Human-readable description of the item (e.g., "Pro Plan - Monthly") */
	description: string;
	/** Number of units being quoted */
	quantity: number;
	/** Price per unit in cents (e.g., 9900 = $99.00) */
	unitPrice: number;
	/** Total price for this line (quantity × unitPrice) in cents */
	total: number;
	/** Optional product plan ID - if present, a subscription will be created when invoice is paid */
	productPlanId?: string;
}

/**
 * Represents a complete quote with all its details.
 *
 * Quotes progress through the following lifecycle:
 * - **draft**: Initial state, can be edited
 * - **sent**: Sent to customer, awaiting response
 * - **accepted**: Customer accepted, ready to convert to invoice
 * - **rejected**: Customer rejected the quote
 * - **expired**: Quote validity period has passed
 * - **converted**: Quote was accepted and converted to an invoice
 */
export interface Quote {
	/** Unique identifier for the quote */
	id: string;
	/** Human-readable quote number (e.g., "QUO-ACME-1001") */
	quoteNumber: string;
	/** Current lifecycle status of the quote */
	status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
	/** Version number for tracking revisions */
	version: number;
	/** ID of the parent quote if this is a revision */
	parentQuoteId?: string | null;
	/** Sum of all line item totals in cents */
	subtotal: number;
	/** Tax amount in cents */
	tax: number;
	/** Grand total (subtotal + tax) in cents */
	total: number;
	/** ISO 4217 currency code (e.g., "USD", "EUR") */
	currency: string;
	/** ISO 8601 date string for quote expiration */
	validUntil?: string | null;
	/** Array of products/services being quoted */
	lineItems: QuoteLineItem[];
	/** Relative path to generated PDF (e.g., "/quotes/org-id/QUO-1.pdf") */
	pdfPath?: string | null;
	/** Customer billing contact name (snapshot at time of quote) */
	billingName?: string | null;
	/** Customer billing email (snapshot at time of quote) */
	billingEmail?: string | null;
	/** Internal notes about this quote */
	notes?: string | null;
	/** ISO 8601 timestamp when quote was sent to customer */
	sentAt?: string | null;
	/** ISO 8601 timestamp when customer accepted */
	acceptedAt?: string | null;
	/** ISO 8601 timestamp when customer rejected */
	rejectedAt?: string | null;
	/** Customer organization receiving the quote */
	tenantOrganization: {
		/** Customer organization ID */
		id: string;
		/** Customer organization name */
		name: string;
	};
	/** Linked deal (optional) */
	deal?: {
		/** Deal ID */
		id: string;
		/** Deal name */
		name: string;
	} | null;
	/** Linked product plan (optional) */
	productPlan?: {
		/** Product plan ID */
		id: string;
		/** Product plan name */
		name: string;
	} | null;
	/** Invoice created when quote was accepted and converted */
	convertedInvoice?: {
		/** Invoice ID */
		id: string;
		/** Invoice number for reference */
		invoiceNumber: string;
	} | null;
	/** ISO 8601 timestamp when quote was created */
	createdAt: string;
	/** ISO 8601 timestamp when quote was last updated */
	updatedAt: string;
}

/**
 * Input data for creating a new quote.
 *
 * At minimum, requires a customer organization and at least one line item.
 * Additional options like deal linking and validity dates are optional.
 */
export interface CreateQuoteInput {
	/** ID of the customer organization to quote */
	tenantOrganizationId: string;
	/** Array of line items (must have at least one) */
	lineItems: QuoteLineItem[];
	/** Optional: Link quote to an existing deal */
	dealId?: string;
	/** Optional: Link quote to a specific product plan */
	productPlanId?: string;
	/** Optional: ISO 8601 date string for quote expiration */
	validUntil?: string;
	/** Optional: Tax amount in cents */
	tax?: number;
	/** Optional: Internal notes */
	notes?: string;
}

/**
 * Input data for updating an existing quote.
 *
 * Only draft quotes can be updated. All fields are optional;
 * only provided fields will be updated.
 */
export interface UpdateQuoteInput {
	/** New line items (replaces existing) */
	lineItems?: QuoteLineItem[];
	/** Update or remove deal link (null to unlink) */
	dealId?: string | null;
	/** Update or remove product plan link (null to unlink) */
	productPlanId?: string | null;
	/** Update or remove validity date (null to remove) */
	validUntil?: string | null;
	/** Update tax amount in cents */
	tax?: number;
	/** Update or remove notes (null to remove) */
	notes?: string | null;
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
	filters?: { status?: string; tenantOrgId?: string; dealId?: string },
): Promise<Quote[]> {
	const params = new URLSearchParams();
	if (filters?.status) params.append("status", filters.status);
	if (filters?.tenantOrgId) params.append("tenantOrgId", filters.tenantOrgId);
	if (filters?.dealId) params.append("dealId", filters.dealId);

	const response = await fetch(
		`/api/tenant/${tenantSlug}/quotes?${params.toString()}`,
	);
	if (!response.ok) {
		throw new Error(`Failed to fetch quotes: ${response.statusText}`);
	}

	const data = await response.json();
	return data.quotes || [];
}

/**
 * Fetches a single quote by ID.
 * @param tenantSlug The slug of the tenant organization.
 * @param quoteId The ID of the quote to fetch.
 * @returns A promise that resolves to a Quote object or null if not found.
 */
export async function fetchQuote(
	tenantSlug: string,
	quoteId: string,
): Promise<Quote | null> {
	const response = await fetch(`/api/tenant/${tenantSlug}/quotes/${quoteId}`);
	if (!response.ok) {
		if (response.status === 404) return null;
		throw new Error(`Failed to fetch quote: ${response.statusText}`);
	}

	const data = await response.json();
	return data.quote || null;
}

/**
 * Creates a new quote.
 * @param tenantSlug The slug of the tenant organization.
 * @param quoteData The data for the new quote.
 * @returns A promise that resolves to an object indicating success, with the new quote or an error message.
 */
export async function createQuote(
	tenantSlug: string,
	quoteData: CreateQuoteInput,
): Promise<{ success: boolean; quote?: Quote; error?: string }> {
	try {
		const response = await fetch(`/api/tenant/${tenantSlug}/quotes`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(quoteData),
		});

		if (!response.ok) {
			const error = await response.json();
			return { success: false, error: error.error || "Failed to create quote" };
		}

		const data = await response.json();
		return { success: true, quote: data.quote };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to create quote",
		};
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
	quoteData: UpdateQuoteInput,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/quotes/${quoteId}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(quoteData),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			return { success: false, error: error.error || "Failed to update quote" };
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to update quote",
		};
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
	quoteId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/quotes/${quoteId}`,
			{
				method: "DELETE",
			},
		);

		if (!response.ok) {
			const error = await response.json();
			return { success: false, error: error.error || "Failed to delete quote" };
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to delete quote",
		};
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
	quoteId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/quotes/${quoteId}/send`,
			{
				method: "POST",
			},
		);

		if (!response.ok) {
			const error = await response.json();
			return { success: false, error: error.error || "Failed to send quote" };
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to send quote",
		};
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
	options?: { issueDate?: string; dueDate?: string },
): Promise<{
	success: boolean;
	invoiceId?: string;
	invoiceNumber?: string;
	error?: string;
}> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/quotes/${quoteId}/accept`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(options || {}),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			return { success: false, error: error.error || "Failed to accept quote" };
		}

		const data = await response.json();
		return {
			success: true,
			invoiceId: data.invoice?.id,
			invoiceNumber: data.invoice?.invoiceNumber,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to accept quote",
		};
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
	quoteId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/quotes/${quoteId}/reject`,
			{
				method: "POST",
			},
		);

		if (!response.ok) {
			const error = await response.json();
			return { success: false, error: error.error || "Failed to reject quote" };
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to reject quote",
		};
	}
}

/**
 * Gets the PDF URL for a quote.
 * @param tenantSlug The slug of the tenant organization.
 * @param quoteId The ID of the quote.
 * @returns The URL to download the quote PDF.
 */
export function getQuotePDFUrl(tenantSlug: string, quoteId: string): string {
	return `/api/tenant/${tenantSlug}/quotes/${quoteId}/pdf`;
}
