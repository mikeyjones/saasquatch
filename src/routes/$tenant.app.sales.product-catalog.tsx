import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductTierCard, type ProductTier } from '@/components/ProductTierCard'

export const Route = createFileRoute('/$tenant/app/sales/product-catalog')({
  component: ProductCatalogPage,
})

// Mock data for product tiers
const initialTiers: ProductTier[] = [
  {
    id: 'tier-1',
    name: 'Starter Tier',
    description: 'Perfect for small teams getting started.',
    basePrice: {
      amount: 29,
      currency: 'USD',
      interval: 'monthly',
    },
    regionalPricing: [
      { region: 'GB', currency: 'GBP', amount: 25 },
    ],
    features: [
      'Up to 5 Users',
      'Basic Analytics',
      'Email Support',
    ],
  },
  {
    id: 'tier-2',
    name: 'Pro Growth',
    description: 'Advanced features for scaling companies.',
    basePrice: {
      amount: 99,
      currency: 'USD',
      interval: 'monthly',
    },
    regionalPricing: [
      { region: 'DE', currency: 'EUR', amount: 95 },
      { region: 'JP', currency: 'JPY', amount: 14000 },
    ],
    features: [
      'Up to 20 Users',
      'Advanced Reporting',
      'Priority Support',
      'API Access',
    ],
  },
]

function ProductCatalogPage() {
  const [tiers] = useState<ProductTier[]>(initialTiers)

  const handleEdit = (tier: ProductTier) => {
    console.log('Edit tier:', tier)
    // TODO: Open edit dialog
  }

  const handleDelete = (tier: ProductTier) => {
    console.log('Delete tier:', tier)
    // TODO: Open confirmation dialog
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Product Catalog</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage subscription tiers and regional pricing strategies.
          </p>
        </div>
        <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
          <Plus size={18} />
          Create Plan
        </Button>
      </div>

      {/* Product Tier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <ProductTierCard
            key={tier.id}
            tier={tier}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </main>
  )
}

