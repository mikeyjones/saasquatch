import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  subscription,
  subscriptionActivity,
  tenantOrganization,
  productPlan,
  productPricing,
  organization,
  user,
  coupon,
  invoice,
} from '@/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { generateInvoicePDF, type InvoiceLineItem } from '@/lib/invoice-pdf'

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 24)
}

export const Route = createFileRoute('/api/tenant/$tenant/subscriptions')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/subscriptions
       * Fetch all subscriptions for the organization
       * Query params:
       * - status: Filter by status (active, trial, past_due, canceled, paused)
       * - tenantOrgId: Filter by tenant organization
       */
      GET: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized', subscriptions: [] }),
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
              JSON.stringify({ error: 'Organization not found', subscriptions: [] }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Parse query params
          const url = new URL(request.url)
          const statusFilter = url.searchParams.get('status')
          const tenantOrgId = url.searchParams.get('tenantOrgId')

          // Build conditions
          const conditions = [eq(subscription.organizationId, orgId)]

          if (statusFilter) {
            conditions.push(eq(subscription.status, statusFilter))
          }

          if (tenantOrgId) {
            conditions.push(eq(subscription.tenantOrganizationId, tenantOrgId))
          }

          // Fetch subscriptions with related data
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
              planPricingModel: productPlan.pricingModel,
              // Coupon info
              couponId: coupon.id,
              couponCode: coupon.code,
            })
            .from(subscription)
            .innerJoin(
              tenantOrganization,
              eq(subscription.tenantOrganizationId, tenantOrganization.id)
            )
            .innerJoin(productPlan, eq(subscription.productPlanId, productPlan.id))
            .leftJoin(coupon, eq(subscription.couponId, coupon.id))
            .where(and(...conditions))
            .orderBy(desc(subscription.createdAt))

          // Transform to response format
          const response = subscriptions.map((sub) => ({
            id: sub.id,
            subscriptionId: sub.subscriptionNumber,
            companyName: sub.tenantOrgName,
            status: sub.status as 'active' | 'trial' | 'past_due' | 'canceled' | 'paused',
            plan: sub.planName,
            mrr: sub.mrr,
            renewsAt: sub.currentPeriodEnd.toISOString().split('T')[0],
            billingCycle: sub.billingCycle,
            seats: sub.seats,
            tenantOrganization: {
              id: sub.tenantOrgId,
              name: sub.tenantOrgName,
              slug: sub.tenantOrgSlug,
            },
            productPlan: {
              id: sub.planId,
              name: sub.planName,
              pricingModel: sub.planPricingModel,
            },
            coupon: sub.couponId
              ? {
                  id: sub.couponId,
                  code: sub.couponCode,
                }
              : null,
            createdAt: sub.createdAt.toISOString(),
            updatedAt: sub.updatedAt.toISOString(),
          }))

          return new Response(JSON.stringify({ subscriptions: response }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching subscriptions:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error', subscriptions: [] }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * POST /api/tenant/:tenant/subscriptions
       * Create a new subscription in draft status with a draft invoice
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

          // Get the organization by slug (including name for invoice)
          const org = await db
            .select({ id: organization.id, name: organization.name, slug: organization.slug })
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
          const orgName = org[0].name
          const orgSlug = org[0].slug

          // Parse request body
          const body = await request.json()
          const {
            tenantOrganizationId,
            productPlanId,
            // Subscriptions always start as draft - activate when invoice is paid
            billingCycle = 'monthly',
            seats = 1,
            couponId,
            linkedDealId,
            notes,
          } = body

          // Validate required fields
          if (!tenantOrganizationId || !productPlanId) {
            return new Response(
              JSON.stringify({
                error: 'Missing required fields: tenantOrganizationId, productPlanId',
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Verify tenant org belongs to this org (get billing info for invoice)
          const tenantOrg = await db
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

          if (tenantOrg.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Tenant organization not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Check for existing active subscription
          const existingSubscription = await db
            .select({ id: subscription.id, subscriptionNumber: subscription.subscriptionNumber })
            .from(subscription)
            .where(
              and(
                eq(subscription.tenantOrganizationId, tenantOrganizationId),
                eq(subscription.organizationId, orgId),
                eq(subscription.status, 'active')
              )
            )
            .limit(1)

          if (existingSubscription.length > 0) {
            return new Response(
              JSON.stringify({ 
                error: 'Company already has an active subscription',
                existingSubscriptionNumber: existingSubscription[0].subscriptionNumber,
              }),
              { status: 409, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Verify product plan belongs to this org
          const plan = await db
            .select({ 
              id: productPlan.id, 
              name: productPlan.name,
              pricingModel: productPlan.pricingModel,
            })
            .from(productPlan)
            .where(
              and(
                eq(productPlan.id, productPlanId),
                eq(productPlan.organizationId, orgId)
              )
            )
            .limit(1)

          if (plan.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Product plan not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Get plan pricing to calculate MRR
          const pricing = await db
            .select({
              amount: productPricing.amount,
              interval: productPricing.interval,
              perSeatAmount: productPricing.perSeatAmount,
              pricingType: productPricing.pricingType,
            })
            .from(productPricing)
            .where(
              and(
                eq(productPricing.productPlanId, productPlanId),
                eq(productPricing.pricingType, 'base')
              )
            )
            .limit(1)

          // Calculate MRR
          let mrr = 0
          if (pricing.length > 0) {
            const p = pricing[0]
            if (p.pricingType === 'base') {
              if (p.interval === 'yearly') {
                // Convert yearly to monthly
                mrr = Math.round(p.amount / 12)
              } else {
                mrr = p.amount
              }
            }
            // Add per-seat pricing
            if (p.perSeatAmount) {
              mrr += p.perSeatAmount * seats
            }
          }

          // Generate subscription number
          const existingCount = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(subscription)
            .where(eq(subscription.organizationId, orgId))

          const subNumber = `SUB-${(existingCount[0]?.count || 0) + 1000}`

          // Calculate billing period
          const now = new Date()
          const periodStart = now
          const periodEnd = new Date(now)
          if (billingCycle === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1)
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1)
          }

          const subscriptionId = generateId()
          
          // Subscription always starts as draft - activate when invoice is paid
          const subscriptionStatus = 'draft'

          // Create subscription
          await db.insert(subscription).values({
            id: subscriptionId,
            organizationId: orgId,
            tenantOrganizationId,
            subscriptionNumber: subNumber,
            productPlanId,
            status: subscriptionStatus,
            billingCycle,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            mrr,
            seats,
            linkedDealId: linkedDealId || null,
            couponId: couponId || null,
            notes: notes || null,
            createdAt: now,
            updatedAt: now,
          })

          // Create activity entry
          await db.insert(subscriptionActivity).values({
            id: generateId(),
            subscriptionId,
            activityType: 'created',
            description: `Subscription ${subNumber} created for ${tenantOrg[0].name} on ${plan[0].name} plan (pending invoice payment)`,
            userId: session.user.id,
            metadata: JSON.stringify({
              plan: plan[0].name,
              mrr,
              seats,
              billingCycle,
              status: subscriptionStatus,
            }),
            createdAt: now,
          })

          // Update tenant organization subscription info
          await db
            .update(tenantOrganization)
            .set({
              subscriptionPlan: plan[0].name,
              subscriptionStatus: subscriptionStatus,
              updatedAt: now,
            })
            .where(eq(tenantOrganization.id, tenantOrganizationId))

          // Generate invoice number
          const invoiceCount = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(invoice)
            .where(eq(invoice.organizationId, orgId))
          
          const invoiceNumber = `INV-${orgSlug.toUpperCase()}-${(invoiceCount[0]?.count || 0) + 1001}`

          // Calculate invoice amounts
          const invoiceSubtotal = billingCycle === 'yearly' ? mrr * 12 : mrr
          const invoiceTax = 0 // Tax calculation could be added later
          const invoiceTotal = invoiceSubtotal + invoiceTax

          // Create line items
          const lineItems: InvoiceLineItem[] = [
            {
              description: `${plan[0].name} - ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} subscription`,
              quantity: 1,
              unitPrice: invoiceSubtotal,
              total: invoiceSubtotal,
            },
          ]

          // Add seat line item if applicable
          if (seats > 1 && pricing.length > 0 && pricing[0].perSeatAmount) {
            const seatTotal = pricing[0].perSeatAmount * (seats - 1) * (billingCycle === 'yearly' ? 12 : 1)
            lineItems.push({
              description: `Additional seats (${seats - 1} seats)`,
              quantity: seats - 1,
              unitPrice: pricing[0].perSeatAmount * (billingCycle === 'yearly' ? 12 : 1),
              total: seatTotal,
            })
          }

          // Calculate due date (30 days from now)
          const dueDate = new Date(now)
          dueDate.setDate(dueDate.getDate() + 30)

          const invoiceId = generateId()

          // Generate PDF invoice
          let pdfPath: string | null = null
          try {
            pdfPath = await generateInvoicePDF(
              {
                invoiceNumber,
                issueDate: now,
                dueDate,
                organizationName: orgName,
                organizationSlug: orgSlug,
                customerName: tenantOrg[0].name,
                customerEmail: tenantOrg[0].billingEmail || undefined,
                customerAddress: tenantOrg[0].billingAddress || undefined,
                lineItems,
                subtotal: invoiceSubtotal,
                tax: invoiceTax,
                total: invoiceTotal,
                currency: 'USD',
                notes: notes || undefined,
              },
              orgId
            )
          } catch (pdfError) {
            console.error('Error generating invoice PDF:', pdfError)
            // Continue without PDF - it can be regenerated later
          }

          // Create invoice
          await db.insert(invoice).values({
            id: invoiceId,
            organizationId: orgId,
            subscriptionId,
            tenantOrganizationId,
            invoiceNumber,
            status: 'draft',
            subtotal: invoiceSubtotal,
            tax: invoiceTax,
            total: invoiceTotal,
            currency: 'USD',
            issueDate: now,
            dueDate,
            lineItems: JSON.stringify(lineItems),
            pdfPath,
            billingName: tenantOrg[0].name,
            billingEmail: tenantOrg[0].billingEmail,
            billingAddress: tenantOrg[0].billingAddress,
            notes: notes || null,
            createdAt: now,
            updatedAt: now,
          })

          // Create invoice activity on subscription
          await db.insert(subscriptionActivity).values({
            id: generateId(),
            subscriptionId,
            activityType: 'invoice_created',
            description: `Invoice ${invoiceNumber} created for ${invoiceTotal / 100} USD`,
            userId: session.user.id,
            metadata: JSON.stringify({
              invoiceId,
              invoiceNumber,
              total: invoiceTotal,
            }),
            createdAt: now,
          })

          return new Response(
            JSON.stringify({
              success: true,
              subscription: {
                id: subscriptionId,
                subscriptionId: subNumber,
                companyName: tenantOrg[0].name,
                plan: plan[0].name,
                mrr,
                status: subscriptionStatus,
              },
              invoice: {
                id: invoiceId,
                invoiceNumber,
                total: invoiceTotal,
                status: 'draft',
                dueDate: dueDate.toISOString(),
                pdfPath,
              },
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error creating subscription:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})


