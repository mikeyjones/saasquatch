import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  invoice,
  subscription,
  tenantOrganization,
  productPlan,
  organization,
} from '@/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { generateInvoicePDF, type InvoiceLineItem } from '@/lib/invoice-pdf'

export const Route = createFileRoute('/api/tenant/$tenant/invoices')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/invoices
       * Fetch all invoices for the organization
       * Query params:
       * - status: Filter by status (draft, paid, overdue, canceled)
       * - subscriptionId: Filter by subscription
       * - tenantOrgId: Filter by tenant organization
       */
      GET: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized', invoices: [] }),
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
              JSON.stringify({ error: 'Organization not found', invoices: [] }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Parse query params
          const url = new URL(request.url)
          const statusFilter = url.searchParams.get('status')
          const subscriptionIdFilter = url.searchParams.get('subscriptionId')
          const tenantOrgId = url.searchParams.get('tenantOrgId')

          // Build conditions
          const conditions = [eq(invoice.organizationId, orgId)]

          if (statusFilter) {
            conditions.push(eq(invoice.status, statusFilter))
          }

          if (subscriptionIdFilter) {
            conditions.push(eq(invoice.subscriptionId, subscriptionIdFilter))
          }

          if (tenantOrgId) {
            conditions.push(eq(invoice.tenantOrganizationId, tenantOrgId))
          }

          // Fetch invoices with related data
          const invoices = await db
            .select({
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              status: invoice.status,
              subtotal: invoice.subtotal,
              tax: invoice.tax,
              total: invoice.total,
              currency: invoice.currency,
              issueDate: invoice.issueDate,
              dueDate: invoice.dueDate,
              paidAt: invoice.paidAt,
              lineItems: invoice.lineItems,
              pdfPath: invoice.pdfPath,
              billingName: invoice.billingName,
              billingEmail: invoice.billingEmail,
              notes: invoice.notes,
              createdAt: invoice.createdAt,
              updatedAt: invoice.updatedAt,
              // Subscription info (nullable for standalone invoices)
              subscriptionId: subscription.id,
              subscriptionNumber: subscription.subscriptionNumber,
              subscriptionStatus: subscription.status,
              // Tenant organization info
              tenantOrgId: tenantOrganization.id,
              tenantOrgName: tenantOrganization.name,
              // Product plan info (nullable for standalone invoices)
              planName: productPlan.name,
            })
            .from(invoice)
            .leftJoin(subscription, eq(invoice.subscriptionId, subscription.id))
            .innerJoin(
              tenantOrganization,
              eq(invoice.tenantOrganizationId, tenantOrganization.id)
            )
            .leftJoin(productPlan, eq(subscription.productPlanId, productPlan.id))
            .where(and(...conditions))
            .orderBy(desc(invoice.createdAt))

          // Transform to response format
          const response = invoices.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            status: inv.status as 'draft' | 'paid' | 'overdue' | 'canceled',
            subtotal: inv.subtotal,
            tax: inv.tax,
            total: inv.total,
            currency: inv.currency,
            issueDate: inv.issueDate.toISOString(),
            dueDate: inv.dueDate.toISOString(),
            paidAt: inv.paidAt?.toISOString() || null,
            lineItems: JSON.parse(inv.lineItems),
            pdfPath: inv.pdfPath,
            billingName: inv.billingName,
            billingEmail: inv.billingEmail,
            notes: inv.notes,
            subscription: inv.subscriptionId ? {
              id: inv.subscriptionId,
              subscriptionNumber: inv.subscriptionNumber,
              status: inv.subscriptionStatus,
              plan: inv.planName,
            } : null,
            tenantOrganization: {
              id: inv.tenantOrgId,
              name: inv.tenantOrgName,
            },
            createdAt: inv.createdAt.toISOString(),
            updatedAt: inv.updatedAt.toISOString(),
          }))

          return new Response(JSON.stringify({ invoices: response }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching invoices:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error', invoices: [] }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * POST /api/tenant/:tenant/invoices
       * Create a standalone invoice (not linked to a subscription)
       * Body:
       * - tenantOrganizationId (required) - Customer organization ID
       * - lineItems (required) - Array of { description, quantity, unitPrice, total }
       * - issueDate (optional) - Defaults to now
       * - dueDate (optional) - Defaults to 30 days from now
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

          // Parse request body
          const body = await request.json()
          const {
            tenantOrganizationId,
            lineItems,
            issueDate,
            dueDate,
            tax,
            notes,
          } = body as {
            tenantOrganizationId: string
            lineItems: InvoiceLineItem[]
            issueDate?: string
            dueDate?: string
            tax?: number
            notes?: string
          }

          // Validate required fields
          if (!tenantOrganizationId) {
            return new Response(
              JSON.stringify({ error: 'Customer organization ID is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
            return new Response(
              JSON.stringify({ error: 'At least one line item is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Validate line items
          for (const item of lineItems) {
            if (!item.description || typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
              return new Response(
                JSON.stringify({ error: 'Invalid line item format. Each line item must have description, quantity, and unitPrice' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              )
            }
          }

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

          // Calculate totals
          const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
          const taxAmount = tax || 0
          const total = subtotal + taxAmount

          // Generate invoice number
          const invoiceCount = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(invoice)
            .where(eq(invoice.organizationId, orgId))

          const count = invoiceCount[0]?.count || 0
          const invoiceNumber = `INV-${orgSlug.toUpperCase()}-${(count + 1001).toString()}`

          // Set dates
          const issueDateObj = issueDate ? new Date(issueDate) : new Date()
          const dueDateObj = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

          // Generate invoice ID
          const invoiceId = `invoice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

          // Generate PDF
          const pdfPath = await generateInvoicePDF({
            invoiceNumber,
            issueDate: issueDateObj,
            dueDate: dueDateObj,
            organizationName: org[0].slug,
            organizationSlug: org[0].slug,
            customerName: customer[0].name,
            customerEmail: customer[0].billingEmail || undefined,
            customerAddress: customer[0].billingAddress || undefined,
            lineItems,
            subtotal,
            tax: taxAmount,
            total,
            currency: 'USD',
            notes,
          }, orgId)

          // Create invoice
          await db.insert(invoice).values({
            id: invoiceId,
            organizationId: orgId,
            subscriptionId: null, // Standalone invoice
            tenantOrganizationId: tenantOrganizationId,
            invoiceNumber,
            status: 'draft',
            subtotal,
            tax: taxAmount,
            total,
            currency: 'USD',
            issueDate: issueDateObj,
            dueDate: dueDateObj,
            lineItems: JSON.stringify(lineItems),
            pdfPath,
            billingName: customer[0].name,
            billingEmail: customer[0].billingEmail,
            billingAddress: customer[0].billingAddress,
            notes: notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          // Fetch the created invoice
          const createdInvoice = await db
            .select({
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              status: invoice.status,
              subtotal: invoice.subtotal,
              tax: invoice.tax,
              total: invoice.total,
              currency: invoice.currency,
              issueDate: invoice.issueDate,
              dueDate: invoice.dueDate,
              paidAt: invoice.paidAt,
              lineItems: invoice.lineItems,
              pdfPath: invoice.pdfPath,
              billingName: invoice.billingName,
              billingEmail: invoice.billingEmail,
              notes: invoice.notes,
              createdAt: invoice.createdAt,
              updatedAt: invoice.updatedAt,
            })
            .from(invoice)
            .where(eq(invoice.id, invoiceId))
            .limit(1)

          const inv = createdInvoice[0]

          return new Response(
            JSON.stringify({
              success: true,
              invoice: {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                status: inv.status,
                subtotal: inv.subtotal,
                tax: inv.tax,
                total: inv.total,
                currency: inv.currency,
                issueDate: inv.issueDate.toISOString(),
                dueDate: inv.dueDate.toISOString(),
                paidAt: inv.paidAt?.toISOString() || null,
                lineItems: JSON.parse(inv.lineItems),
                pdfPath: inv.pdfPath,
                billingName: inv.billingName,
                billingEmail: inv.billingEmail,
                notes: inv.notes,
                subscription: null,
                tenantOrganization: {
                  id: customer[0].id,
                  name: customer[0].name,
                },
                createdAt: inv.createdAt.toISOString(),
                updatedAt: inv.updatedAt.toISOString(),
              },
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error creating invoice:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})

