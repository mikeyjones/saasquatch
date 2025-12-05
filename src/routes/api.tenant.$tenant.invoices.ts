import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  invoice,
  subscription,
  tenantOrganization,
  productPlan,
  organization,
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

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
              // Subscription info
              subscriptionId: subscription.id,
              subscriptionNumber: subscription.subscriptionNumber,
              subscriptionStatus: subscription.status,
              // Tenant organization info
              tenantOrgId: tenantOrganization.id,
              tenantOrgName: tenantOrganization.name,
              // Product plan info
              planName: productPlan.name,
            })
            .from(invoice)
            .innerJoin(subscription, eq(invoice.subscriptionId, subscription.id))
            .innerJoin(
              tenantOrganization,
              eq(invoice.tenantOrganizationId, tenantOrganization.id)
            )
            .innerJoin(productPlan, eq(subscription.productPlanId, productPlan.id))
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
            subscription: {
              id: inv.subscriptionId,
              subscriptionNumber: inv.subscriptionNumber,
              status: inv.subscriptionStatus,
              plan: inv.planName,
            },
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
    },
  },
})

