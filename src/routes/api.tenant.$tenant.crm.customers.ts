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
} from '@/db/schema'
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm'
import { auth } from '@/lib/auth'

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
            const entry = dealsByTenantOrg.get(d.tenantOrganizationId)!
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
            const activities = activitiesByTenantOrg.get(activity.tenantOrganizationId)!
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
    },
  },
})

