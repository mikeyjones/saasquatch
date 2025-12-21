import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarketingHeader } from './MarketingHeader'

describe('MarketingHeader', () => {
	describe('Render Behavior', () => {
		it('should render search input', () => {
			render(<MarketingHeader />)

			expect(screen.getByPlaceholderText(/search campaigns, assets/i)).toBeInTheDocument()
		})

		it('should render notification bell button', () => {
			render(<MarketingHeader />)

			const buttons = screen.getAllByRole('button')
			expect(buttons.length).toBeGreaterThanOrEqual(1)
		})

		it('should render New Campaign button', () => {
			render(<MarketingHeader />)

			expect(screen.getByRole('button', { name: /new campaign/i })).toBeInTheDocument()
		})

		it('should render notification indicator', () => {
			const { container } = render(<MarketingHeader />)

			const indicator = container.querySelector('.bg-red-500.rounded-full')
			expect(indicator).toBeInTheDocument()
		})
	})

	describe('Layout', () => {
		it('should render header element', () => {
			const { container } = render(<MarketingHeader />)

			const header = container.querySelector('header')
			expect(header).toBeInTheDocument()
		})

		it('should have search input with correct styling', () => {
			render(<MarketingHeader />)

			const searchInput = screen.getByPlaceholderText(/search campaigns, assets/i)
			expect(searchInput).toHaveClass('pl-10')
		})
	})
})

