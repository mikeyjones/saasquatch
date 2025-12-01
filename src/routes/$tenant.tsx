import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/$tenant')({
  beforeLoad: async ({ params }) => {
    // Dynamically import db only on server side
    if (typeof window === 'undefined') {
      const { db } = await import('@/db')
      const { organization } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      
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

      return {
        tenant: {
          id: org[0].id,
          name: org[0].name,
          slug: org[0].slug,
          logo: org[0].logo,
        },
      }
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
