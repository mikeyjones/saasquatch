import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import { quote, organization, tenantOrganization } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { generateQuotePDF } from '@/lib/quote-pdf'

export const Route = createFileRoute('/api/tenant/$tenant/quotes/$quoteId/send')({
	server: {
		handlers: {
			/**
			 * POST /api/tenant/:tenant/quotes/:quoteId/send
			 * Mark a quote as sent to the customer
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

					// Get the organization by slug
					const org = await db
						.select({ id: organization.id })
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
							validUntil: quote.validUntil,
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

					// Only allow sending draft quotes
					if (q.status !== 'draft') {
						return new Response(
							JSON.stringify({ error: 'Only draft quotes can be sent' }),
							{ status: 400, headers: { 'Content-Type': 'application/json' } }
						)
					}

					// Generate PDF
					let pdfPath: string | null = null
					try {
						const lineItems = JSON.parse(q.lineItems)
						pdfPath = await generateQuotePDF(
							{
								quoteNumber: q.quoteNumber,
								validUntil: q.validUntil ? new Date(q.validUntil) : undefined,
								organizationName: params.tenant,
								organizationSlug: params.tenant,
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
						console.error('Error generating quote PDF:', pdfError)
						// Continue without PDF - it can be regenerated later
					}

					const now = new Date()

					// Update quote status to sent
					await db
						.update(quote)
						.set({
							status: 'sent',
							sentAt: now,
							pdfPath,
							updatedAt: now,
						})
						.where(eq(quote.id, q.id))

					return new Response(
						JSON.stringify({
							success: true,
							quote: {
								id: q.id,
								quoteNumber: q.quoteNumber,
								status: 'sent',
								sentAt: now.toISOString(),
							},
						}),
						{ status: 200, headers: { 'Content-Type': 'application/json' } }
					)
				} catch (error) {
					console.error('Error sending quote:', error)
					return new Response(
						JSON.stringify({ error: 'Internal server error' }),
						{ status: 500, headers: { 'Content-Type': 'application/json' } }
					)
				}
			},
		},
	},
})

