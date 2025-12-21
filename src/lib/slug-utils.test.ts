import { describe, it, expect } from 'vitest'
import { generateSlug } from './slug-utils'

describe('generateSlug', () => {
	describe('Basic slug generation', () => {
		it('should convert title to lowercase', () => {
			expect(generateSlug('Hello World')).toBe('hello-world')
		})

		it('should replace spaces with hyphens', () => {
			expect(generateSlug('Hello World Test')).toBe('hello-world-test')
		})

		it('should remove special characters', () => {
			expect(generateSlug('Hello! World@ Test#')).toBe('hello-world-test')
		})

		it('should handle multiple spaces', () => {
			expect(generateSlug('Hello    World')).toBe('hello-world')
		})

		it('should replace multiple hyphens with single', () => {
			expect(generateSlug('Hello---World')).toBe('hello-world')
		})

		it('should remove leading hyphens', () => {
			expect(generateSlug('-Hello World')).toBe('hello-world')
		})

		it('should remove trailing hyphens', () => {
			expect(generateSlug('Hello World-')).toBe('hello-world')
		})

		it('should limit length to 100 characters', () => {
			const longTitle = 'a'.repeat(150)
			const result = generateSlug(longTitle)
			expect(result.length).toBeLessThanOrEqual(100)
		})

		it('should handle empty string', () => {
			expect(generateSlug('')).toBe('')
		})

		it('should preserve numbers', () => {
			expect(generateSlug('Hello World 123')).toBe('hello-world-123')
		})

		it('should handle special characters in title', () => {
			expect(generateSlug('How to Set Up SSO?')).toBe('how-to-set-up-sso')
		})

		it('should handle unicode characters', () => {
			// Unicode should be removed as it's not a-z0-9
			const result = generateSlug('Hello Café World')
			expect(result).not.toContain('é')
		})
	})
})

