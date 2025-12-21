import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MarketingSidebar } from './MarketingSidebar'
import * as router from '@tanstack/react-router'
import * as tenantHook from '@/hooks/use-tenant'
import * as authClient from '@/lib/auth-client'

vi.mock('@tanstack/react-router', () => ({
	Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
	useLocation: vi.fn(() => ({ pathname: '/acme/app/marketing' })),
	useNavigate: vi.fn(() => vi.fn()),
}))

vi.mock('@/hooks/use-tenant', () => ({
	useTenantSlug: vi.fn(() => 'acme'),
	useTenant: vi.fn(() => ({ id: 'org-1', name: 'Acme Corp' })),
}))

vi.mock('@/lib/auth-client', () => ({
	useSession: vi.fn(() => ({
		data: {
			user: { id: 'user-1', name: 'Test User', email: 'test@acme.com' },
		},
	})),
	signOut: vi.fn(),
}))

describe('MarketingSidebar', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should render sidebar with navigation items', () => {
		render(<MarketingSidebar />)

		expect(screen.getByText('Overview')).toBeInTheDocument()
		expect(screen.getByText('Campaigns')).toBeInTheDocument()
	})

	it('should render department selector', () => {
		render(<MarketingSidebar />)

		// The trigger button should be visible
		expect(screen.getByText('Marketing Dept')).toBeInTheDocument()
	})

	it('should show department links when dropdown is opened', async () => {
		const user = userEvent.setup()
		render(<MarketingSidebar />)

		// Find the trigger button (first occurrence is the button, second would be in dropdown)
		const marketingDeptTexts = screen.getAllByText('Marketing Dept')
		const triggerButton = marketingDeptTexts[0].closest('button')
		if (triggerButton) {
			await user.click(triggerButton)
		}

		// Wait for dropdown content to appear
		await waitFor(() => {
			expect(screen.getByText('Sales Department')).toBeInTheDocument()
			expect(screen.getByText('Customer Support')).toBeInTheDocument()
			// After opening, there should be multiple "Marketing Dept" texts (trigger + dropdown item)
			expect(screen.getAllByText('Marketing Dept').length).toBeGreaterThan(1)
		})
	})
})

