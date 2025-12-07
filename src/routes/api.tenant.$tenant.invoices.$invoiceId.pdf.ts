import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import { invoice, organization } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { getInvoicePDFPath, invoicePDFExists } from '@/lib/invoice-pdf'
import * as fs from 'node:fs'

export const Route = createFileRoute('/api/tenant/$tenant/invoices/$invoiceId/pdf')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/invoices/:invoiceId/pdf
       * Download invoice PDF
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

          // Fetch the invoice
          const invoiceData = await db
            .select({
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              pdfPath: invoice.pdfPath,
            })
            .from(invoice)
            .where(
              and(
                eq(invoice.id, params.invoiceId),
                eq(invoice.organizationId, orgId)
              )
            )
            .limit(1)

          if (invoiceData.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Invoice not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const inv = invoiceData[0]

          if (!inv.pdfPath) {
            return new Response(
              JSON.stringify({ error: 'PDF not available for this invoice' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Check if PDF file exists
          if (!invoicePDFExists(inv.pdfPath)) {
            return new Response(
              JSON.stringify({ error: 'PDF file not found on server' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Read the PDF file
          const fullPath = getInvoicePDFPath(inv.pdfPath)
          const pdfBuffer = fs.readFileSync(fullPath)

          // Return PDF with appropriate headers
          return new Response(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${inv.invoiceNumber}.pdf"`,
              'Content-Length': pdfBuffer.length.toString(),
            },
          })
        } catch (error) {
          console.error('Error downloading invoice PDF:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})



