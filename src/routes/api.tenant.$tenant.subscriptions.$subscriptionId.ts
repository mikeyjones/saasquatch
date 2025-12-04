import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  subscription,
  subscriptionActivity,
  subscriptionAddOn,
  tenantOrganization,
  productPlan,
  productAddOn,
  organization,
  coupon,
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 24)
}

export const Route = createFileRoute('/api/tenant/$tenant/subscriptions/$subscriptionId')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/subscriptions/:subscriptionId
       * Fetch a single subscription with full details
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

          // Fetch subscription with related data
          const subscriptions = await db
            .select({
              id: subscription.id,
              subscriptionNumber: subscription.subscriptionNumber,
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              mrr: subscription.mrr,
              seats: subscription.seats,
              paymentMethodId: subscription.paymentMethodId,
              linkedDealId: subscription.linkedDealId,
              notes: subscription.notes,
              createdAt: subscription.createdAt,
              updatedAt: subscription.updatedAt,
              // Tenant organization info
              tenantOrgId: tenantOrganization.id,
              tenantOrgName: tenantOrganization.name,
              tenantOrgSlug: tenantOrganization.slug,
              // Product plan info
              planId: productPlan.id,
              planName: productPlan.name,
              planDescription: productPlan.description,
              planPricingModel: productPlan.pricingModel,
              // Coupon info
              couponId: coupon.id,
              couponCode: coupon.code,
              couponDiscountType: coupon.discountType,
              couponDiscountValue: coupon.discountValue,
            })
            .from(subscription)
            .innerJoin(
              tenantOrganization,
              eq(subscription.tenantOrganizationId, tenantOrganization.id)
            )
            .innerJoin(productPlan, eq(subscription.productPlanId, productPlan.id))
            .leftJoin(coupon, eq(subscription.couponId, coupon.id))
            .where(
              and(
                eq(subscription.id, params.subscriptionId),
                eq(subscription.organizationId, orgId)
              )
            )
            .limit(1)

          if (subscriptions.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Subscription not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const sub = subscriptions[0]

          // Fetch add-ons
          const addOns = await db
            .select({
              productAddOnId: subscriptionAddOn.productAddOnId,
              quantity: subscriptionAddOn.quantity,
              amount: subscriptionAddOn.amount,
              addOnName: productAddOn.name,
              addOnDescription: productAddOn.description,
            })
            .from(subscriptionAddOn)
            .innerJoin(productAddOn, eq(subscriptionAddOn.productAddOnId, productAddOn.id))
            .where(eq(subscriptionAddOn.subscriptionId, params.subscriptionId))

          // Fetch activity timeline
          const activities = await db
            .select({
              id: subscriptionActivity.id,
              activityType: subscriptionActivity.activityType,
              description: subscriptionActivity.description,
              userId: subscriptionActivity.userId,
              aiAgentId: subscriptionActivity.aiAgentId,
              metadata: subscriptionActivity.metadata,
              createdAt: subscriptionActivity.createdAt,
            })
            .from(subscriptionActivity)
            .where(eq(subscriptionActivity.subscriptionId, params.subscriptionId))
            .orderBy(desc(subscriptionActivity.createdAt))
            .limit(20)

          const response = {
            id: sub.id,
            subscriptionId: sub.subscriptionNumber,
            companyName: sub.tenantOrgName,
            status: sub.status,
            plan: sub.planName,
            mrr: sub.mrr,
            renewsAt: sub.currentPeriodEnd.toISOString().split('T')[0],
            billingCycle: sub.billingCycle,
            seats: sub.seats,
            currentPeriodStart: sub.currentPeriodStart.toISOString(),
            currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
            paymentMethodId: sub.paymentMethodId,
            linkedDealId: sub.linkedDealId,
            notes: sub.notes,
            tenantOrganization: {
              id: sub.tenantOrgId,
              name: sub.tenantOrgName,
              slug: sub.tenantOrgSlug,
            },
            productPlan: {
              id: sub.planId,
              name: sub.planName,
              description: sub.planDescription,
              pricingModel: sub.planPricingModel,
            },
            coupon: sub.couponId
              ? {
                  id: sub.couponId,
                  code: sub.couponCode,
                  discountType: sub.couponDiscountType,
                  discountValue: sub.couponDiscountValue,
                }
              : null,
            addOns: addOns.map((a) => ({
              id: a.productAddOnId,
              name: a.addOnName,
              description: a.addOnDescription,
              quantity: a.quantity,
              amount: a.amount,
            })),
            activities: activities.map((a) => ({
              id: a.id,
              type: a.activityType,
              description: a.description,
              userId: a.userId,
              aiAgentId: a.aiAgentId,
              metadata: a.metadata ? JSON.parse(a.metadata) : null,
              createdAt: a.createdAt.toISOString(),
            })),
            createdAt: sub.createdAt.toISOString(),
            updatedAt: sub.updatedAt.toISOString(),
          }

          return new Response(JSON.stringify({ subscription: response }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching subscription:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * PUT /api/tenant/:tenant/subscriptions/:subscriptionId
       * Update a subscription
       */
      PUT: async ({ request, params }) => {
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

          // Verify subscription exists and belongs to this org
          const existingSub = await db
            .select({
              id: subscription.id,
              subscriptionNumber: subscription.subscriptionNumber,
              status: subscription.status,
              productPlanId: subscription.productPlanId,
              tenantOrganizationId: subscription.tenantOrganizationId,
              mrr: subscription.mrr,
              seats: subscription.seats,
            })
            .from(subscription)
            .where(
              and(
                eq(subscription.id, params.subscriptionId),
                eq(subscription.organizationId, orgId)
              )
            )
            .limit(1)

          if (existingSub.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Subscription not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const current = existingSub[0]

          // Parse request body
          const body = await request.json()
          const { status, seats, productPlanId, notes } = body

          const now = new Date()
          const updates: Record<string, unknown> = { updatedAt: now }
          const activityMetadata: Record<string, unknown> = {}
          let activityType = 'updated'
          let activityDescription = `Subscription ${current.subscriptionNumber} updated`

          // Handle status change
          if (status && status !== current.status) {
            updates.status = status
            activityMetadata.oldStatus = current.status
            activityMetadata.newStatus = status

            if (status === 'canceled') {
              activityType = 'canceled'
              activityDescription = `Subscription ${current.subscriptionNumber} canceled`
            } else if (status === 'paused') {
              activityType = 'paused'
              activityDescription = `Subscription ${current.subscriptionNumber} paused`
            } else if (current.status === 'paused' && status === 'active') {
              activityType = 'resumed'
              activityDescription = `Subscription ${current.subscriptionNumber} resumed`
            }

            // Update tenant organization subscription status
            await db
              .update(tenantOrganization)
              .set({
                subscriptionStatus: status === 'trial' ? 'trialing' : status,
                updatedAt: now,
              })
              .where(eq(tenantOrganization.id, current.tenantOrganizationId))
          }

          // Handle seat change
          if (seats !== undefined && seats !== current.seats) {
            updates.seats = seats
            activityMetadata.oldSeats = current.seats
            activityMetadata.newSeats = seats
            
            if (seats > current.seats) {
              activityType = 'seat_added'
              activityDescription = `Added ${seats - current.seats} seat(s) to subscription ${current.subscriptionNumber}`
            } else {
              activityType = 'seat_removed'
              activityDescription = `Removed ${current.seats - seats} seat(s) from subscription ${current.subscriptionNumber}`
            }

            // TODO: Recalculate MRR based on seat pricing
          }

          // Handle plan change
          if (productPlanId && productPlanId !== current.productPlanId) {
            // Verify new plan exists
            const newPlan = await db
              .select({ id: productPlan.id, name: productPlan.name })
              .from(productPlan)
              .where(
                and(
                  eq(productPlan.id, productPlanId),
                  eq(productPlan.organizationId, orgId)
                )
              )
              .limit(1)

            if (newPlan.length === 0) {
              return new Response(
                JSON.stringify({ error: 'Product plan not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
              )
            }

            const oldPlan = await db
              .select({ name: productPlan.name })
              .from(productPlan)
              .where(eq(productPlan.id, current.productPlanId))
              .limit(1)

            updates.productPlanId = productPlanId
            activityType = 'plan_changed'
            activityMetadata.oldPlan = oldPlan[0]?.name
            activityMetadata.newPlan = newPlan[0].name
            activityDescription = `Changed plan from ${oldPlan[0]?.name || 'Unknown'} to ${newPlan[0].name}`

            // Update tenant organization plan name
            await db
              .update(tenantOrganization)
              .set({
                subscriptionPlan: newPlan[0].name,
                updatedAt: now,
              })
              .where(eq(tenantOrganization.id, current.tenantOrganizationId))

            // TODO: Recalculate MRR based on new plan pricing
          }

          // Handle notes update
          if (notes !== undefined) {
            updates.notes = notes
          }

          // Update subscription
          await db
            .update(subscription)
            .set(updates)
            .where(eq(subscription.id, params.subscriptionId))

          // Create activity entry
          await db.insert(subscriptionActivity).values({
            id: generateId(),
            subscriptionId: params.subscriptionId,
            activityType,
            description: activityDescription,
            userId: session.user.id,
            metadata: JSON.stringify(activityMetadata),
            createdAt: now,
          })

          return new Response(
            JSON.stringify({
              success: true,
              message: activityDescription,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error updating subscription:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * DELETE /api/tenant/:tenant/subscriptions/:subscriptionId
       * Cancel a subscription (soft delete)
       */
      DELETE: async ({ request, params }) => {
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

          // Verify subscription exists and belongs to this org
          const existingSub = await db
            .select({
              id: subscription.id,
              subscriptionNumber: subscription.subscriptionNumber,
              tenantOrganizationId: subscription.tenantOrganizationId,
            })
            .from(subscription)
            .where(
              and(
                eq(subscription.id, params.subscriptionId),
                eq(subscription.organizationId, orgId)
              )
            )
            .limit(1)

          if (existingSub.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Subscription not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const current = existingSub[0]
          const now = new Date()

          // Soft delete - set status to canceled
          await db
            .update(subscription)
            .set({
              status: 'canceled',
              updatedAt: now,
            })
            .where(eq(subscription.id, params.subscriptionId))

          // Update tenant organization subscription status
          await db
            .update(tenantOrganization)
            .set({
              subscriptionStatus: 'canceled',
              updatedAt: now,
            })
            .where(eq(tenantOrganization.id, current.tenantOrganizationId))

          // Create activity entry
          await db.insert(subscriptionActivity).values({
            id: generateId(),
            subscriptionId: params.subscriptionId,
            activityType: 'canceled',
            description: `Subscription ${current.subscriptionNumber} canceled`,
            userId: session.user.id,
            metadata: JSON.stringify({ canceledAt: now.toISOString() }),
            createdAt: now,
          })

          return new Response(
            JSON.stringify({
              success: true,
              message: `Subscription ${current.subscriptionNumber} has been canceled`,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error canceling subscription:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})

