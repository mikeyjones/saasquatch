// Test setup file for Vitest with React Testing Library
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Mock ResizeObserver - required for Radix UI components
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

// Setup global fetch mock
const createDefaultFetch = () => {
	return vi.fn(() => {
		return Promise.resolve(
			new Response(JSON.stringify({ error: 'Not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			})
		)
	}) as typeof fetch
}

global.fetch = createDefaultFetch()

// Cleanup after each test
afterEach(() => {
	cleanup()
	vi.clearAllMocks()
	global.fetch = createDefaultFetch()
})

// Helper to create a mock Response
export function createMockResponse(data: unknown, options?: ResponseInit): Response {
	return new Response(JSON.stringify(data), {
		headers: { 'Content-Type': 'application/json' },
		...options,
	})
}

// Helper to create a successful fetch response
export function mockFetchSuccess(data: unknown, status = 200): Response {
	return createMockResponse(data, { status })
}

// Helper to create an error fetch response  
export function mockFetchError(error: string, status = 500): Response {
	return createMockResponse({ error }, { status })
}
