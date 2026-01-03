import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  deal,
  dealActivity,
  dealContact,
  pipeline,
  pipelineStage,
  tenantOrganization,
  tenantUser,
  organization,
  user,
} from '@/db/schema'
import { eq, and, desc, or } from 'drizzle-orm'
import { auth } from '@/lib/auth'

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 24)
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString()
}

export const Route = createFileRoute('/api/tenant/$tenant/deals')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/deals
       * Fetch all deals for the tenant organization
       * Query params:
       * - pipelineId: Filter by pipeline
       * - assignedToUserId: Filter by assigned user
       * - tenantOrgSlug: Filter by tenant organization
       */
      GET: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized', deals: [] }),
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
              JSON.stringify({ error: 'Organization not found', deals: [] }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Parse query params
          const url = new URL(request.url)
          const pipelineId = url.searchParams.get('pipelineId')
          const assignedToUserId = url.searchParams.get('assignedToUserId')
          const tenantOrgSlug = url.searchParams.get('tenantOrgSlug')

          // Build conditions
          const conditions = [eq(deal.organizationId, orgId)]

          if (pipelineId) {
            conditions.push(eq(deal.pipelineId, pipelineId))
          }

          if (assignedToUserId) {
            conditions.push(eq(deal.assignedToUserId, assignedToUserId))
          }

          // If filtering by tenant org slug, get the tenant org first
          if (tenantOrgSlug) {
            const tenantOrg = await db
              .select({ id: tenantOrganization.id })
              .from(tenantOrganization)
              .where(
                and(
                  eq(tenantOrganization.organizationId, orgId),
                  eq(tenantOrganization.slug, tenantOrgSlug)
                )
              )
              .limit(1)

            if (tenantOrg.length > 0) {
              conditions.push(eq(deal.tenantOrganizationId, tenantOrg[0].id))
            }
          }

          // Fetch deals with related data
          const deals = await db
            .select({
              id: deal.id,
              name: deal.name,
              value: deal.value,
              pipelineId: deal.pipelineId,
              stageId: deal.stageId,
              assignedToUserId: deal.assignedToUserId,
              assignedToAI: deal.assignedToAI,
              badges: deal.badges,
              customFields: deal.customFields,
              nextTask: deal.nextTask,
              notes: deal.notes,
              manualScore: deal.manualScore,
              aiScore: deal.aiScore,
              createdAt: deal.createdAt,
              updatedAt: deal.updatedAt,
              tenantOrgId: tenantOrganization.id,
              tenantOrgName: tenantOrganization.name,
              tenantOrgSlug: tenantOrganization.slug,
              stageName: pipelineStage.name,
              stageOrder: pipelineStage.order,
              stageColor: pipelineStage.color,
              pipelineName: pipeline.name,
              assignedUserName: user.name,
            })
            .from(deal)
            .innerJoin(
              tenantOrganization,
              eq(deal.tenantOrganizationId, tenantOrganization.id)
            )
            .innerJoin(pipelineStage, eq(deal.stageId, pipelineStage.id))
            .innerJoin(pipeline, eq(deal.pipelineId, pipeline.id))
            .leftJoin(user, eq(deal.assignedToUserId, user.id))
            .where(and(...conditions))
            .orderBy(desc(deal.updatedAt))

          // Get contacts for each deal
          const dealIds = deals.map((d) => d.id)
          const contacts =
            dealIds.length > 0
              ? await db
                  .select({
                    dealId: dealContact.dealId,
                    tenantUserId: dealContact.tenantUserId,
                    role: dealContact.role,
                    userName: tenantUser.name,
                    userEmail: tenantUser.email,
                  })
                  .from(dealContact)
                  .innerJoin(tenantUser, eq(dealContact.tenantUserId, tenantUser.id))
                  .where(or(...dealIds.map((id) => eq(dealContact.dealId, id))))
              : []

          // Build response
          const response = deals.map((d) => {
            const dealContacts = contacts.filter((c) => c.dealId === d.id)

            return {
              id: d.id,
              name: d.name,
              value: d.value,
              company: d.tenantOrgName,
              tenantOrganization: {
                id: d.tenantOrgId,
                name: d.tenantOrgName,
                slug: d.tenantOrgSlug,
              },
              pipeline: {
                id: d.pipelineId,
                name: d.pipelineName,
              },
              // Include stageId at top level for frontend compatibility
              stageId: d.stageId,
              stage: {
                id: d.stageId,
                name: d.stageName,
                order: d.stageOrder,
                color: d.stageColor,
              },
              assignedTo: d.assignedToUserId
                ? {
                    id: d.assignedToUserId,
                    name: d.assignedUserName || 'Unknown',
                  }
                : null,
              assignedToAI: d.assignedToAI,
              contacts: dealContacts.map((c) => ({
                id: c.tenantUserId,
                name: c.userName,
                email: c.userEmail,
                role: c.role,
              })),
              badges: d.badges ? JSON.parse(d.badges) : [],
              customFields: d.customFields ? JSON.parse(d.customFields) : {},
              nextTask: d.nextTask,
              notes: d.notes,
              manualScore: d.manualScore,
              aiScore: d.aiScore,
              lastUpdated: formatTimeAgo(d.updatedAt),
              createdAt: d.createdAt,
              updatedAt: d.updatedAt,
            }
          })

          return new Response(JSON.stringify({ deals: response }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching deals:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error', deals: [] }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * POST /api/tenant/:tenant/deals
       * Create a new deal
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
            value,
            tenantOrganizationId,
            pipelineId,
            stageId,
            assignedToUserId,
            contacts: contactIds,
            notes,
            badges,
          } = body

          // Validate required fields
          if (!name || !tenantOrganizationId || !pipelineId || !stageId) {
            return new Response(
              JSON.stringify({
                error: 'Missing required fields: name, tenantOrganizationId, pipelineId, stageId',
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Verify tenant org belongs to this org
          const tenantOrg = await db
            .select({ id: tenantOrganization.id, name: tenantOrganization.name })
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

          // Verify pipeline and stage exist
          const pipelineRecord = await db
            .select({ id: pipeline.id })
            .from(pipeline)
            .where(eq(pipeline.id, pipelineId))
            .limit(1)

          if (pipelineRecord.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Pipeline not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const stageRecord = await db
            .select({ id: pipelineStage.id, name: pipelineStage.name })
            .from(pipelineStage)
            .where(
              and(
                eq(pipelineStage.id, stageId),
                eq(pipelineStage.pipelineId, pipelineId)
              )
            )
            .limit(1)

          if (stageRecord.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Stage not found in this pipeline' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const dealId = generateId()
          const now = new Date()

          // Create the deal
          await db.insert(deal).values({
            id: dealId,
            organizationId: orgId,
            tenantOrganizationId,
            pipelineId,
            stageId,
            name,
            value: value || 0,
            assignedToUserId: assignedToUserId || null,
            assignedToAI: false,
            badges: badges ? JSON.stringify(badges) : null,
            notes: notes || null,
            createdAt: now,
            updatedAt: now,
          })

          // Add contacts if provided
          if (contactIds && Array.isArray(contactIds)) {
            for (const contactId of contactIds) {
              await db.insert(dealContact).values({
                dealId,
                tenantUserId: contactId,
                role: 'contact',
                createdAt: now,
              })
            }
          }

          // Create activity entry
          await db.insert(dealActivity).values({
            id: generateId(),
            dealId,
            activityType: 'deal_created',
            description: `Deal "${name}" created for ${tenantOrg[0].name}`,
            userId: session.user.id,
            metadata: JSON.stringify({
              value,
              stage: stageRecord[0].name,
            }),
            createdAt: now,
          })

          return new Response(
            JSON.stringify({
              success: true,
              deal: { id: dealId, name, value },
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error creating deal:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})





