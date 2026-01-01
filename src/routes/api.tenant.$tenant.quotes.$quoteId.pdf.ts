/**
 * Quote PDF Download API Route
 *
 * Provides endpoint for downloading a quote as PDF:
 * - GET /api/tenant/:tenant/quotes/:quoteId/pdf - Download PDF
 *
 * This endpoint:
 * - Validates the quote exists and has a PDF
 * - Streams the PDF file with appropriate headers
 *
 * Requires authentication and organization membership.
 *
 * @module api/quotes/pdf
 */

import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import { quote, organization } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { getQuotePDFPath } from '@/lib/quote-pdf'

export const Route = createFileRoute('/api/tenant/$tenant/quotes/$quoteId/pdf')({
	server: {
		handlers: {
			/**
			 * GET /api/tenant/:tenant/quotes/:quoteId/pdf
			 * Download quote PDF
			 */
			GET: async ({ request, params }) => {
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

					// Fetch the quote
					const quoteData = await db
						.select({
							id: quote.id,
							quoteNumber: quote.quoteNumber,
							pdfPath: quote.pdfPath,
						})
						.from(quote)
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

				if (!q.pdfPath) {
					return new Response(
						JSON.stringify({ error: 'PDF not available for this quote' }),
						{ status: 404, headers: { 'Content-Type': 'application/json' } }
					)
				}

				// Read the PDF file using Bun.file
				// Attempt read directly to avoid TOCTOU race condition
				const fullPath = getQuotePDFPath(q.pdfPath)
				const file = Bun.file(fullPath)

				let pdfBuffer: ArrayBuffer
				try {
					pdfBuffer = await file.arrayBuffer()
				} catch (fileError) {
					// Handle file-not-found or other file system errors
					if (
						fileError instanceof Error &&
						(fileError.message.includes('ENOENT') ||
							fileError.message.includes('not found') ||
							fileError.name === 'NotFoundError')
					) {
						return new Response(
							JSON.stringify({ error: 'PDF file not found on server' }),
							{ status: 404, headers: { 'Content-Type': 'application/json' } }
						)
					}
					// Re-throw unexpected errors
					throw fileError
				}

				// Return PDF with appropriate headers
				return new Response(pdfBuffer, {
					status: 200,
					headers: {
						'Content-Type': 'application/pdf',
						'Content-Disposition': `attachment; filename="${q.quoteNumber}.pdf"`,
						'Content-Length': pdfBuffer.byteLength.toString(),
					},
				})
				} catch (error) {
					console.error('Error downloading quote PDF:', error)
					return new Response(
						JSON.stringify({ error: 'Internal server error' }),
						{ status: 500, headers: { 'Content-Type': 'application/json' } }
					)
				}
			},
		},
	},
})
