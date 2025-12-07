import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import { member, organization } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/tenant/$tenant/membership')({
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
              JSON.stringify({ isMember: false, error: 'Not authenticated' }),
              {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          const tenantSlug = params.tenant

          // Get the organization by slug
          const org = await db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.slug, tenantSlug))
            .limit(1)

          if (org.length === 0) {
            return new Response(
              JSON.stringify({ isMember: false, error: 'Organization not found' }),
              {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          // Check if user is a member of this organization
          const membership = await db
            .select({ role: member.role })
            .from(member)
            .where(
              and(
                eq(member.organizationId, org[0].id),
                eq(member.userId, session.user.id)
              )
            )
            .limit(1)

          if (membership.length === 0) {
            return new Response(
              JSON.stringify({ isMember: false, error: 'Not a member of this organization' }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          return new Response(
            JSON.stringify({ isMember: true, role: membership[0].role }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        } catch (error) {
          console.error('Error checking membership:', error)
          return new Response(
            JSON.stringify({ isMember: false, error: 'Internal server error' }),
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







