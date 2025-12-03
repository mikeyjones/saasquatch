/**
 * Product Catalog Data Layer
 *
 * Functions for fetching and mutating product plans from the API.
 * These functions are used by the UI components to interact with the database.
 */

// ============================================================================
// Types
// ============================================================================

export interface ProductTier {
  id: string
  name: string
  description: string
  status?: 'active' | 'draft' | 'archived'
  pricingModel?: 'flat' | 'seat' | 'usage' | 'hybrid'
  basePrice: {
    amount: number
    currency: string
    interval: 'monthly' | 'yearly'
  }
  regionalPricing: Array<{
    region: string
    currency: string
    amount: number
  }>
  features: string[]
  createdAt?: Date
  updatedAt?: Date
}

export interface ProductPlanDetail extends ProductTier {
  productFamilyId?: string | null
  yearlyPrice?: {
    id: string
    amount: number
    currency: string
  } | null
  seatPricing?: {
    id: string
    perSeatAmount: number
    currency: string
    interval: string | null
  } | null
  usagePricing?: Array<{
    id: string
    usageMeterId: string | null
    usageTiers: unknown
    currency: string
  }>
  featureFlags?: Array<{
    id: string
    flagKey: string
    flagValue: unknown
  }>
}

export interface CreatePlanInput {
  name: string
  description?: string
  status?: 'active' | 'draft' | 'archived'
  pricingModel?: 'flat' | 'seat' | 'usage' | 'hybrid'
  basePrice?: {
    amount: number
    currency: string
    interval: 'monthly' | 'yearly'
  }
  regionalPricing?: Array<{
    region: string
    currency: string
    amount: number
  }>
  features?: string[]
}

export interface UpdatePlanInput extends Partial<CreatePlanInput> {
  id: string
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch all product plans for a tenant organization
 */
export async function fetchPlans(
  tenantSlug: string,
  filters?: { status?: string }
): Promise<ProductTier[]> {
  try {
    const url = new URL(
      `/api/tenant/${tenantSlug}/product-catalog/plans`,
      window.location.origin
    )

    if (filters?.status) url.searchParams.set('status', filters.status)

    const response = await fetch(url.toString(), {
      credentials: 'include',
    })

    if (!response.ok) {
      console.error('Failed to fetch plans:', response.statusText)
      return []
    }

    const data = await response.json()
    return data.plans || []
  } catch (error) {
    console.error('Error fetching plans:', error)
    return []
  }
}

/**
 * Fetch a single product plan with full details
 */
export async function fetchPlan(
  tenantSlug: string,
  planId: string
): Promise<ProductPlanDetail | null> {
  try {
    const response = await fetch(
      `/api/tenant/${tenantSlug}/product-catalog/plans/${planId}`,
      {
        credentials: 'include',
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch plan:', response.statusText)
      return null
    }

    const data = await response.json()
    return data.plan || null
  } catch (error) {
    console.error('Error fetching plan:', error)
    return null
  }
}

/**
 * Create a new product plan
 */
export async function createPlan(
  tenantSlug: string,
  planData: CreatePlanInput
): Promise<{ success: boolean; plan?: ProductTier; error?: string }> {
  try {
    const response = await fetch(
      `/api/tenant/${tenantSlug}/product-catalog/plans`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create plan' }
    }

    return { success: true, plan: data.plan }
  } catch (error) {
    console.error('Error creating plan:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Update an existing product plan
 */
export async function updatePlan(
  tenantSlug: string,
  planData: UpdatePlanInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `/api/tenant/${tenantSlug}/product-catalog/plans`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to update plan' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating plan:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Delete a product plan
 */
export async function deletePlan(
  tenantSlug: string,
  planId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `/api/tenant/${tenantSlug}/product-catalog/plans?id=${planId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete plan' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting plan:', error)
    return { success: false, error: 'Network error' }
  }
}

