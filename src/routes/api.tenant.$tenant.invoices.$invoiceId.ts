import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  invoice,
  subscription,
  tenantOrganization,
  productPlan,
  organization,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/tenant/$tenant/invoices/$invoiceId')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/invoices/:invoiceId
       * Get a single invoice by ID
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

          // Fetch invoice with related data
          const invoiceData = await db
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
              billingAddress: invoice.billingAddress,
              notes: invoice.notes,
              createdAt: invoice.createdAt,
              updatedAt: invoice.updatedAt,
              // Subscription info
              subscriptionId: subscription.id,
              subscriptionNumber: subscription.subscriptionNumber,
              subscriptionStatus: subscription.status,
              billingCycle: subscription.billingCycle,
              mrr: subscription.mrr,
              seats: subscription.seats,
              // Tenant organization info
              tenantOrgId: tenantOrganization.id,
              tenantOrgName: tenantOrganization.name,
              // Product plan info
              planId: productPlan.id,
              planName: productPlan.name,
            })
            .from(invoice)
            .innerJoin(subscription, eq(invoice.subscriptionId, subscription.id))
            .innerJoin(
              tenantOrganization,
              eq(invoice.tenantOrganizationId, tenantOrganization.id)
            )
            .innerJoin(productPlan, eq(subscription.productPlanId, productPlan.id))
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

          return new Response(
            JSON.stringify({
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
                billingAddress: inv.billingAddress,
                notes: inv.notes,
                subscription: {
                  id: inv.subscriptionId,
                  subscriptionNumber: inv.subscriptionNumber,
                  status: inv.subscriptionStatus,
                  billingCycle: inv.billingCycle,
                  mrr: inv.mrr,
                  seats: inv.seats,
                  plan: {
                    id: inv.planId,
                    name: inv.planName,
                  },
                },
                tenantOrganization: {
                  id: inv.tenantOrgId,
                  name: inv.tenantOrgName,
                },
                createdAt: inv.createdAt.toISOString(),
                updatedAt: inv.updatedAt.toISOString(),
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error fetching invoice:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})

