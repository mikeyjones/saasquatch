import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/$tenant')({
  beforeLoad: async ({ params, location, context }) => {
    // Dynamically import db only on server side
    if (typeof window === 'undefined') {
      const { db } = await import('@/db')
      const { organization, member } = await import('@/db/schema')
      const { eq, and } = await import('drizzle-orm')
      
      // Validate the tenant slug exists
      const org = await db
        .select()
        .from(organization)
        .where(eq(organization.slug, params.tenant))
        .limit(1)

      if (org.length === 0) {
        throw redirect({
          to: '/',
          search: { error: 'invalid-tenant' },
        })
      }

      const tenant = {
        id: org[0].id,
        name: org[0].name,
        slug: org[0].slug,
        logo: org[0].logo,
      }

      // Check if this is a protected route (under /app but not /app/login)
      const isProtectedRoute = location.pathname.includes('/app/') && !location.pathname.includes('/app/login')
      
      // Get request from context if available (SSR context)
      const request = (context as { request?: Request })?.request
      
      if (isProtectedRoute && request) {
        try {
          const { auth } = await import('@/lib/auth')
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (session?.user) {
            // User is authenticated, check membership
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
              // User is not a member of this tenant
              throw redirect({
                to: '/$tenant/app/login',
                params: { tenant: params.tenant },
                search: { returnTo: location.pathname, error: 'not-member' },
              })
            }

            // User is authenticated and is a member
            return {
              tenant,
              user: session.user,
              membership: { role: membership[0].role },
            }
          }
        } catch (error) {
          // If it's a redirect, re-throw it
          if (error instanceof Response || (error as { redirect?: unknown })?.redirect) {
            throw error
          }
          // Auth check failed, let client-side handle it
          console.error('Server-side auth check failed:', error)
        }
      }

      return { tenant }
    }
    
    // Client-side: return minimal data (will be validated on server)
    return {
      tenant: {
        id: '',
        name: '',
        slug: params.tenant,
        logo: null,
      },
    }
  },
  component: TenantLayout,
})

function TenantLayout() {
  return <Outlet />
}
