import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import { tenantUser, tenantOrganization, organization } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/tenant/$tenant/members/$memberId')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/members/:memberId
       * Fetch a single member with full details including organization info
       */
      GET: async ({ request, params }) => {
        try {
          // Get session from Better Auth
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

          // Fetch member with organization details
          const member = await db
            .select({
              id: tenantUser.id,
              name: tenantUser.name,
              email: tenantUser.email,
              phone: tenantUser.phone,
              avatarUrl: tenantUser.avatarUrl,
              title: tenantUser.title,
              role: tenantUser.role,
              isOwner: tenantUser.isOwner,
              status: tenantUser.status,
              lastActivityAt: tenantUser.lastActivityAt,
              notes: tenantUser.notes,
              createdAt: tenantUser.createdAt,
              updatedAt: tenantUser.updatedAt,
              // Organization info
              organizationId: tenantOrganization.id,
              organizationName: tenantOrganization.name,
              organizationSlug: tenantOrganization.slug,
              organizationLogo: tenantOrganization.logo,
              organizationIndustry: tenantOrganization.industry,
              organizationWebsite: tenantOrganization.website,
              organizationSubscriptionStatus: tenantOrganization.subscriptionStatus,
              organizationSubscriptionPlan: tenantOrganization.subscriptionPlan,
            })
            .from(tenantUser)
            .innerJoin(
              tenantOrganization,
              eq(tenantUser.tenantOrganizationId, tenantOrganization.id)
            )
            .where(
              and(
                eq(tenantUser.id, params.memberId),
                eq(tenantOrganization.organizationId, orgId)
              )
            )
            .limit(1)

          if (member.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Member not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const m = member[0]

          return new Response(
            JSON.stringify({
              member: {
                id: m.id,
                name: m.name,
                email: m.email,
                phone: m.phone,
                avatarUrl: m.avatarUrl,
                title: m.title,
                role: m.role,
                isOwner: m.isOwner,
                status: m.status,
                lastActivityAt: m.lastActivityAt?.toISOString() || null,
                notes: m.notes,
                createdAt: m.createdAt.toISOString(),
                updatedAt: m.updatedAt.toISOString(),
              },
              organization: {
                id: m.organizationId,
                name: m.organizationName,
                slug: m.organizationSlug,
                logo: m.organizationLogo,
                industry: m.organizationIndustry,
                website: m.organizationWebsite,
                subscriptionStatus: m.organizationSubscriptionStatus,
                subscriptionPlan: m.organizationSubscriptionPlan,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error fetching member:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * PUT /api/tenant/:tenant/members/:memberId
       * Update member details
       */
      PUT: async ({ request, params }) => {
        try {
          // Get session from Better Auth
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

          // Verify member exists and belongs to this organization
          const existingMember = await db
            .select({ id: tenantUser.id })
            .from(tenantUser)
            .innerJoin(
              tenantOrganization,
              eq(tenantUser.tenantOrganizationId, tenantOrganization.id)
            )
            .where(
              and(
                eq(tenantUser.id, params.memberId),
                eq(tenantOrganization.organizationId, orgId)
              )
            )
            .limit(1)

          if (existingMember.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Member not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Parse request body
          const body = await request.json()
          const {
            name,
            email,
            phone,
            title,
            role,
            status,
            notes,
          } = body as {
            name?: string
            email?: string
            phone?: string
            title?: string
            role?: string
            status?: string
            notes?: string
          }

          // Build update object with only provided fields
          const updateData: {
            name?: string
            email?: string
            phone?: string | null
            title?: string | null
            role?: string
            status?: string
            notes?: string | null
            updatedAt: Date
          } = {
            updatedAt: new Date(),
          }

          if (name !== undefined && typeof name === 'string' && name.trim().length > 0) {
            updateData.name = name.trim()
          }

          if (email !== undefined && typeof email === 'string' && email.trim().length > 0) {
            updateData.email = email.trim().toLowerCase()
          }

          if (phone !== undefined) {
            updateData.phone = phone && phone.trim().length > 0 ? phone.trim() : null
          }

          if (title !== undefined) {
            updateData.title = title && title.trim().length > 0 ? title.trim() : null
          }

          if (role !== undefined && ['owner', 'admin', 'user', 'viewer'].includes(role)) {
            updateData.role = role
          }

          if (status !== undefined && ['active', 'suspended', 'invited'].includes(status)) {
            updateData.status = status
          }

          if (notes !== undefined) {
            updateData.notes = notes && notes.trim().length > 0 ? notes.trim() : null
          }

          // Update member
          await db
            .update(tenantUser)
            .set(updateData)
            .where(eq(tenantUser.id, params.memberId))

          // Fetch updated member
          const updatedMember = await db
            .select({
              id: tenantUser.id,
              name: tenantUser.name,
              email: tenantUser.email,
              phone: tenantUser.phone,
              avatarUrl: tenantUser.avatarUrl,
              title: tenantUser.title,
              role: tenantUser.role,
              isOwner: tenantUser.isOwner,
              status: tenantUser.status,
              lastActivityAt: tenantUser.lastActivityAt,
              notes: tenantUser.notes,
              createdAt: tenantUser.createdAt,
              updatedAt: tenantUser.updatedAt,
            })
            .from(tenantUser)
            .where(eq(tenantUser.id, params.memberId))
            .limit(1)

          const m = updatedMember[0]

          return new Response(
            JSON.stringify({
              success: true,
              member: {
                id: m.id,
                name: m.name,
                email: m.email,
                phone: m.phone,
                avatarUrl: m.avatarUrl,
                title: m.title,
                role: m.role,
                isOwner: m.isOwner,
                status: m.status,
                lastActivityAt: m.lastActivityAt?.toISOString() || null,
                notes: m.notes,
                createdAt: m.createdAt.toISOString(),
                updatedAt: m.updatedAt.toISOString(),
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error updating member:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
