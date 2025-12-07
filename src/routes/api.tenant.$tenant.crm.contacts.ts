import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  tenantOrganization,
  organization,
  tenantUser,
} from '@/db/schema'
import { eq, and, or, ilike, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/tenant/$tenant/crm/contacts')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/crm/contacts
       * Fetch all contacts across all customers
       * Query params:
       * - search: Search in name, email, title
       * - customerId: Filter by customer ID
       * - role: Filter by role
       * - status: Filter by status
       */
      GET: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized', contacts: [] }),
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
              JSON.stringify({ error: 'Organization not found', contacts: [] }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Parse query params
          const url = new URL(request.url)
          const search = url.searchParams.get('search')?.toLowerCase() || ''
          const customerId = url.searchParams.get('customerId') || ''
          const role = url.searchParams.get('role') || ''
          const status = url.searchParams.get('status') || ''

          // Build where conditions
          const conditions = [eq(tenantOrganization.organizationId, orgId)]

          if (customerId) {
            conditions.push(eq(tenantUser.tenantOrganizationId, customerId))
          }

          if (search) {
            const searchCondition = or(
              ilike(tenantUser.name, `%${search}%`),
              ilike(tenantUser.email, `%${search}%`),
              ilike(tenantUser.title, `%${search}%`)
            )
            if (searchCondition) {
              conditions.push(searchCondition)
            }
          }

          if (role) {
            conditions.push(eq(tenantUser.role, role))
          }

          if (status) {
            conditions.push(eq(tenantUser.status, status))
          }

          // Fetch contacts with customer info
          const contacts = await db
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
              notes: tenantUser.notes,
              lastActivityAt: tenantUser.lastActivityAt,
              createdAt: tenantUser.createdAt,
              updatedAt: tenantUser.updatedAt,
              customerId: tenantOrganization.id,
              customerName: tenantOrganization.name,
              customerSlug: tenantOrganization.slug,
              customerIndustry: tenantOrganization.industry,
            })
            .from(tenantUser)
            .innerJoin(
              tenantOrganization,
              eq(tenantUser.tenantOrganizationId, tenantOrganization.id)
            )
            .where(and(...conditions))
            .orderBy(tenantUser.name)

          const formattedContacts = contacts.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            avatarUrl: c.avatarUrl,
            title: c.title,
            role: c.role,
            isOwner: c.isOwner,
            status: c.status,
            notes: c.notes,
            lastActivityAt: c.lastActivityAt?.toISOString() || null,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
            customer: {
              id: c.customerId,
              name: c.customerName,
              slug: c.customerSlug,
              industry: c.customerIndustry,
            },
          }))

          // Get unique roles and counts
          const roleCounts = await db
            .select({
              role: tenantUser.role,
              count: sql<number>`count(*)::int`,
            })
            .from(tenantUser)
            .innerJoin(
              tenantOrganization,
              eq(tenantUser.tenantOrganizationId, tenantOrganization.id)
            )
            .where(eq(tenantOrganization.organizationId, orgId))
            .groupBy(tenantUser.role)

          const roles = roleCounts.map((r) => ({
            role: r.role,
            count: r.count,
          }))

          return new Response(
            JSON.stringify({
              contacts: formattedContacts,
              total: formattedContacts.length,
              roles,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error fetching contacts:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error', contacts: [] }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})


