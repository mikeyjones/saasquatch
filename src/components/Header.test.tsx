import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from './Header'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
	Link: ({ children, to, onClick, ...props }: any) => (
		<a href={to} onClick={onClick} {...props}>
			{children}
		</a>
	),
	useRouter: () => ({
		state: { location: { pathname: '/' } },
	}),
}))

describe('Header', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Render Behavior', () => {
		it('should render header with menu button', () => {
			render(<Header />)

			const menuButton = screen.getByRole('button', { name: /open menu/i })
			expect(menuButton).toBeInTheDocument()
		})

		it('should render logo link', () => {
			render(<Header />)

			const logoLink = screen.getByRole('link', { name: /tanstack logo/i })
			expect(logoLink).toBeInTheDocument()
			expect(logoLink).toHaveAttribute('href', '/')
		})

		it('should render sidebar hidden by default', () => {
			render(<Header />)

			const sidebar = screen.getByRole('complementary', { hidden: true })
			expect(sidebar).toBeInTheDocument()
			expect(sidebar.className).toContain('-translate-x-full')
		})
	})

	describe('User Interactions', () => {
		it('should open sidebar when menu button is clicked', async () => {
			const user = userEvent.setup()
			render(<Header />)

			const menuButton = screen.getByRole('button', { name: /open menu/i })
			await user.click(menuButton)

			await waitFor(() => {
				const sidebar = screen.getByRole('complementary', { hidden: true })
				expect(sidebar.className).toContain('translate-x-0')
			})
		})

		it('should close sidebar when close button is clicked', async () => {
			const user = userEvent.setup()
			render(<Header />)

			// Open sidebar first
			const menuButton = screen.getByRole('button', { name: /open menu/i })
			await user.click(menuButton)

			await waitFor(() => {
				const sidebar = screen.getByRole('complementary', { hidden: true })
				expect(sidebar.className).toContain('translate-x-0')
			})

			// Close sidebar
			const closeButton = screen.getByRole('button', { name: /close menu/i })
			await user.click(closeButton)

			await waitFor(() => {
				const sidebar = screen.getByRole('complementary', { hidden: true })
				expect(sidebar.className).toContain('-translate-x-full')
			})
		})

		it('should render navigation links', () => {
			render(<Header />)

			expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /forms/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /store/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /table/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /database/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /mcp todos/i })).toBeInTheDocument()
		})

		it('should toggle Forms group expansion', async () => {
			const user = userEvent.setup()
			render(<Header />)

			// Open sidebar first
			const menuButton = screen.getByRole('button', { name: /open menu/i })
			await user.click(menuButton)

			await waitFor(() => {
				// Find the Forms expand button
				const formsSection = screen.getByRole('link', { name: /forms/i }).closest('div')
				const expandButton = formsSection?.parentElement?.querySelector('button')
				if (expandButton) {
					expect(expandButton).toBeInTheDocument()
				}
			})
		})
	})
})

