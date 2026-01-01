/**
 * Formatting Utilities
 *
 * Shared utility functions for formatting currency, dates, and other values
 * consistently across the application.
 *
 * @module format
 */

/**
 * Formats an amount in cents to a localized currency string.
 *
 * @param cents - Amount in cents (e.g., 1500 = $15.00)
 * @param currency - ISO 4217 currency code (default: "USD")
 * @returns Formatted currency string (e.g., "$15.00")
 *
 * @example
 * formatCurrency(1500, 'USD') // Returns "$15.00"
 * formatCurrency(1000, 'EUR') // Returns "€10.00"
 */
export function formatCurrency(cents: number, currency = 'USD'): string {
	const amount = cents / 100
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
	}).format(amount)
}

/**
 * Formats an ISO date string to a short, readable format.
 *
 * @param dateString - ISO 8601 date string, or null/undefined
 * @returns Formatted date (e.g., "Dec 31, 2024") or "N/A" if no date
 *
 * @example
 * formatDateShort('2024-12-31T00:00:00.000Z') // Returns "Dec 31, 2024"
 * formatDateShort(null) // Returns "N/A"
 */
export function formatDateShort(dateString: string | null | undefined): string {
	if (!dateString) return 'N/A'
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
	})
}

/**
 * Formats an ISO date string to a long, readable format.
 *
 * @param dateString - ISO 8601 date string, or null/undefined
 * @returns Formatted date (e.g., "December 31, 2024") or "N/A" if no date
 *
 * @example
 * formatDateLong('2024-12-31T00:00:00.000Z') // Returns "December 31, 2024"
 * formatDateLong(null) // Returns "N/A"
 */
export function formatDateLong(dateString: string | null | undefined): string {
	if (!dateString) return 'N/A'
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	})
}

