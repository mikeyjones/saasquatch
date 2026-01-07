import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  invoice,
  subscription,
  subscriptionActivity,
  tenantOrganization,
  organization,
  productPlan,
  productPricing,
} from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import type { InvoiceLineItem } from '@/lib/invoice-pdf'

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
              lineItems: invoice.lineItems,
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

          // Get tenant org name for activity log
          const tenantOrgData = await db
            .select({ name: tenantOrganization.name })
            .from(tenantOrganization)
            .where(eq(tenantOrganization.id, inv.tenantOrganizationId))
            .limit(1)

          // Update invoice status to paid
          await db
            .update(invoice)
            .set({
              status: 'paid',
              paidAt: now,
              updatedAt: now,
            })
            .where(eq(invoice.id, inv.id))

          // If invoice is linked to a subscription, activate it
          if (inv.subscriptionId) {
            // Get subscription details
            const subscriptionData = await db
              .select({
                subscriptionNumber: subscription.subscriptionNumber,
                billingCycle: subscription.billingCycle,
                productPlanId: subscription.productPlanId,
              })
              .from(subscription)
              .where(eq(subscription.id, inv.subscriptionId))
              .limit(1)

            if (subscriptionData.length > 0) {
              const sub = subscriptionData[0]

              // Get plan name for activity log
              const planData = await db
                .select({ name: productPlan.name })
                .from(productPlan)
                .where(eq(productPlan.id, sub.productPlanId))
                .limit(1)

              // Calculate new billing period start from payment date
              const periodStart = now
              const periodEnd = new Date(now)
              if (sub.billingCycle === 'yearly') {
                periodEnd.setFullYear(periodEnd.getFullYear() + 1)
              } else {
                periodEnd.setMonth(periodEnd.getMonth() + 1)
              }

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
            }
          }

          // Create subscriptions from line items with productPlanId
          const createdSubscriptions: Array<{
            id: string
            subscriptionNumber: string
            status: string
            planName: string
          }> = []

          if (inv.lineItems) {
            let lineItems: InvoiceLineItem[]
            try {
              lineItems = JSON.parse(inv.lineItems) as InvoiceLineItem[]
            } catch {
              lineItems = []
            }

            // Filter line items that have a productPlanId and aren't already linked to a subscription
            const lineItemsWithPlans = lineItems.filter(
              (item) => item.productPlanId && !inv.subscriptionId
            )

            for (const lineItem of lineItemsWithPlans) {
              // Fetch the product plan details
              const planDetails = await db
                .select({
                  id: productPlan.id,
                  name: productPlan.name,
                })
                .from(productPlan)
                .where(eq(productPlan.id, lineItem.productPlanId!))
                .limit(1)

              if (planDetails.length === 0) {
                console.warn(`Product plan not found: ${lineItem.productPlanId}`)
                continue
              }

              const plan = planDetails[0]

              // Get pricing for MRR calculation
              const pricingData = await db
                .select({
                  amount: productPricing.amount,
                  interval: productPricing.interval,
                  perSeatAmount: productPricing.perSeatAmount,
                })
                .from(productPricing)
                .where(eq(productPricing.productPlanId, plan.id))

              // Calculate MRR and determine billing cycle from pricing
              // Default to line item total as the monthly amount
              let mrr = lineItem.total
              let billingCycle: 'monthly' | 'yearly' = 'monthly'

              if (pricingData.length > 0) {
                // If we have pricing data, find monthly or calculate from yearly
                const monthlyPricing = pricingData.find((p) => p.interval === 'monthly')
                const yearlyPricing = pricingData.find((p) => p.interval === 'yearly')

                if (monthlyPricing) {
                  mrr = monthlyPricing.amount
                  billingCycle = 'monthly'
                } else if (yearlyPricing) {
                  mrr = Math.round(yearlyPricing.amount / 12)
                  billingCycle = 'yearly'
                }
              }

              // Generate subscription number
              const existingCount = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(subscription)
                .where(eq(subscription.organizationId, orgId))

              const subNumber = `SUB-${(existingCount[0]?.count || 0) + 1000}`

              // Calculate billing period
              const periodStart = now
              const periodEnd = new Date(now)
              if (billingCycle === 'yearly') {
                periodEnd.setFullYear(periodEnd.getFullYear() + 1)
              } else {
                periodEnd.setMonth(periodEnd.getMonth() + 1)
              }

              const subscriptionId = generateId()

              // Create subscription (active since invoice is paid)
              await db.insert(subscription).values({
                id: subscriptionId,
                organizationId: orgId,
                tenantOrganizationId: inv.tenantOrganizationId,
                subscriptionNumber: subNumber,
                productPlanId: plan.id,
                status: 'active',
                billingCycle,
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                mrr,
                seats: lineItem.quantity,
                createdAt: now,
                updatedAt: now,
              })

              // Create subscription activity
              await db.insert(subscriptionActivity).values({
                id: generateId(),
                subscriptionId,
                activityType: 'created',
                description: `Subscription ${subNumber} created from invoice ${inv.invoiceNumber}`,
                userId: session.user.id,
                metadata: JSON.stringify({
                  plan: plan.name,
                  mrr,
                  seats: lineItem.quantity,
                  billingCycle,
                  invoiceId: inv.id,
                }),
                createdAt: now,
              })

              // Create activation activity
              await db.insert(subscriptionActivity).values({
                id: generateId(),
                subscriptionId,
                activityType: 'activated',
                description: `Subscription ${subNumber} activated for ${tenantOrgData[0]?.name || 'customer'}`,
                userId: session.user.id,
                metadata: JSON.stringify({
                  plan: plan.name,
                  billingCycle,
                  periodStart: periodStart.toISOString(),
                  periodEnd: periodEnd.toISOString(),
                }),
                createdAt: now,
              })

              createdSubscriptions.push({
                id: subscriptionId,
                subscriptionNumber: subNumber,
                status: 'active',
                planName: plan.name,
              })
            }

            // Update tenant organization if subscriptions were created
            if (createdSubscriptions.length > 0) {
              await db
                .update(tenantOrganization)
                .set({
                  subscriptionStatus: 'active',
                  subscriptionPlan: createdSubscriptions[0].planName,
                  updatedAt: now,
                })
                .where(eq(tenantOrganization.id, inv.tenantOrganizationId))
            }
          }

          const responseData: {
            success: boolean
            invoice: {
              id: string
              invoiceNumber: string
              status: string
              paidAt: string
            }
            subscription?: {
              id: string
              subscriptionNumber: string
              status: string
              currentPeriodStart: string
              currentPeriodEnd: string
            }
            createdSubscriptions?: Array<{
              id: string
              subscriptionNumber: string
              status: string
              planName: string
            }>
          } = {
            success: true,
            invoice: {
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              status: 'paid',
              paidAt: now.toISOString(),
            },
          }

          // Include created subscriptions from line items
          if (createdSubscriptions.length > 0) {
            responseData.createdSubscriptions = createdSubscriptions
          }

          // Include subscription data if invoice is linked to a subscription
          if (inv.subscriptionId) {
            const subscriptionData = await db
              .select({
                subscriptionNumber: subscription.subscriptionNumber,
                billingCycle: subscription.billingCycle,
              })
              .from(subscription)
              .where(eq(subscription.id, inv.subscriptionId))
              .limit(1)

            if (subscriptionData.length > 0) {
              const sub = subscriptionData[0]
              const periodStart = now
              const periodEnd = new Date(now)
              if (sub.billingCycle === 'yearly') {
                periodEnd.setFullYear(periodEnd.getFullYear() + 1)
              } else {
                periodEnd.setMonth(periodEnd.getMonth() + 1)
              }

              responseData.subscription = {
                id: inv.subscriptionId,
                subscriptionNumber: sub.subscriptionNumber,
                status: 'active',
                currentPeriodStart: periodStart.toISOString(),
                currentPeriodEnd: periodEnd.toISOString(),
              }
            }
          }

          return new Response(
            JSON.stringify(responseData),
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




