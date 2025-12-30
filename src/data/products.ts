/**
 * Product Catalog Data Layer
 *
 * Functions for fetching and mutating product plans from the API.
 * These functions are used by the UI components to interact with the database.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Bolt-On represents an add-on available for a product plan
 */
export interface BoltOn {
  id: string
  productAddOnId: string
  name: string
  description?: string | null
  pricingModel: 'flat' | 'seat' | 'usage'
  billingType: 'billed_with_main' | 'consumable'
  displayOrder: number
  // Pricing info (optional, may be included from productAddOnPricing)
  basePrice?: {
    amount: number
    currency: string
    interval?: string | null
  }
}

/**
 * Input for adding/updating bolt-ons on a plan
 */
export interface BoltOnInput {
  productAddOnId: string
  billingType: 'billed_with_main' | 'consumable'
  displayOrder?: number
}

/**
 * Available add-on from the organization (for selection in UI)
 */
export interface AvailableAddOn {
  id: string
  name: string
  description?: string | null
  pricingModel: 'flat' | 'seat' | 'usage'
  status: 'active' | 'draft' | 'archived'
  basePrice?: {
    amount: number
    currency: string
    interval?: string | null
  }
}

export interface ProductTier {
  id: string
  name: string
  description: string
  status?: 'active' | 'draft' | 'archived'
  pricingModel?: 'flat' | 'seat' | 'usage' | 'hybrid'
  productId?: string | null // Reference to parent product (productFamilyId in DB)
  basePrice: {
    amount: number
    currency: string
    interval: 'monthly' | 'yearly'
    perSeatAmount?: number
  }
  regionalPricing: Array<{
    region: string
    currency: string
    amount: number
  }>
  features: string[]
  boltOns?: BoltOn[]
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
  productId?: string // Reference to parent product (productFamilyId in DB)
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
  boltOns?: BoltOnInput[]
}

export interface UpdatePlanInput extends Partial<CreatePlanInput> {
  id: string
}

// ============================================================================
// Product Types (Product groups multiple Plans)
// ============================================================================

/**
 * Product represents a top-level product entity that contains multiple pricing plans
 */
export interface Product {
  id: string
  name: string
  description: string
  status: 'active' | 'draft' | 'archived'
  plans: ProductTier[]
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Input for creating a new product
 */
export interface CreateProductInput {
  name: string
  description?: string
  status?: 'active' | 'draft' | 'archived'
}

/**
 * Input for updating an existing product
 */
export interface UpdateProductInput extends Partial<CreateProductInput> {
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

/**
 * Fetch all available add-ons for the organization
 * Used when configuring bolt-ons for a plan
 */
export async function fetchAddOns(
  tenantSlug: string,
  filters?: { status?: string }
): Promise<AvailableAddOn[]> {
  try {
    const url = new URL(
      `/api/tenant/${tenantSlug}/product-catalog/add-ons`,
      window.location.origin
    )

    if (filters?.status) url.searchParams.set('status', filters.status)

    const response = await fetch(url.toString(), {
      credentials: 'include',
    })

    if (!response.ok) {
      console.error('Failed to fetch add-ons:', response.statusText)
      return []
    }

    const data = await response.json()
    return data.addOns || []
  } catch (error) {
    console.error('Error fetching add-ons:', error)
    return []
  }
}

// ============================================================================
// Product API Functions
// ============================================================================

/**
 * Fetch all products for a tenant organization with their plans
 */
export async function fetchProducts(
  tenantSlug: string,
  filters?: { status?: string }
): Promise<Product[]> {
  try {
    const url = new URL(
      `/api/tenant/${tenantSlug}/product-catalog/products`,
      window.location.origin
    )

    if (filters?.status) url.searchParams.set('status', filters.status)

    const response = await fetch(url.toString(), {
      credentials: 'include',
    })

    if (!response.ok) {
      console.error('Failed to fetch products:', response.statusText)
      return []
    }

    const data = await response.json()
    return data.products || []
  } catch (error) {
    console.error('Error fetching products:', error)
    return []
  }
}

/**
 * Create a new product
 */
export async function createProduct(
  tenantSlug: string,
  productData: CreateProductInput
): Promise<{ success: boolean; product?: Product; error?: string }> {
  try {
    const response = await fetch(
      `/api/tenant/${tenantSlug}/product-catalog/products`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create product' }
    }

    return { success: true, product: data.product }
  } catch (error) {
    console.error('Error creating product:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(
  tenantSlug: string,
  productData: UpdateProductInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `/api/tenant/${tenantSlug}/product-catalog/products`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to update product' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating product:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(
  tenantSlug: string,
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `/api/tenant/${tenantSlug}/product-catalog/products?id=${productId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete product' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting product:', error)
    return { success: false, error: 'Network error' }
  }
}




