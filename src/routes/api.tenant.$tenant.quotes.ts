/**
 * Quotes API Routes
 *
 * Provides REST endpoints for managing quotes:
 * - GET /api/tenant/:tenant/quotes - List all quotes with optional filters
 * - POST /api/tenant/:tenant/quotes - Create a new quote
 *
 * All endpoints require authentication and organization membership.
 *
 * @module api/quotes
 */

import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '@/db'
import {
	quote,
	tenantOrganization,
	deal,
	productPlan,
	organization,
	invoice,
	member,
} from '@/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import type { QuoteLineItem } from '@/data/quotes'

/**
 * Zod schema for validating quote line items.
 * Note: We validate the total matches quantity × unitPrice, but we recalculate
 * it server-side to prevent client manipulation.
 */
const quoteLineItemSchema = z.object({
	description: z.string().min(1, 'Description is required'),
	quantity: z.number().int().positive('Quantity must be greater than 0'),
	unitPrice: z.number().int().min(0, 'Unit price must be non-negative'),
	total: z.number().int().min(0, 'Total must be non-negative'),
	/** Optional product plan ID - if present, a subscription will be created when invoice is paid */
	productPlanId: z.string().optional(),
}).refine(
	(data) => {
		const expectedTotal = data.quantity * data.unitPrice
		// Allow 1 cent tolerance for rounding
		return Math.abs(data.total - expectedTotal) <= 1
	},
	{
		message: 'Total must equal quantity × unit price',
		path: ['total'],
	}
)

/**
 * Zod schema for validating create quote request body.
 */
const createQuoteSchema = z.object({
	tenantOrganizationId: z.string().min(1, 'Customer organization ID is required'),
	lineItems: z.array(quoteLineItemSchema).min(1, 'At least one line item is required'),
	dealId: z.string().optional(),
	productPlanId: z.string().optional(),
	validUntil: z.string().datetime().optional().or(z.null()),
	tax: z.number().int().min(0, 'Tax must be non-negative').optional(),
	notes: z.string().optional().or(z.null()),
})

