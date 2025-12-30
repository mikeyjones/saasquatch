import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductCard } from './ProductCard'
import type { Product } from '@/data/products'

const mockProduct: Product = {
  id: 'prod-1',
  name: 'CRM Platform',
  description: 'Complete customer relationship management',
  status: 'active',
  plans: [
    {
      id: 'plan-1',
      name: 'Starter',
      description: 'For small teams',
      status: 'active',
      pricingModel: 'flat',
      basePrice: { amount: 29, currency: 'USD', interval: 'monthly' },
      regionalPricing: [],
      features: ['Up to 5 users', 'Basic analytics'],
    },
    {
      id: 'plan-2',
      name: 'Pro',
      description: 'For growing teams',
      status: 'active',
      pricingModel: 'seat',
      basePrice: { amount: 99, currency: 'USD', interval: 'monthly' },
      regionalPricing: [],
      features: ['Unlimited users', 'Advanced analytics', 'API access'],
    },
  ],
}

describe('ProductCard', () => {
  describe('Render Behavior', () => {
    it('should render product name and description', () => {
      render(<ProductCard product={mockProduct} />)
      expect(screen.getByText('CRM Platform')).toBeInTheDocument()
      expect(screen.getByText('Complete customer relationship management')).toBeInTheDocument()
    })

    it('should show product status badge', () => {
      render(<ProductCard product={mockProduct} />)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('should show plan count', () => {
      render(<ProductCard product={mockProduct} />)
      expect(screen.getByText('2 plans')).toBeInTheDocument()
    })

    it('should be collapsed by default', () => {
      render(<ProductCard product={mockProduct} />)
      // Plans should not be visible when collapsed
      expect(screen.queryByText('Starter')).not.toBeInTheDocument()
    })
  })

  describe('Expand/Collapse Behavior', () => {
    it('should expand when header is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductCard product={mockProduct} />)

      // Click to expand
      await user.click(screen.getByText('CRM Platform'))

      // Plans should now be visible
      expect(screen.getByText('Starter')).toBeInTheDocument()
      expect(screen.getByText('Pro')).toBeInTheDocument()
    })

    it('should show plan prices when expanded', async () => {
      const user = userEvent.setup()
      render(<ProductCard product={mockProduct} />)

      await user.click(screen.getByText('CRM Platform'))

      expect(screen.getByText('$29')).toBeInTheDocument()
      expect(screen.getByText('$99')).toBeInTheDocument()
    })

    it('should show Add Plan button when expanded', async () => {
      const user = userEvent.setup()
      render(<ProductCard product={mockProduct} />)

      await user.click(screen.getByText('CRM Platform'))

      expect(screen.getByRole('button', { name: /add plan/i })).toBeInTheDocument()
    })
  })

  describe('Callback Behavior', () => {
    it('should call onEditProduct when Edit Product is clicked', async () => {
      const user = userEvent.setup()
      const onEditProduct = vi.fn()
      render(<ProductCard product={mockProduct} onEditProduct={onEditProduct} />)

      await user.click(screen.getByText('CRM Platform'))
      await user.click(screen.getByRole('button', { name: /edit product/i }))

      expect(onEditProduct).toHaveBeenCalledWith(mockProduct)
    })

    it('should call onAddPlan when Add Plan is clicked', async () => {
      const user = userEvent.setup()
      const onAddPlan = vi.fn()
      render(<ProductCard product={mockProduct} onAddPlan={onAddPlan} />)

      await user.click(screen.getByText('CRM Platform'))
      await user.click(screen.getByRole('button', { name: /add plan/i }))

      expect(onAddPlan).toHaveBeenCalledWith(mockProduct)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when product has no plans', async () => {
      const user = userEvent.setup()
      const emptyProduct: Product = {
        ...mockProduct,
        plans: [],
      }
      render(<ProductCard product={emptyProduct} />)

      await user.click(screen.getByText('CRM Platform'))

      expect(screen.getByText(/no plans yet/i)).toBeInTheDocument()
    })
  })

  describe('Status Variants', () => {
    it('should show draft status with correct styling', () => {
      const draftProduct: Product = {
        ...mockProduct,
        status: 'draft',
      }
      render(<ProductCard product={draftProduct} />)
      expect(screen.getByText('Draft')).toBeInTheDocument()
    })

    it('should show archived status', () => {
      const archivedProduct: Product = {
        ...mockProduct,
        status: 'archived',
      }
      render(<ProductCard product={archivedProduct} />)
      expect(screen.getByText('Archived')).toBeInTheDocument()
    })
  })
})

