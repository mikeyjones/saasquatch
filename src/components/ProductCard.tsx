import { useState } from 'react'
import { ChevronDown, ChevronUp, Package, Plus, Pencil, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Product, ProductTier } from '@/data/products'

/**
 * Props for the ProductCard component.
 */
interface ProductCardProps {
  product: Product
  onEditProduct?: (product: Product) => void
  onDeleteProduct?: (product: Product) => void
  onAddPlan?: (product: Product) => void
  onEditPlan?: (plan: ProductTier, product: Product) => void
  onDeletePlan?: (plan: ProductTier, product: Product) => void
}

/**
 * Card component displaying a product with expandable plan list.
 * 
 * Shows product information in a collapsible card format. When expanded,
 * displays all associated plans with actions to manage them.
 * 
 * @param props - Component props
 * @param props.product - The product to display
 * @param props.onEditProduct - Callback when edit product is clicked
 * @param props.onDeleteProduct - Callback when delete product is clicked
 * @param props.onAddPlan - Callback when add plan is clicked
 * @param props.onEditPlan - Callback when edit plan is clicked
 * @param props.onDeletePlan - Callback when delete plan is clicked
 */
export function ProductCard({
  product,
  onEditProduct,
  onDeleteProduct,
  onAddPlan,
  onEditPlan,
  onDeletePlan,
}: ProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'draft':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'archived':
        return 'bg-gray-100 text-gray-500 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200'
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200">
      {/* Product Header - Always Visible */}
      <button
        type="button"
        className="w-full p-5 text-left cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{product.description || 'No description'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getStatusColor(product.status)}`}
            >
              {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
            </span>
            <span className="text-sm text-gray-500">
              {product.plans.length} plan{product.plans.length !== 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </Button>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Product Actions */}
          <div className="px-5 py-3 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditProduct?.(product)}
                className="text-gray-600"
              >
                <Pencil size={14} className="mr-1.5" />
                Edit Product
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeleteProduct?.(product)}
                className="text-gray-400 hover:text-red-500 hover:border-red-200"
              >
                <Trash2 size={14} className="mr-1.5" />
                Delete
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => onAddPlan?.(product)}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              <Plus size={14} className="mr-1.5" />
              Add Plan
            </Button>
          </div>

          {/* Plans List */}
          <div className="px-5 py-4">
            {product.plans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No plans yet. Add your first pricing plan!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {product.plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={() => onEditPlan?.(plan, product)}
                    onDelete={() => onDeletePlan?.(plan, product)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Nested Plan Card Component
interface PlanCardProps {
  plan: ProductTier
  onEdit?: () => void
  onDelete?: () => void
}

function PlanCard({ plan, onEdit, onDelete }: PlanCardProps) {
  const formatPrice = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount}`
    }
    if (currency === 'JPY') {
      return amount.toLocaleString()
    }
    return amount.toString()
  }

  const intervalShort = plan.basePrice.interval === 'monthly' ? 'mo' : 'yr'

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500'
      case 'draft':
        return 'bg-amber-500'
      case 'archived':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:border-indigo-200 hover:shadow-md transition-all">
      {/* Top colored bar based on status */}
      <div className={`h-1 ${getStatusColor(plan.status)}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-gray-900">{plan.name}</h4>
            {plan.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{plan.description}</p>
            )}
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {plan.pricingModel || 'flat'}
          </span>
        </div>

        {/* Pricing */}
        <div className="mb-3">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(plan.basePrice.amount, plan.basePrice.currency)}
            </span>
            <span className="text-gray-500 text-sm ml-1">/ {intervalShort}</span>
          </div>
        </div>

        {/* Features Preview */}
        {plan.features.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {plan.features.slice(0, 3).map((feature, index) => {
              const featureKey = feature || `feature-${index}`
              return (
                <div key={featureKey} className="flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-xs text-gray-600 truncate">{feature}</span>
                </div>
              )
            })}
            {plan.features.length > 3 && (
              <span className="text-xs text-gray-400">+{plan.features.length - 3} more</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-gray-600 text-xs"
            onClick={onEdit}
          >
            <Pencil size={12} className="mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-red-500 hover:border-red-200"
            onClick={onDelete}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}

