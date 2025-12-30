import { useParams, useRouteContext } from '@tanstack/react-router'

/**
 * Tenant organization data.
 */
export interface Tenant {
  id: string
  name: string
  slug: string
  logo: string | null
}

/**
 * Type for the /$tenant route context.
 */
interface TenantRouteContext {
  tenant?: Tenant
}

/**
 * Hook to get the current tenant slug from route params.
 * Use this in components that need the tenant identifier for navigation or display.
 */
export function useTenantSlug(): string {
  const params = useParams({ strict: false }) as { tenant?: string }
  return params.tenant ?? ''
}

/**
 * Hook to get the full tenant object from route context.
 * The tenant object is loaded and validated in the /$tenant route beforeLoad.
 */
export function useTenant(): Tenant | null {
  // Use strict: false to allow calling from any route
  const context = useRouteContext({ strict: false }) as TenantRouteContext | undefined
  return context?.tenant ?? null
}

/**
 * Build a tenant-scoped path.
 * 
 * Prepends the tenant slug to a path for tenant-scoped navigation.
 * 
 * @param tenant - Tenant slug
 * @param path - Path to scope (will be prefixed with / if not already)
 * @returns Tenant-scoped path
 * 
 * @example
 * ```ts
 * buildTenantPath('acme', '/app/support') // => '/acme/app/support'
 * buildTenantPath('acme', 'app/support')  // => '/acme/app/support'
 * ```
 */
export function buildTenantPath(tenant: string, path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `/${tenant}${cleanPath}`
}







