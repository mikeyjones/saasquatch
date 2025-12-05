import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  tenantOrganization,
  organization,
  user,
  subscription,
  productPlan,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/tenant/$tenant/crm/customers/$customerId')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/crm/customers/:customerId
       * Fetch a single customer with full details
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

          // Fetch customer
          const customer = await db
            .select({
              id: tenantOrganization.id,
              name: tenantOrganization.name,
              slug: tenantOrganization.slug,
              industry: tenantOrganization.industry,
              website: tenantOrganization.website,
              billingEmail: tenantOrganization.billingEmail,
              billingAddress: tenantOrganization.billingAddress,
              assignedToUserId: tenantOrganization.assignedToUserId,
              tags: tenantOrganization.tags,
              notes: tenantOrganization.notes,
              subscriptionPlan: tenantOrganization.subscriptionPlan,
              subscriptionStatus: tenantOrganization.subscriptionStatus,
              createdAt: tenantOrganization.createdAt,
              updatedAt: tenantOrganization.updatedAt,
            })
            .from(tenantOrganization)
            .where(
              and(
                eq(tenantOrganization.id, params.customerId),
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

          const c = customer[0]
          const parsedTags = c.tags ? JSON.parse(c.tags) : []

          // Fetch active subscription for this customer
          const activeSubscription = await db
            .select({
              id: subscription.id,
              subscriptionNumber: subscription.subscriptionNumber,
              productPlanId: subscription.productPlanId,
              planName: productPlan.name,
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              seats: subscription.seats,
              mrr: subscription.mrr,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              createdAt: subscription.createdAt,
            })
            .from(subscription)
            .innerJoin(productPlan, eq(subscription.productPlanId, productPlan.id))
            .where(
              and(
                eq(subscription.tenantOrganizationId, params.customerId),
                eq(subscription.organizationId, orgId),
                eq(subscription.status, 'active')
              )
            )
            .limit(1)

          const subscriptionData = activeSubscription.length > 0 ? {
            id: activeSubscription[0].id,
            subscriptionNumber: activeSubscription[0].subscriptionNumber,
            productPlanId: activeSubscription[0].productPlanId,
            planName: activeSubscription[0].planName,
            status: activeSubscription[0].status,
            billingCycle: activeSubscription[0].billingCycle,
            seats: activeSubscription[0].seats,
            mrr: activeSubscription[0].mrr,
            currentPeriodStart: activeSubscription[0].currentPeriodStart.toISOString(),
            currentPeriodEnd: activeSubscription[0].currentPeriodEnd.toISOString(),
            createdAt: activeSubscription[0].createdAt.toISOString(),
          } : null

          return new Response(
            JSON.stringify({
              customer: {
                id: c.id,
                name: c.name,
                slug: c.slug,
                industry: c.industry,
                website: c.website,
                billingEmail: c.billingEmail,
                billingAddress: c.billingAddress,
                assignedToUserId: c.assignedToUserId,
                tags: parsedTags,
                notes: c.notes,
                subscriptionPlan: c.subscriptionPlan,
                subscriptionStatus: c.subscriptionStatus,
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
              },
              subscription: subscriptionData,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error fetching customer:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * PUT /api/tenant/:tenant/crm/customers/:customerId
       * Update an existing customer (tenant organization)
       * Body:
       * - name (optional) - Company name
       * - industry (optional)
       * - website (optional)
       * - billingEmail (optional)
       * - billingAddress (optional)
       * - assignedToUserId (optional) - Sales rep assignment (null to unassign)
       * - tags (optional) - Array of tags
       * - notes (optional)
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

          // Verify customer exists and belongs to this organization
          const existingCustomer = await db
            .select({
              id: tenantOrganization.id,
              name: tenantOrganization.name,
            })
            .from(tenantOrganization)
            .where(
              and(
                eq(tenantOrganization.id, params.customerId),
                eq(tenantOrganization.organizationId, orgId)
              )
            )
            .limit(1)

          if (existingCustomer.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Customer not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Parse request body
          const body = await request.json()
          const {
            name,
            industry,
            website,
            billingEmail,
            billingAddress,
            assignedToUserId,
            tags,
            notes,
          } = body as {
            name?: string
            industry?: string
            website?: string
            billingEmail?: string
            billingAddress?: string
            assignedToUserId?: string | null
            tags?: string[]
            notes?: string
          }

          // Build update object with only provided fields
          const updateData: {
            name?: string
            industry?: string | null
            website?: string | null
            billingEmail?: string | null
            billingAddress?: string | null
            assignedToUserId?: string | null
            tags?: string | null
            notes?: string | null
            updatedAt: Date
          } = {
            updatedAt: new Date(),
          }

          if (name !== undefined && typeof name === 'string' && name.trim().length > 0) {
            updateData.name = name.trim()
          }

          if (industry !== undefined) {
            updateData.industry = industry || null
          }

          if (website !== undefined) {
            updateData.website = website || null
          }

          if (billingEmail !== undefined) {
            updateData.billingEmail = billingEmail || null
          }

          if (billingAddress !== undefined) {
            updateData.billingAddress = billingAddress || null
          }

          if (assignedToUserId !== undefined) {
            if (assignedToUserId === null || assignedToUserId === '' || assignedToUserId === 'unassigned') {
              updateData.assignedToUserId = null
            } else {
              // Validate assignedToUserId if provided
              const assignedUser = await db
                .select({ id: user.id })
                .from(user)
                .where(eq(user.id, assignedToUserId))
                .limit(1)

              if (assignedUser.length === 0) {
                return new Response(
                  JSON.stringify({ error: 'Assigned user not found' }),
                  { status: 404, headers: { 'Content-Type': 'application/json' } }
                )
              }
              updateData.assignedToUserId = assignedToUserId
            }
          }

          if (tags !== undefined) {
            updateData.tags = tags && tags.length > 0 ? JSON.stringify(tags) : null
          }

          if (notes !== undefined) {
            updateData.notes = notes || null
          }

          // Update tenant organization
          await db
            .update(tenantOrganization)
            .set(updateData)
            .where(eq(tenantOrganization.id, params.customerId))

          // Fetch updated customer
          const updatedCustomer = await db
            .select({
              id: tenantOrganization.id,
              name: tenantOrganization.name,
              slug: tenantOrganization.slug,
              industry: tenantOrganization.industry,
              website: tenantOrganization.website,
              billingEmail: tenantOrganization.billingEmail,
              billingAddress: tenantOrganization.billingAddress,
              assignedToUserId: tenantOrganization.assignedToUserId,
              tags: tenantOrganization.tags,
              notes: tenantOrganization.notes,
              subscriptionPlan: tenantOrganization.subscriptionPlan,
              subscriptionStatus: tenantOrganization.subscriptionStatus,
            })
            .from(tenantOrganization)
            .where(eq(tenantOrganization.id, params.customerId))
            .limit(1)

          const customer = updatedCustomer[0]
          const parsedTags = customer.tags ? JSON.parse(customer.tags) : []

          return new Response(
            JSON.stringify({
              success: true,
              customer: {
                id: customer.id,
                name: customer.name,
                slug: customer.slug,
                industry: customer.industry,
                website: customer.website,
                billingEmail: customer.billingEmail,
                billingAddress: customer.billingAddress,
                assignedToUserId: customer.assignedToUserId,
                tags: parsedTags,
                notes: customer.notes,
                subscriptionPlan: customer.subscriptionPlan,
                subscriptionStatus: customer.subscriptionStatus,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error updating customer:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})

