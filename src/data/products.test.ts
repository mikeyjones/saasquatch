import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	fetchPlans,
	fetchPlan,
	createPlan,
	updatePlan,
	deletePlan,
	fetchAddOns,
} from './products'
import { mockFetchSuccess, mockFetchError } from '@/test/setup'

// Helper to mock fetch
function mockFetch() {
	return global.fetch as ReturnType<typeof vi.fn>
}

describe('products data functions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		global.fetch = vi.fn()
		// Mock window.location.origin for URL construction (needed for all tests)
		Object.defineProperty(window, 'location', {
			value: { origin: 'http://localhost:3000' },
			writable: true,
			configurable: true,
		})
	})

	describe('fetchPlans', () => {
		it('should make GET request to correct endpoint', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))

			await fetchPlans('acme')

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/tenant/acme/product-catalog/plans'),
				expect.objectContaining({
					credentials: 'include',
				})
			)
		})

		it('should include status filter in query params', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))

			await fetchPlans('acme', { status: 'active' })

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('status=active'),
				expect.any(Object)
			)
		})

		it('should return plans array on success', async () => {
			const mockPlans = [
				{
					id: 'plan-1',
					name: 'Basic Plan',
					description: 'Basic description',
					status: 'active' as const,
					pricingModel: 'flat' as const,
					basePrice: {
						amount: 1000,
						currency: 'USD',
						interval: 'monthly' as const,
					},
					regionalPricing: [],
					features: ['feature1'],
				},
			]

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ plans: mockPlans }))

			const result = await fetchPlans('acme')

			expect(result).toEqual(mockPlans)
		})

		it('should return empty array on error', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchError('Not found', 404))

			const result = await fetchPlans('acme')

			expect(result).toEqual([])
		})
	})

	describe('fetchPlan', () => {
		it('should make GET request to plan detail endpoint', async () => {
			const mockPlan = {
				id: 'plan-1',
				name: 'Basic Plan',
				description: 'Description',
				status: 'active' as const,
				pricingModel: 'flat' as const,
				basePrice: {
					amount: 1000,
					currency: 'USD',
					interval: 'monthly' as const,
				},
				regionalPricing: [],
				features: [],
			}

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ plan: mockPlan }))

			const result = await fetchPlan('acme', 'plan-1')

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/tenant/acme/product-catalog/plans/plan-1'),
				expect.any(Object)
			)

			expect(result).toEqual(mockPlan)
		})

		it('should return null on error', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchError('Not found', 404))

			const result = await fetchPlan('acme', 'plan-1')

			expect(result).toBeNull()
		})
	})

	describe('createPlan', () => {
		it('should make POST request with plan data', async () => {
			const mockPlan = {
				id: 'plan-1',
				name: 'New Plan',
				description: 'Description',
				status: 'draft' as const,
				pricingModel: 'flat' as const,
				basePrice: {
					amount: 1000,
					currency: 'USD',
					interval: 'monthly' as const,
				},
				regionalPricing: [],
				features: [],
			}

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ plan: mockPlan }))

			const result = await createPlan('acme', {
				name: 'New Plan',
				basePrice: {
					amount: 1000,
					currency: 'USD',
					interval: 'monthly',
				},
			})

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/tenant/acme/product-catalog/plans'),
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				})
			)

			expect(result.success).toBe(true)
			expect(result.plan).toEqual(mockPlan)
		})

		it('should return error on API failure', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchError('Validation failed', 400))

			const result = await createPlan('acme', {
				name: 'Test Plan',
			})

			expect(result.success).toBe(false)
			expect(result.error).toBeDefined()
		})
	})

	describe('updatePlan', () => {
		it('should make PUT request with update data', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({}))

			const result = await updatePlan('acme', {
				id: 'plan-1',
				name: 'Updated Plan',
			})

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/tenant/acme/product-catalog/plans'),
				expect.objectContaining({
					method: 'PUT',
				})
			)

			expect(result.success).toBe(true)
		})
	})

	describe('deletePlan', () => {
		it('should make DELETE request with plan ID', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({}))

			const result = await deletePlan('acme', 'plan-1')

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/tenant/acme/product-catalog/plans?id=plan-1'),
				expect.objectContaining({
					method: 'DELETE',
				})
			)

			expect(result.success).toBe(true)
		})
	})

	describe('fetchAddOns', () => {
		it('should make GET request to add-ons endpoint', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ addOns: [] }))

			await fetchAddOns('acme')

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/tenant/acme/product-catalog/add-ons'),
				expect.any(Object)
			)
		})

		it('should include status filter in query params', async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ addOns: [] }))

			await fetchAddOns('acme', { status: 'active' })

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('status=active'),
				expect.any(Object)
			)
		})

		it('should return add-ons array on success', async () => {
			const mockAddOns = [
				{
					id: 'addon-1',
					name: 'Extra Storage',
					description: 'Additional storage',
					pricingModel: 'flat' as const,
					status: 'active' as const,
				},
			]

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ addOns: mockAddOns }))

			const result = await fetchAddOns('acme')

			expect(result).toEqual(mockAddOns)
		})
	})
})

