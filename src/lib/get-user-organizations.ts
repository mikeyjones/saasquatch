/**
 * Server function to get user's organizations
 * This runs only on the server
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { member, organization } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const getUserOrganizations = createServerFn({
  method: 'GET',
}).handler(async ({ request }) => {
  if (!request) {
    return { organizations: [] }
  }

  try {
    // Get session from Better Auth
    const { auth } = await import('./auth')
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return { organizations: [] }
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

    return {
      organizations: memberships.map((m) => ({
        id: m.organizationId,
        slug: m.slug,
        name: m.name,
      })),
    }
  } catch {
    return { organizations: [] }
  }
})








