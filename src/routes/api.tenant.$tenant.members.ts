import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import { member, organization, user } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/tenant/$tenant/members')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/members
       * Fetch all organization members (support staff users) for assignment dropdowns
       */
      GET: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized', members: [] }),
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
              JSON.stringify({ error: 'Organization not found', members: [] }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Fetch organization members with user info
          const members = await db
            .select({
              userId: member.userId,
              role: member.role,
              name: user.name,
              email: user.email,
              image: user.image,
            })
            .from(member)
            .innerJoin(user, eq(member.userId, user.id))
            .where(eq(member.organizationId, orgId))

          // Transform to response format
          const response = members.map((m) => ({
            id: m.userId,
            name: m.name,
            email: m.email,
            image: m.image,
            role: m.role,
          }))

          return new Response(
            JSON.stringify({ members: response }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error fetching members:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error', members: [] }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})





