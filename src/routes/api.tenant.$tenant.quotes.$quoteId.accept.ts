/**
 * Quote Accept API Route
 *
 * Provides endpoint for accepting a quote and converting it to an invoice:
 * - POST /api/tenant/:tenant/quotes/:quoteId/accept - Accept and convert
 *
 * This endpoint:
 * - Validates the quote is in 'sent' status
 * - Creates a new invoice from quote data
 * - Generates a PDF for the invoice
 * - Updates quote status to 'converted' with link to invoice
 *
 * Requires authentication and organization membership.
 *
 * @module api/quotes/accept
 */

import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
	quote,
	invoice,
	tenantOrganization,
	organization,
} from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { generateInvoicePDF, type InvoiceLineItem } from '@/lib/invoice-pdf'

export const Route = createFileRoute('/api/tenant/$tenant/quotes/$quoteId/accept')({
	server: {
		handlers: {
			/**
			 * POST /api/tenant/:tenant/quotes/:quoteId/accept
			 * Accept a quote and convert it to an invoice
			 */
			POST: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					})

					if (!session?.user) {
						return new Response(
							JSON.stringify({ error: 'Unauthorized' }),
							{ status: 401, headers: { 'Content-Type': 'application/json' } }
						)
					}

					// Get the organization by slug and name
					const org = await db
						.select({ id: organization.id, name: organization.name, slug: organization.slug })
						.from(organization)
						.where(eq(organization.slug, params.tenant))
						.limit(1)

					if (org.length === 0) {
						return new Response(
							JSON.stringify({ error: 'Organization not found' }),
							{ status: 404, headers: { 'Content-Type': 'application/json' } }
						)
					}

					const orgId = org[0].id
					const orgName = org[0].name
					const orgSlug = org[0].slug

					// Fetch the quote with customer info
					const quoteData = await db
						.select({
							id: quote.id,
							quoteNumber: quote.quoteNumber,
							status: quote.status,
							tenantOrganizationId: quote.tenantOrganizationId,
							subtotal: quote.subtotal,
							tax: quote.tax,
							total: quote.total,
							currency: quote.currency,
							lineItems: quote.lineItems,
							billingName: quote.billingName,
							billingEmail: quote.billingEmail,
							billingAddress: quote.billingAddress,
							notes: quote.notes,
							customerName: tenantOrganization.name,
							customerEmail: tenantOrganization.billingEmail,
							customerAddress: tenantOrganization.billingAddress,
						})
						.from(quote)
						.innerJoin(
							tenantOrganization,
							eq(quote.tenantOrganizationId, tenantOrganization.id)
						)
						.where(
							and(eq(quote.id, params.quoteId), eq(quote.organizationId, orgId))
						)
						.limit(1)

					if (quoteData.length === 0) {
						return new Response(
							JSON.stringify({ error: 'Quote not found' }),
							{ status: 404, headers: { 'Content-Type': 'application/json' } }
						)
					}

					const q = quoteData[0]

					// Only allow accepting sent quotes
					if (q.status !== 'sent') {
						return new Response(
							JSON.stringify({ error: 'Only sent quotes can be accepted' }),
							{ status: 400, headers: { 'Content-Type': 'application/json' } }
						)
					}

				// Parse request body for optional invoice dates
				const body = await request.json().catch(() => ({}))
				const { issueDate, dueDate } = body as {
					issueDate?: string
					dueDate?: string
				}

				// Validate and set dates (default to now and 30 days from now)
				let issueDateObj: Date
				if (issueDate) {
					issueDateObj = new Date(issueDate)
					if (isNaN(issueDateObj.getTime())) {
						return new Response(
							JSON.stringify({ error: 'Invalid issueDate format. Expected ISO 8601 date string.' }),
							{ status: 400, headers: { 'Content-Type': 'application/json' } }
						)
					}
				} else {
					issueDateObj = new Date()
				}

				let dueDateObj: Date
				if (dueDate) {
					dueDateObj = new Date(dueDate)
					if (isNaN(dueDateObj.getTime())) {
						return new Response(
							JSON.stringify({ error: 'Invalid dueDate format. Expected ISO 8601 date string.' }),
							{ status: 400, headers: { 'Content-Type': 'application/json' } }
						)
					}
				} else {
					dueDateObj = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
				}

				// Validate due date is after issue date
				if (dueDateObj < issueDateObj) {
					return new Response(
						JSON.stringify({ error: 'Due date must be on or after issue date.' }),
						{ status: 400, headers: { 'Content-Type': 'application/json' } }
					)
				}

				// Parse line items with error handling
				let lineItems: InvoiceLineItem[]
				try {
					lineItems = JSON.parse(q.lineItems) as InvoiceLineItem[]
				} catch (parseError) {
					console.error('Error parsing quote line items:', parseError)
					return new Response(
						JSON.stringify({
							error: 'Invalid quote data: line items are malformed',
						}),
						{ status: 400, headers: { 'Content-Type': 'application/json' } }
					)
				}

					// Generate invoice number
					const invoiceCount = await db
						.select({ count: sql<number>`count(*)::int` })
						.from(invoice)
						.where(eq(invoice.organizationId, orgId))

					const count = invoiceCount[0]?.count || 0
					const invoiceNumber = `INV-${orgSlug.toUpperCase()}-${(count + 1001).toString()}`

					// Generate invoice ID
					const invoiceId = `invoice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

					// Generate PDF
					let pdfPath: string | null = null
					try {
						pdfPath = await generateInvoicePDF(
							{
								invoiceNumber,
								issueDate: issueDateObj,
								dueDate: dueDateObj,
								organizationName: orgName,
								organizationSlug: orgSlug,
								customerName: q.customerName,
								customerEmail: q.customerEmail || undefined,
								customerAddress: q.customerAddress || undefined,
								lineItems,
								subtotal: q.subtotal,
								tax: q.tax,
								total: q.total,
								currency: q.currency,
								notes: q.notes || undefined,
							},
							orgId
						)
					} catch (pdfError) {
						console.error('Error generating invoice PDF:', pdfError)
						// Continue without PDF - it can be regenerated later
					}

					const now = new Date()

					// Create invoice
					await db.insert(invoice).values({
						id: invoiceId,
						organizationId: orgId,
						subscriptionId: null, // Standalone invoice from quote
						tenantOrganizationId: q.tenantOrganizationId,
						invoiceNumber,
						status: 'draft',
						subtotal: q.subtotal,
						tax: q.tax,
						total: q.total,
						currency: q.currency,
						issueDate: issueDateObj,
						dueDate: dueDateObj,
						lineItems: q.lineItems,
						pdfPath,
						billingName: q.billingName,
						billingEmail: q.billingEmail,
						billingAddress: q.billingAddress,
						notes: q.notes,
						createdAt: now,
						updatedAt: now,
					})

					// Update quote status to converted
					await db
						.update(quote)
						.set({
							status: 'converted',
							acceptedAt: now,
							convertedToInvoiceId: invoiceId,
							updatedAt: now,
						})
						.where(eq(quote.id, q.id))

					return new Response(
						JSON.stringify({
							success: true,
							quote: {
								id: q.id,
								quoteNumber: q.quoteNumber,
								status: 'converted',
								acceptedAt: now.toISOString(),
							},
							invoice: {
								id: invoiceId,
								invoiceNumber,
								status: 'draft',
								total: q.total,
								dueDate: dueDateObj.toISOString(),
								pdfPath,
							},
						}),
						{ status: 200, headers: { 'Content-Type': 'application/json' } }
					)
				} catch (error) {
					console.error('Error accepting quote:', error)
					return new Response(
						JSON.stringify({ error: 'Internal server error' }),
						{ status: 500, headers: { 'Content-Type': 'application/json' } }
					)
				}
			},
		},
	},
})

