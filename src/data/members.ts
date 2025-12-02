/**
 * Member data types and utilities for tenant users
 * 
 * Members are tenant users (customers) - they do NOT have login accounts.
 * They are fetched from the tenant_user table in the database.
 */

export interface Member {
  id: string
  name: string
  email: string
  initials: string
  organization: string
  organizationSlug?: string
  role: 'Admin' | 'User' | 'Viewer'
  isOwner?: boolean
  status: 'Active' | 'Suspended'
  lastLogin: string
}

/**
 * Fetch members (tenant users) from the API
 * Scoped to the current tenant organization
 */
export async function fetchMembers(tenantSlug: string, search?: string): Promise<Member[]> {
  try {
    const url = new URL(`/api/tenant/${tenantSlug}/users`, window.location.origin)
    if (search) {
      url.searchParams.set('search', search)
    }

    const response = await fetch(url.toString(), {
      credentials: 'include',
    })

    if (!response.ok) {
      console.error('Failed to fetch members:', response.statusText)
      return []
    }

    const data = await response.json()
    return data.users || []
  } catch (error) {
    console.error('Error fetching members:', error)
    return []
  }
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

/**
 * Static members data (fallback/demo data)
 * Used when database is not available or for testing
 */
export const members: Member[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@acme.com',
    initials: 'JD',
    organization: 'Acme Corp',
    role: 'Admin',
    isOwner: true,
    status: 'Active',
    lastLogin: '2h ago',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@acme.com',
    initials: 'JS',
    organization: 'Acme Corp',
    role: 'User',
    status: 'Active',
    lastLogin: '1d ago',
  },
  {
    id: '3',
    name: 'Mike Ross',
    email: 'mike@techflow.io',
    initials: 'MR',
    organization: 'TechFlow',
    role: 'Admin',
    isOwner: true,
    status: 'Suspended',
    lastLogin: '5d ago',
  },
  {
    id: '4',
    name: 'Emily Blunt',
    email: 'emily@logistics.global',
    initials: 'EB',
    organization: 'Global Logistics',
    role: 'Viewer',
    status: 'Active',
    lastLogin: '30m ago',
  },
]
