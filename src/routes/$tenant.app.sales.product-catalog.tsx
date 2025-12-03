import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductTierCard } from '@/components/ProductTierCard'
import { ProductPlanDialog } from '@/components/ProductPlanDialog'
import {
  fetchPlans,
  deletePlan,
  type ProductTier,
} from '@/data/products'

export const Route = createFileRoute('/$tenant/app/sales/product-catalog')({
  component: ProductCatalogPage,
})

function ProductCatalogPage() {
  const params = useParams({ strict: false }) as { tenant?: string }
  const tenant = params.tenant || ''

  const [plans, setPlans] = useState<ProductTier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ProductTier | null>(null)

  // Delete confirmation state
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null)

  // Load plans on mount
  useEffect(() => {
    if (!tenant) return

    const loadPlans = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchPlans(tenant)
        setPlans(data)
      } catch {
        setError('Failed to load plans')
      } finally {
        setIsLoading(false)
      }
    }

    loadPlans()
  }, [tenant])

  const handleCreatePlan = () => {
    setEditingPlan(null)
    setDialogOpen(true)
  }

  const handleEdit = (plan: ProductTier) => {
    setEditingPlan(plan)
    setDialogOpen(true)
  }

  const handleDelete = async (plan: ProductTier) => {
    if (!confirm(`Are you sure you want to delete "${plan.name}"? This action cannot be undone.`)) {
      return
    }

    setDeletingPlanId(plan.id)
    try {
      const result = await deletePlan(tenant, plan.id)
      if (result.success) {
        setPlans(plans.filter((p) => p.id !== plan.id))
      } else {
        alert(result.error || 'Failed to delete plan')
      }
    } finally {
      setDeletingPlanId(null)
    }
  }

  const handleSaved = async () => {
    // Reload plans after create/update
    const data = await fetchPlans(tenant)
    setPlans(data)
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
        <Button
          className="bg-indigo-500 hover:bg-indigo-600 text-white"
          onClick={handleCreatePlan}
        >
          <Plus size={18} />
          Create Plan
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="ml-3 text-gray-500">Loading plans...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && plans.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Plus size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No plans yet</h3>
          <p className="text-gray-500 mb-4">
            Get started by creating your first subscription plan.
          </p>
          <Button
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
            onClick={handleCreatePlan}
          >
            <Plus size={18} className="mr-1" />
            Create Your First Plan
          </Button>
        </div>
      )}

      {/* Product Tier Grid */}
      {!isLoading && plans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="relative">
              {deletingPlanId === plan.id && (
                <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-lg">
                  <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                </div>
              )}
              <ProductTierCard
                tier={plan}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <ProductPlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plan={editingPlan}
        onSaved={handleSaved}
      />
    </main>
  )
}