export const Route = createFileRoute('/api/tenant/$tenant/quotes')({
	server: {
		handlers: {
			/**
			 * GET /api/tenant/:tenant/quotes
			 * Fetch all quotes for the organization
			 * Query params:
			 * - status: Filter by status (draft, sent, accepted, rejected, expired, converted)
			 * - tenantOrgId: Filter by tenant organization
			 * - dealId: Filter by deal
			 */
			GET: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					})

					if (!session?.user) {
						return new Response(
							JSON.stringify({ error: 'Unauthorized', quotes: [] }),
							{ status: 401, headers: { 'Content-Type': 'application/json' } }
						)
					}

					// Get the organization by slug
					const org = await db
						.select({ id: organization.id, slug: organization.slug })
						.from(organization)
						.where(eq(organization.slug, params.tenant))
						.limit(1)

					if (org.length === 0) {
						return new Response(
							JSON.stringify({ error: 'Organization not found', quotes: [] }),
							{ status: 404, headers: { 'Content-Type': 'application/json' } }
						)
					}

					const orgId = org[0].id

					// Verify user is a member of this organization
					const membership = await db
						.select({ role: member.role })
						.from(member)
						.where(
							and(
								eq(member.organizationId, orgId),
								eq(member.userId, session.user.id)
							)
						)
						.limit(1)

					if (membership.length === 0) {
						return new Response(
							JSON.stringify({ error: 'Forbidden: Not a member of this organization', quotes: [] }),
							{ status: 403, headers: { 'Content-Type': 'application/json' } }
						)
					}

					// Parse query params
					const url = new URL(request.url)
					const statusFilter = url.searchParams.get('status')
					const tenantOrgId = url.searchParams.get('tenantOrgId')
					const dealIdFilter = url.searchParams.get('dealId')

					// Build conditions
					const conditions = [eq(quote.organizationId, orgId)]

					if (statusFilter) {
						conditions.push(eq(quote.status, statusFilter))
					}

					if (tenantOrgId) {
						conditions.push(eq(quote.tenantOrganizationId, tenantOrgId))
					}

					if (dealIdFilter) {
						conditions.push(eq(quote.dealId, dealIdFilter))
					}

					// Fetch quotes with related data
					const quotes = await db
						.select({
							id: quote.id,
							quoteNumber: quote.quoteNumber,
							status: quote.status,
							version: quote.version,
							subtotal: quote.subtotal,
							tax: quote.tax,
							total: quote.total,
							currency: quote.currency,
							validUntil: quote.validUntil,
							lineItems: quote.lineItems,
							pdfPath: quote.pdfPath,
							billingName: quote.billingName,
							billingEmail: quote.billingEmail,
							notes: quote.notes,
							sentAt: quote.sentAt,
							acceptedAt: quote.acceptedAt,
							rejectedAt: quote.rejectedAt,
							createdAt: quote.createdAt,
							updatedAt: quote.updatedAt,
							// Tenant organization info
							tenantOrgId: tenantOrganization.id,
							tenantOrgName: tenantOrganization.name,
							// Deal info (nullable)
							dealId: deal.id,
							dealName: deal.name,
							// Product plan info (nullable)
							planId: productPlan.id,
							planName: productPlan.name,
							// Converted invoice info (nullable)
							invoiceId: invoice.id,
							invoiceNumber: invoice.invoiceNumber,
						})
						.from(quote)
						.innerJoin(
							tenantOrganization,
							eq(quote.tenantOrganizationId, tenantOrganization.id)
						)
						.leftJoin(deal, eq(quote.dealId, deal.id))
						.leftJoin(productPlan, eq(quote.productPlanId, productPlan.id))
						.leftJoin(invoice, eq(quote.convertedToInvoiceId, invoice.id))
						.where(and(...conditions))
						.orderBy(desc(quote.createdAt))

					// Transform to response format
					const response = quotes.map((q) => ({
						id: q.id,
						quoteNumber: q.quoteNumber,
						status: q.status as
							| 'draft'
							| 'sent'
							| 'accepted'
							| 'rejected'
							| 'expired'
							| 'converted',
						version: q.version,
						subtotal: q.subtotal,
						tax: q.tax,
						total: q.total,
						currency: q.currency,
						validUntil: q.validUntil?.toISOString() || null,
						lineItems: JSON.parse(q.lineItems) as QuoteLineItem[],
						pdfPath: q.pdfPath,
						billingName: q.billingName,
						billingEmail: q.billingEmail,
						notes: q.notes,
						sentAt: q.sentAt?.toISOString() || null,
						acceptedAt: q.acceptedAt?.toISOString() || null,
						rejectedAt: q.rejectedAt?.toISOString() || null,
						tenantOrganization: {
							id: q.tenantOrgId,
							name: q.tenantOrgName,
						},
						deal: q.dealId
							? {
									id: q.dealId,
									name: q.dealName,
								}
							: null,
						productPlan: q.planId
							? {
									id: q.planId,
									name: q.planName,
								}
							: null,
						convertedInvoice: q.invoiceId
							? {
									id: q.invoiceId,
									invoiceNumber: q.invoiceNumber,
								}
							: null,
						createdAt: q.createdAt.toISOString(),
						updatedAt: q.updatedAt.toISOString(),
					}))

					return new Response(JSON.stringify({ quotes: response }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					})
				} catch (error) {
					console.error('Error fetching quotes:', error)
					return new Response(
						JSON.stringify({ error: 'Internal server error', quotes: [] }),
						{ status: 500, headers: { 'Content-Type': 'application/json' } }
					)
				}
			},

			/**
			 * POST /api/tenant/:tenant/quotes
			 * Create a new quote
			 * Body:
			 * - tenantOrganizationId (required) - Customer organization ID
			 * - lineItems (required) - Array of { description, quantity, unitPrice, total }
			 * - dealId (optional) - Link to deal
			 * - productPlanId (optional) - Link to product plan
			 * - validUntil (optional) - Quote expiration date
			 * - tax (optional) - Tax amount in cents
			 * - notes (optional) - Internal notes
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
						.select({ id: organization.id, slug: organization.slug })
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
					const orgSlug = org[0].slug

					// Verify user is a member of this organization
					const membership = await db
						.select({ role: member.role })
						.from(member)
						.where(
							and(
								eq(member.organizationId, orgId),
								eq(member.userId, session.user.id)
							)
						)
						.limit(1)

					if (membership.length === 0) {
						return new Response(
							JSON.stringify({ error: 'Forbidden: Not a member of this organization' }),
							{ status: 403, headers: { 'Content-Type': 'application/json' } }
						)
					}
				// Parse and validate request body with Zod
				const body = await request.json()
				const validationResult = createQuoteSchema.safeParse(body)

				if (!validationResult.success) {
					const zodError = validationResult.error
					const errors = zodError?.errors?.map((err) => {
						const path = err.path.join('.')
						return path ? `${path}: ${err.message}` : err.message
					}) || [zodError?.message || 'Validation failed']
					return new Response(
						JSON.stringify({
							error: 'Validation failed',
							details: errors,
						}),
						{ status: 400, headers: { 'Content-Type': 'application/json' } }
					)
				}

				const {
					tenantOrganizationId,
					lineItems,
					dealId,
					productPlanId,
					validUntil,
					tax,
					notes,
				} = validationResult.data

					// Verify customer organization exists and belongs to this organization
					const customer = await db
						.select({
							id: tenantOrganization.id,
							name: tenantOrganization.name,
							billingEmail: tenantOrganization.billingEmail,
							billingAddress: tenantOrganization.billingAddress,
						})
						.from(tenantOrganization)
						.where(
							and(
								eq(tenantOrganization.id, tenantOrganizationId),
								eq(tenantOrganization.organizationId, orgId)
							)
						)
						.limit(1)

					if (customer.length === 0) {
						return new Response(
							JSON.stringify({ error: 'Customer not found' }),
							{ status: 404, headers: { 'Content-Type': 'application/json' } }
						)
					}

					// Validate deal if provided
					if (dealId) {
						const dealExists = await db
							.select({ id: deal.id })
							.from(deal)
							.where(and(eq(deal.id, dealId), eq(deal.organizationId, orgId)))
							.limit(1)

						if (dealExists.length === 0) {
							return new Response(
								JSON.stringify({ error: 'Deal not found' }),
								{ status: 404, headers: { 'Content-Type': 'application/json' } }
							)
						}
					}

					// Validate product plan if provided
					if (productPlanId) {
						const planExists = await db
							.select({ id: productPlan.id })
							.from(productPlan)
							.where(
								and(eq(productPlan.id, productPlanId), eq(productPlan.organizationId, orgId))
							)
							.limit(1)

						if (planExists.length === 0) {
							return new Response(
								JSON.stringify({ error: 'Product plan not found' }),
								{ status: 404, headers: { 'Content-Type': 'application/json' } }
							)
						}
					}

				// Recalculate totals server-side (don't trust client-provided totals)
				// Recalculate each line item total from quantity × unitPrice
				const recalculatedLineItems = lineItems.map((item) => ({
					...item,
					total: item.quantity * item.unitPrice,
				}))

				// Calculate subtotal from recalculated line items
				const subtotal = recalculatedLineItems.reduce((sum, item) => sum + item.total, 0)
				const taxAmount = tax || 0
				const total = subtotal + taxAmount

					// Generate quote number
					const quoteCount = await db
						.select({ count: sql<number>`count(*)::int` })
						.from(quote)
						.where(eq(quote.organizationId, orgId))

					const count = quoteCount[0]?.count || 0
					const quoteNumber = `QUO-${orgSlug.toUpperCase()}-${(count + 1001).toString()}`

				// Set validity date (validate if provided)
				let validUntilObj: Date | null = null
				if (validUntil) {
					validUntilObj = new Date(validUntil)
					if (isNaN(validUntilObj.getTime())) {
						return new Response(
							JSON.stringify({ error: 'Invalid validUntil date format. Expected ISO 8601 date string.' }),
							{ status: 400, headers: { 'Content-Type': 'application/json' } }
						)
					}
				}

				// Generate quote ID using cryptographically secure UUID
				const quoteId = `quote_${crypto.randomUUID()}`
				// Create quote with recalculated line items
				await db.insert(quote).values({
					id: quoteId,
					organizationId: orgId,
					tenantOrganizationId,
					dealId: dealId || null,
					productPlanId: productPlanId || null,
					quoteNumber,
					status: 'draft',
					version: 1,
					parentQuoteId: null,
					subtotal,
					tax: taxAmount,
					total,
					currency: 'USD',
					validUntil: validUntilObj,
					lineItems: JSON.stringify(recalculatedLineItems),
						convertedToInvoiceId: null,
						pdfPath: null,
						billingName: customer[0].name,
						billingEmail: customer[0].billingEmail,
						billingAddress: customer[0].billingAddress,
						notes: notes || null,
						createdAt: new Date(),
						updatedAt: new Date(),
						sentAt: null,
						acceptedAt: null,
						rejectedAt: null,
					})

					// Fetch the created quote with explicit fields
					const createdQuote = await db
						.select({
							id: quote.id,
							quoteNumber: quote.quoteNumber,
							status: quote.status,
							version: quote.version,
							subtotal: quote.subtotal,
							tax: quote.tax,
							total: quote.total,
							currency: quote.currency,
							validUntil: quote.validUntil,
							lineItems: quote.lineItems,
							tenantOrganizationId: quote.tenantOrganizationId,
							dealId: quote.dealId,
							productPlanId: quote.productPlanId,
							createdAt: quote.createdAt,
						})
						.from(quote)
						.where(eq(quote.id, quoteId))
						.limit(1)

					const q = createdQuote[0]

					return new Response(
						JSON.stringify({
							success: true,
							quote: {
								id: q.id,
								quoteNumber: q.quoteNumber,
								status: q.status,
								version: q.version,
								subtotal: q.subtotal,
								tax: q.tax,
								total: q.total,
								currency: q.currency,
								validUntil: q.validUntil?.toISOString() || null,
								lineItems: JSON.parse(q.lineItems),
								tenantOrganizationId: q.tenantOrganizationId,
								dealId: q.dealId,
								productPlanId: q.productPlanId,
								createdAt: q.createdAt.toISOString(),
							},
						}),
						{ status: 201, headers: { 'Content-Type': 'application/json' } }
					)
				} catch (error) {
					console.error('Error creating quote:', error)
					return new Response(
						JSON.stringify({ error: 'Internal server error' }),
						{ status: 500, headers: { 'Content-Type': 'application/json' } }
					)
				}
			},
		},
	},
})

