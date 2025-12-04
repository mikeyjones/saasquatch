import { useParams, useRouteContext } from '@tanstack/react-router'

export interface Tenant {
  id: string
  name: string
  slug: string
  logo: string | null
}

/**
 * Hook to get the current tenant slug from route params.
 * Use this in components that need the tenant identifier for navigation or display.
 */
export function useTenantSlug(): string {
  const params = useParams({ strict: false })
  return (params as { tenant?: string }).tenant ?? ''
}

/**
 * Hook to get the full tenant object from route context.
 * The tenant object is loaded and validated in the /$tenant route beforeLoad.
 */
export function useTenant(): Tenant | null {
  try {
    const context = useRouteContext({ from: '/$tenant' })
    return (context as { tenant?: Tenant }).tenant ?? null
  } catch {
    return null
  }
}

/**
 * Build a tenant-scoped path.
 * Example: buildTenantPath('acme', '/app/support') => '/acme/app/support'
 */
export function buildTenantPath(tenant: string, path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `/${tenant}${cleanPath}`
}




