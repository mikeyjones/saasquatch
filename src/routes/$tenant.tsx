import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { db } from '@/db'
import { organization } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const Route = createFileRoute('/$tenant')({
  beforeLoad: async ({ params }) => {
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
  },
  component: TenantLayout,
})

function TenantLayout() {
  return <Outlet />
}

