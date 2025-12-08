import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  deal,
  dealActivity,
  tenantOrganization,
  tenantUser,
  organization,
  user,
  pipelineStage,
  productPlan,
  productPricing,
  subscription,
  subscriptionActivity,
} from '@/db/schema'
import { eq, and, desc, sql, or } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { generateSlug } from '@/lib/slug-utils'

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 24)
}

/**
 * Generate a unique slug for a tenant organization within an organization
 */
async function generateUniqueSlug(orgId: string, name: string): Promise<string> {
  const baseSlug = generateSlug(name)
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await db
      .select({ id: tenantOrganization.id })
      .from(tenantOrganization)
      .where(
        and(
          eq(tenantOrganization.organizationId, orgId),
          eq(tenantOrganization.slug, slug)
        )
      )
      .limit(1)

    if (existing.length === 0) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++
  }
}

export const Route = createFileRoute('/api/tenant/$tenant/crm/customers')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/crm/customers
       * Fetch all CRM customers for the organization with calculated values
       * Query params:
       * - segment: 'all' | 'customers' | 'prospects' | 'inactive'
       * - search: Search in name, industry, tags
       * - industry: Filter by industry
       * - status: Filter by subscriptionStatus
       */
      GET: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized', customers: [] }),
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
              JSON.stringify({ error: 'Organization not found', customers: [] }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Parse query params
          const url = new URL(request.url)
          const segment = url.searchParams.get('segment') || 'all'
          const search = url.searchParams.get('search')?.toLowerCase() || ''
          const industry = url.searchParams.get('industry') || ''
          const status = url.searchParams.get('status') || ''
          const importance = url.searchParams.get('importance') || ''

          // Get all tenant organizations for this org
          const tenantOrgs = await db
            .select({
              id: tenantOrganization.id,
              name: tenantOrganization.name,
              slug: tenantOrganization.slug,
              logo: tenantOrganization.logo,
              website: tenantOrganization.website,
              industry: tenantOrganization.industry,
              subscriptionPlan: tenantOrganization.subscriptionPlan,
              subscriptionStatus: tenantOrganization.subscriptionStatus,
              importance: tenantOrganization.importance,
              tags: tenantOrganization.tags,
              assignedToUserId: tenantOrganization.assignedToUserId,
              notes: tenantOrganization.notes,
              createdAt: tenantOrganization.createdAt,
              updatedAt: tenantOrganization.updatedAt,
            })
            .from(tenantOrganization)
            .where(eq(tenantOrganization.organizationId, orgId))

          if (tenantOrgs.length === 0) {
            return new Response(
              JSON.stringify({
                customers: [],
                counts: { all: 0, customers: 0, prospects: 0, inactive: 0 },
                industries: [],
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const tenantOrgIds = tenantOrgs.map((t) => t.id)

          // Get assigned users info
          const assignedUserIds = tenantOrgs
            .map((t) => t.assignedToUserId)
            .filter((id): id is string => id !== null)

          const assignedUsers =
            assignedUserIds.length > 0
              ? await db
                  .select({ id: user.id, name: user.name })
                  .from(user)
                  .where(
                    or(...assignedUserIds.map((id) => eq(user.id, id)))
                  )
              : []

          const userMap = new Map(assignedUsers.map((u) => [u.id, u.name]))

          // Get deals for all tenant orgs with stage info to determine won/lost
          const deals = await db
            .select({
              id: deal.id,
              tenantOrganizationId: deal.tenantOrganizationId,
              value: deal.value,
              stageId: deal.stageId,
              stageName: pipelineStage.name,
              stageOrder: pipelineStage.order,
              createdAt: deal.createdAt,
            })
            .from(deal)
            .innerJoin(pipelineStage, eq(deal.stageId, pipelineStage.id))
            .where(eq(deal.organizationId, orgId))

          // Group deals by tenant org and calculate values
          const dealsByTenantOrg = new Map<
            string,
            { deals: typeof deals; realizedValue: number; potentialValue: number }
          >()

          for (const d of deals) {
            if (!dealsByTenantOrg.has(d.tenantOrganizationId)) {
              dealsByTenantOrg.set(d.tenantOrganizationId, {
                deals: [],
                realizedValue: 0,
                potentialValue: 0,
              })
            }
            const entry = dealsByTenantOrg.get(d.tenantOrganizationId)
            if (!entry) continue
            entry.deals.push(d)

            // Determine if deal is won or still in progress
            // Convention: stages with names containing "won" or "closed" are realized
            // Stages with "lost" are not counted
            const stageName = d.stageName.toLowerCase()
            if (stageName.includes('won') || stageName.includes('closed-won')) {
              entry.realizedValue += d.value
            } else if (!stageName.includes('lost') && !stageName.includes('closed-lost')) {
              entry.potentialValue += d.value
            }
          }

          // Get contact counts for all tenant orgs
          const contactCounts = await db
            .select({
              tenantOrganizationId: tenantUser.tenantOrganizationId,
              count: sql<number>`count(*)::int`,
            })
            .from(tenantUser)
            .where(
              or(...tenantOrgIds.map((id) => eq(tenantUser.tenantOrganizationId, id)))
            )
            .groupBy(tenantUser.tenantOrganizationId)

          const contactCountMap = new Map(
            contactCounts.map((c) => [c.tenantOrganizationId, c.count])
          )

          // Get recent activities for all tenant orgs
          const recentActivities = await db
            .select({
              id: dealActivity.id,
              dealId: dealActivity.dealId,
              tenantOrganizationId: deal.tenantOrganizationId,
              activityType: dealActivity.activityType,
              description: dealActivity.description,
              userId: dealActivity.userId,
              aiAgentId: dealActivity.aiAgentId,
              createdAt: dealActivity.createdAt,
            })
            .from(dealActivity)
            .innerJoin(deal, eq(dealActivity.dealId, deal.id))
            .where(eq(deal.organizationId, orgId))
            .orderBy(desc(dealActivity.createdAt))
            .limit(100) // Limit for performance

          // Group activities by tenant org and limit per org
          const activitiesByTenantOrg = new Map<string, typeof recentActivities>()
          for (const activity of recentActivities) {
            if (!activitiesByTenantOrg.has(activity.tenantOrganizationId)) {
              activitiesByTenantOrg.set(activity.tenantOrganizationId, [])
            }
            const activities = activitiesByTenantOrg.get(activity.tenantOrganizationId)
            if (!activities) continue
            if (activities.length < 5) {
              activities.push(activity)
            }
          }

          // Get user names for activities
          const activityUserIds = recentActivities
            .map((a) => a.userId)
            .filter((id): id is string => id !== null)
          const activityUsers =
            activityUserIds.length > 0
              ? await db
                  .select({ id: user.id, name: user.name })
                  .from(user)
                  .where(
                    or(...activityUserIds.map((id) => eq(user.id, id)))
                  )
              : []
          const activityUserMap = new Map(activityUsers.map((u) => [u.id, u.name]))

          // Determine customer status based on subscription status
          function getCustomerStatus(
            subscriptionStatus: string | null
          ): 'customer' | 'prospect' | 'inactive' {
            if (!subscriptionStatus || subscriptionStatus === 'trialing') {
              return 'prospect'
            }
            if (subscriptionStatus === 'active') {
              return 'customer'
            }
            if (subscriptionStatus === 'canceled' || subscriptionStatus === 'inactive') {
              return 'inactive'
            }
            // past_due is still a customer
            if (subscriptionStatus === 'past_due') {
              return 'customer'
            }
            return 'prospect'
          }

          // Map activity types
          function mapActivityType(
            activityType: string
          ): 'deal_created' | 'deal_won' | 'deal_lost' | 'contact_added' | 'note' | 'meeting' {
            if (activityType === 'deal_created') return 'deal_created'
            if (activityType === 'stage_change') return 'deal_created' // Could be refined based on stage
            if (activityType === 'deal_won' || activityType.includes('won')) return 'deal_won'
            if (activityType === 'deal_lost' || activityType.includes('lost')) return 'deal_lost'
            if (activityType === 'contact_added') return 'contact_added'
            if (activityType === 'meeting') return 'meeting'
            return 'note'
          }

          // Build customers response
          const customers = tenantOrgs.map((org) => {
            const dealData = dealsByTenantOrg.get(org.id) || {
              deals: [],
              realizedValue: 0,
              potentialValue: 0,
            }
            const activities = activitiesByTenantOrg.get(org.id) || []
            const contactCount = contactCountMap.get(org.id) || 0
            const parsedTags = org.tags ? JSON.parse(org.tags) : []
            const customerStatus = getCustomerStatus(org.subscriptionStatus)

            // Get the most recent activity timestamp
            const lastActivity =
              activities.length > 0
                ? activities[0].createdAt
                : dealData.deals.length > 0
                  ? dealData.deals.reduce((latest, d) =>
                      d.createdAt > latest ? d.createdAt : latest, dealData.deals[0].createdAt)
                  : org.updatedAt

            return {
              id: org.id,
              name: org.name,
              industry: org.industry || 'Other',
              logo: org.logo,
              website: org.website,
              status: customerStatus,
              subscriptionStatus: org.subscriptionStatus as
                | 'active'
                | 'trialing'
                | 'canceled'
                | 'past_due'
                | undefined,
              subscriptionPlan: org.subscriptionPlan,
              importance: (org.importance || 'normal') as 'low' | 'normal' | 'high' | 'vip',
              realizedValue: dealData.realizedValue,
              potentialValue: dealData.potentialValue,
              lastActivity: lastActivity.toISOString(),
              dealCount: dealData.deals.length,
              contactCount,
              assignedTo: org.assignedToUserId
                ? {
                    id: org.assignedToUserId,
                    name: userMap.get(org.assignedToUserId) || 'Unknown',
                  }
                : undefined,
              tags: parsedTags,
              activities: activities.map((a) => ({
                id: a.id,
                type: mapActivityType(a.activityType),
                description: a.description,
                timestamp: a.createdAt.toISOString(),
                userId: a.userId || undefined,
                userName: a.userId ? activityUserMap.get(a.userId) : undefined,
              })),
            }
          })

          // Calculate segment counts
          const counts = {
            all: customers.length,
            customers: customers.filter((c) => c.status === 'customer').length,
            prospects: customers.filter((c) => c.status === 'prospect').length,
            inactive: customers.filter((c) => c.status === 'inactive').length,
          }

          // Get unique industries
          const industries = [
            ...new Set(
              tenantOrgs.map((t) => t.industry).filter((i): i is string => i !== null)
            ),
          ].sort()

          // Apply filters
          let filteredCustomers = customers

          // Segment filter
          if (segment === 'customers') {
            filteredCustomers = filteredCustomers.filter((c) => c.status === 'customer')
          } else if (segment === 'prospects') {
            filteredCustomers = filteredCustomers.filter((c) => c.status === 'prospect')
          } else if (segment === 'inactive') {
            filteredCustomers = filteredCustomers.filter((c) => c.status === 'inactive')
          }

          // Search filter
          if (search) {
            filteredCustomers = filteredCustomers.filter(
              (c) =>
                c.name.toLowerCase().includes(search) ||
                c.industry.toLowerCase().includes(search) ||
                c.tags.some((t: string) => t.toLowerCase().includes(search))
            )
          }

          // Industry filter
          if (industry) {
            filteredCustomers = filteredCustomers.filter((c) => c.industry === industry)
          }

          // Status filter
          if (status) {
            filteredCustomers = filteredCustomers.filter(
              (c) => c.subscriptionStatus === status
            )
          }

          // Importance filter
          if (importance) {
            filteredCustomers = filteredCustomers.filter(
              (c) => c.importance === importance
            )
          }

          return new Response(
            JSON.stringify({
              customers: filteredCustomers,
              counts,
              industries,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error fetching CRM customers:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error', customers: [] }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * POST /api/tenant/:tenant/crm/customers
       * Create a new customer (tenant organization)
       * Body:
       * - name (required) - Company name
       * - slug (optional) - Auto-generated from name if not provided
       * - industry (optional)
       * - website (optional)
       * - billingEmail (optional)
       * - billingAddress (optional)
       * - assignedToUserId (optional) - Sales rep assignment
       * - tags (optional) - Array of tags
       * - notes (optional)
       * - createSubscription (optional boolean) - Create subscription immediately
       * - subscriptionData (optional) - Required if createSubscription is true:
       *   - productPlanId (required)
       *   - status (optional, default 'active')
       *   - billingCycle (optional, default 'monthly')
       *   - seats (optional, default 1)
       *   - couponId (optional)
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

          // Parse request body
          const body = await request.json()
          const {
            name,
            slug: providedSlug,
            industry,
            website,
            billingEmail,
            billingAddress,
            assignedToUserId,
            importance,
            tags,
            notes,
            createSubscription,
            subscriptionData,
          } = body as {
            name: string
            slug?: string
            industry?: string
            website?: string
            billingEmail?: string
            billingAddress?: string
            assignedToUserId?: string
            importance?: string
            tags?: string[]
            notes?: string
            createSubscription?: boolean
            subscriptionData?: {
              productPlanId: string
              status?: string
              billingCycle?: string
              seats?: number
              couponId?: string
            }
          }

          // Validate required fields
          if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return new Response(
              JSON.stringify({ error: 'Company name is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Validate subscription data if creating subscription
          if (createSubscription) {
            if (!subscriptionData?.productPlanId) {
              return new Response(
                JSON.stringify({ error: 'Product plan is required when creating subscription' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
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
                  eq(productPlan.id, subscriptionData.productPlanId),
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
          }

          // Validate assignedToUserId if provided
          if (assignedToUserId) {
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
          }

          // Generate unique slug
          const slug = providedSlug 
            ? await generateUniqueSlug(orgId, providedSlug)
            : await generateUniqueSlug(orgId, name)

          const now = new Date()
          const customerId = generateId()

          // Create tenant organization
          await db.insert(tenantOrganization).values({
            id: customerId,
            organizationId: orgId,
            name: name.trim(),
            slug,
            industry: industry || null,
            website: website || null,
            billingEmail: billingEmail || null,
            billingAddress: billingAddress || null,
            assignedToUserId: assignedToUserId || null,
            importance: importance || 'normal',
            tags: tags && tags.length > 0 ? JSON.stringify(tags) : null,
            notes: notes || null,
            subscriptionPlan: null,
            subscriptionStatus: null,
            createdAt: now,
            updatedAt: now,
          })

          let subscriptionResult = null

          // Create subscription if requested
          if (createSubscription && subscriptionData) {
            const {
              productPlanId,
              status: subStatus = 'active',
              billingCycle = 'monthly',
              seats = 1,
              couponId,
            } = subscriptionData

            // Get plan info
            const plan = await db
              .select({ 
                id: productPlan.id, 
                name: productPlan.name,
              })
              .from(productPlan)
              .where(eq(productPlan.id, productPlanId))
              .limit(1)

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
                  mrr = Math.round(p.amount / 12)
                } else {
                  mrr = p.amount
                }
              }
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
            const periodStart = now
            const periodEnd = new Date(now)
            if (billingCycle === 'yearly') {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1)
            } else {
              periodEnd.setMonth(periodEnd.getMonth() + 1)
            }

            const subscriptionId = generateId()

            // Create subscription
            await db.insert(subscription).values({
              id: subscriptionId,
              organizationId: orgId,
              tenantOrganizationId: customerId,
              subscriptionNumber: subNumber,
              productPlanId,
              status: subStatus,
              billingCycle,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              mrr,
              seats,
              couponId: couponId || null,
              createdAt: now,
              updatedAt: now,
            })

            // Create subscription activity
            await db.insert(subscriptionActivity).values({
              id: generateId(),
              subscriptionId,
              activityType: 'created',
              description: `Subscription ${subNumber} created for ${name.trim()} on ${plan[0].name} plan`,
              userId: session.user.id,
              metadata: JSON.stringify({
                plan: plan[0].name,
                mrr,
                seats,
                billingCycle,
              }),
              createdAt: now,
            })

            // Update tenant organization with subscription info
            await db
              .update(tenantOrganization)
              .set({
                subscriptionPlan: plan[0].name,
                subscriptionStatus: subStatus === 'trial' ? 'trialing' : subStatus,
                updatedAt: now,
              })
              .where(eq(tenantOrganization.id, customerId))

            subscriptionResult = {
              id: subscriptionId,
              subscriptionNumber: subNumber,
              plan: plan[0].name,
              mrr,
              status: subStatus,
              billingCycle,
              seats,
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              customer: {
                id: customerId,
                name: name.trim(),
                slug,
                industry: industry || null,
                website: website || null,
                billingEmail: billingEmail || null,
                tags: tags || [],
                assignedToUserId: assignedToUserId || null,
                subscriptionPlan: subscriptionResult?.plan || null,
                subscriptionStatus: subscriptionResult?.status || null,
              },
              subscription: subscriptionResult,
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error creating customer:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})

