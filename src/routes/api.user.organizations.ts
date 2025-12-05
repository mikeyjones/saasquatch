import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import { member, organization } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/user/organizations')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // Get session from Better Auth
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(
              JSON.stringify({ organizations: [] }),
              {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          // Get user's organizations
          const memberships = await db
            .select({
              organizationId: member.organizationId,
              slug: organization.slug,
              name: organization.name,
            })
            .from(member)
            .innerJoin(organization, eq(member.organizationId, organization.id))
            .where(eq(member.userId, session.user.id))

          const organizations = memberships.map((m) => ({
            id: m.organizationId,
            slug: m.slug,
            name: m.name,
          }))

          return new Response(
            JSON.stringify({ organizations }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        } catch (error) {
          console.error('Error getting organizations:', error)
          return new Response(
            JSON.stringify({ organizations: [] }),
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






