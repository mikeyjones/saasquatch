import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  invoice,
  subscription,
  subscriptionActivity,
  tenantOrganization,
  organization,
  productPlan,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 24)
}

export const Route = createFileRoute('/api/tenant/$tenant/invoices/$invoiceId/pay')({
  server: {
    handlers: {
      /**
       * POST /api/tenant/:tenant/invoices/:invoiceId/pay
       * Mark an invoice as paid and activate the subscription
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

          // Fetch the invoice
          const invoiceData = await db
            .select({
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              status: invoice.status,
              subscriptionId: invoice.subscriptionId,
              tenantOrganizationId: invoice.tenantOrganizationId,
              total: invoice.total,
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

          // Check if invoice is already paid
          if (inv.status === 'paid') {
            return new Response(
              JSON.stringify({ error: 'Invoice is already paid' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Check if invoice is canceled
          if (inv.status === 'canceled') {
            return new Response(
              JSON.stringify({ error: 'Cannot pay a canceled invoice' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const now = new Date()

          // Get subscription details for activity log
          const subscriptionData = await db
            .select({
              subscriptionNumber: subscription.subscriptionNumber,
              billingCycle: subscription.billingCycle,
              productPlanId: subscription.productPlanId,
            })
            .from(subscription)
            .where(eq(subscription.id, inv.subscriptionId))
            .limit(1)

          if (subscriptionData.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Subscription not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const sub = subscriptionData[0]

          // Get plan name for activity log
          const planData = await db
            .select({ name: productPlan.name })
            .from(productPlan)
            .where(eq(productPlan.id, sub.productPlanId))
            .limit(1)

          // Get tenant org name for activity log
          const tenantOrgData = await db
            .select({ name: tenantOrganization.name })
            .from(tenantOrganization)
            .where(eq(tenantOrganization.id, inv.tenantOrganizationId))
            .limit(1)

          // Calculate new billing period start from payment date
          const periodStart = now
          const periodEnd = new Date(now)
          if (sub.billingCycle === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1)
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1)
          }

          // Update invoice status to paid
          await db
            .update(invoice)
            .set({
              status: 'paid',
              paidAt: now,
              updatedAt: now,
            })
            .where(eq(invoice.id, inv.id))

          // Update subscription to active and set billing period
          await db
            .update(subscription)
            .set({
              status: 'active',
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              updatedAt: now,
            })
            .where(eq(subscription.id, inv.subscriptionId))

          // Update tenant organization subscription status
          await db
            .update(tenantOrganization)
            .set({
              subscriptionStatus: 'active',
              updatedAt: now,
            })
            .where(eq(tenantOrganization.id, inv.tenantOrganizationId))

          // Create activity entry for invoice payment
          await db.insert(subscriptionActivity).values({
            id: generateId(),
            subscriptionId: inv.subscriptionId,
            activityType: 'invoice_paid',
            description: `Invoice ${inv.invoiceNumber} paid - $${(inv.total / 100).toFixed(2)} USD`,
            userId: session.user.id,
            metadata: JSON.stringify({
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              total: inv.total,
              paidAt: now.toISOString(),
            }),
            createdAt: now,
          })

          // Create activity entry for subscription activation
          await db.insert(subscriptionActivity).values({
            id: generateId(),
            subscriptionId: inv.subscriptionId,
            activityType: 'activated',
            description: `Subscription ${sub.subscriptionNumber} activated for ${tenantOrgData[0]?.name || 'customer'}`,
            userId: session.user.id,
            metadata: JSON.stringify({
              plan: planData[0]?.name,
              billingCycle: sub.billingCycle,
              periodStart: periodStart.toISOString(),
              periodEnd: periodEnd.toISOString(),
            }),
            createdAt: now,
          })

          return new Response(
            JSON.stringify({
              success: true,
              invoice: {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                status: 'paid',
                paidAt: now.toISOString(),
              },
              subscription: {
                id: inv.subscriptionId,
                subscriptionNumber: sub.subscriptionNumber,
                status: 'active',
                currentPeriodStart: periodStart.toISOString(),
                currentPeriodEnd: periodEnd.toISOString(),
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error marking invoice as paid:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})



