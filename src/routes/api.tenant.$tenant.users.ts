import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import { tenantUser, tenantOrganization, organization } from '@/db/schema'
import { eq, and, or, ilike, isNotNull, ne } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/tenant/$tenant/users')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          // Get session from Better Auth
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized', users: [] }),
              {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              }
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
              JSON.stringify({ error: 'Organization not found', users: [] }),
              {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          const orgId = org[0].id

          // Get search query from URL
          const url = new URL(request.url)
          const search = url.searchParams.get('search')?.toLowerCase() || ''

          // Get includeProspects filter from URL (default: false - exclude prospects)
          const includeProspects = url.searchParams.get('includeProspects') === 'true'

          // Fetch tenant users from non-prospect organizations only (from Sales CRM)
          // Prospects are: null subscriptionStatus or 'trialing'
          // Customers are: 'active' or 'past_due'  
          // Inactive are: 'canceled' or 'inactive'
          // Customer Support sees customers + inactive (anyone who was ever a customer)
          
          // Build where conditions - always include org filter
          const conditions = [eq(tenantOrganization.organizationId, orgId)]
          
          // Exclude prospects unless explicitly requested
          // Prospects have null or 'trialing' subscriptionStatus
          if (!includeProspects) {
            conditions.push(
              and(
                // Must have a subscription status (not null)
                isNotNull(tenantOrganization.subscriptionStatus),
                // And not be trialing (trialing = prospect)
                ne(tenantOrganization.subscriptionStatus, 'trialing')
              )!
            )
          }

          // Apply search filter if provided
          if (search) {
            conditions.push(
              or(
                ilike(tenantUser.name, `%${search}%`),
                ilike(tenantUser.email, `%${search}%`),
                ilike(tenantOrganization.name, `%${search}%`)
              )!
            )
          }

          const users = await db
            .select({
              id: tenantUser.id,
              name: tenantUser.name,
              email: tenantUser.email,
              phone: tenantUser.phone,
              role: tenantUser.role,
              isOwner: tenantUser.isOwner,
              status: tenantUser.status,
              lastActivityAt: tenantUser.lastActivityAt,
              organizationName: tenantOrganization.name,
              organizationSlug: tenantOrganization.slug,
              organizationStatus: tenantOrganization.subscriptionStatus,
            })
            .from(tenantUser)
            .innerJoin(
              tenantOrganization,
              eq(tenantUser.tenantOrganizationId, tenantOrganization.id)
            )
            .where(and(...conditions))

          // Transform to Member format expected by frontend
          const members = users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            initials: user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .substring(0, 2),
            organization: user.organizationName,
            organizationSlug: user.organizationSlug,
            organizationStatus: user.organizationStatus,
            role: user.role === 'owner' || user.role === 'admin' ? 'Admin' : user.role === 'viewer' ? 'Viewer' : 'User',
            isOwner: user.isOwner,
            status: user.status === 'active' ? 'Active' : 'Suspended',
            lastLogin: user.lastActivityAt
              ? formatTimeAgo(user.lastActivityAt)
              : 'Never',
          }))

          return new Response(JSON.stringify({ users: members }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching tenant users:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error', users: [] }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
      },
    },
  },
})

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
  return date.toLocaleDateString()
}




