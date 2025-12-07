import { Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ProductTier {
  id: string
  name: string
  description: string
  basePrice: {
    amount: number
    currency: string
    interval: 'monthly' | 'yearly'
  }
  regionalPricing: Array<{
    region: string
    currency: string
    amount: number
  }>
  features: string[]
}

interface ProductTierCardProps {
  tier: ProductTier
  onEdit?: (tier: ProductTier) => void
  onDelete?: (tier: ProductTier) => void
}

export function ProductTierCard({ tier, onEdit, onDelete }: ProductTierCardProps) {
  const formatPrice = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount}`
    }
    if (currency === 'JPY') {
      return amount.toLocaleString()
    }
    return amount.toString()
  }

  const intervalLabel = tier.basePrice.interval === 'monthly' ? 'MONTHLY' : 'YEARLY'
  const intervalShort = tier.basePrice.interval === 'monthly' ? 'mo' : 'yr'

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Top colored bar */}
      <div className="h-1 bg-indigo-500" />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {intervalLabel}
          </span>
        </div>

        {/* Pricing */}
        <div className="mt-6 mb-4">
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-gray-900">
              {formatPrice(tier.basePrice.amount, tier.basePrice.currency)}
            </span>
            <span className="text-gray-500 ml-1">/ {intervalShort}</span>
          </div>

          {/* Regional Pricing */}
          {tier.regionalPricing.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tier.regionalPricing.map((regional) => (
                <span
                  key={regional.region}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-teal-50 text-teal-700 rounded-full border border-teal-200"
                >
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mr-1.5" />
                  {regional.region}: {regional.amount.toLocaleString()} {regional.currency}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          {tier.features.map((feature, index) => {
            // Use feature as primary key, index as fallback for duplicates
            const featureKey = feature || `feature-${index}`
            return (
              <div key={featureKey} className="flex items-center gap-2">
                <Check size={18} className="text-teal-500 flex-shrink-0" />
                <span className="text-sm text-gray-600">{feature}</span>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            className="flex-1 text-gray-600"
            onClick={() => onEdit?.(tier)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-gray-400 hover:text-red-500 hover:border-red-200"
            onClick={() => onDelete?.(tier)}
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </div>
    </div>
  )
}





