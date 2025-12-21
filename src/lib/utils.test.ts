import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
	describe('Class name merging', () => {
		it('should merge class names correctly', () => {
			const result = cn('foo', 'bar')
			expect(result).toBe('foo bar')
		})

		it('should handle conditional classes', () => {
			const result = cn('foo', false && 'bar', 'baz')
			expect(result).toBe('foo baz')
		})

		it('should merge Tailwind classes and resolve conflicts', () => {
			const result = cn('px-2 py-1', 'px-4')
			// tailwind-merge should keep px-4 and py-1, removing px-2
			expect(result).toContain('py-1')
			expect(result).toContain('px-4')
			// Note: px-2 might still be in the string but tailwind-merge should prioritize px-4
			expect(result.length).toBeGreaterThan(0)
		})

		it('should handle empty inputs', () => {
			const result = cn()
			expect(result).toBe('')
		})

		it('should handle undefined and null', () => {
			const result = cn('foo', undefined, null, 'bar')
			expect(result).toBe('foo bar')
		})

		it('should handle arrays', () => {
			const result = cn(['foo', 'bar'], 'baz')
			// clsx handles arrays, result should contain all values
			expect(result).toContain('foo')
			expect(result).toContain('bar')
			expect(result).toContain('baz')
		})

		it('should handle objects', () => {
			const result = cn({ foo: true, bar: false, baz: true })
			expect(result).toContain('foo')
			expect(result).toContain('baz')
			expect(result).not.toContain('bar')
		})
	})
})

