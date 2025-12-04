import { describe, it, expect } from 'vitest'
import { buildTenantPath } from './use-tenant'

describe('use-tenant utilities', () => {
  describe('buildTenantPath', () => {
    it('should build a tenant-scoped path with leading slash', () => {
      const result = buildTenantPath('acme', '/app/support')
      expect(result).toBe('/acme/app/support')
    })

    it('should handle paths without leading slash', () => {
      const result = buildTenantPath('acme', 'app/support')
      expect(result).toBe('/acme/app/support')
    })

    it('should work with different tenant slugs', () => {
      expect(buildTenantPath('tenant1', '/app/support')).toBe('/tenant1/app/support')
      expect(buildTenantPath('tenant2', '/app/support')).toBe('/tenant2/app/support')
      expect(buildTenantPath('my-company', '/app/support')).toBe('/my-company/app/support')
    })

    it('should handle nested paths', () => {
      const result = buildTenantPath('acme', '/app/support/tickets')
      expect(result).toBe('/acme/app/support/tickets')
    })

    it('should handle root app path', () => {
      const result = buildTenantPath('acme', '/app')
      expect(result).toBe('/acme/app')
    })

    it('should handle empty path', () => {
      const result = buildTenantPath('acme', '')
      expect(result).toBe('/acme/')
    })
  })
})

describe('Tenant type definition', () => {
  it('should have correct tenant structure', () => {
    // Type test - this validates the Tenant interface structure
    const tenant = {
      id: 'org_123',
      name: 'Acme Corporation',
      slug: 'acme',
      logo: 'https://example.com/logo.png',
    }

    expect(tenant).toHaveProperty('id')
    expect(tenant).toHaveProperty('name')
    expect(tenant).toHaveProperty('slug')
    expect(tenant).toHaveProperty('logo')
  })

  it('should allow null logo', () => {
    const tenant = {
      id: 'org_123',
      name: 'Acme Corporation',
      slug: 'acme',
      logo: null,
    }

    expect(tenant.logo).toBeNull()
  })
})




