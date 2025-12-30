import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/ProductCard'
import { ProductPlanDialog } from '@/components/ProductPlanDialog'
import { CreateProductDialog } from '@/components/CreateProductDialog'
import {
  fetchProducts,
  deleteProduct,
  deletePlan,
  type Product,
  type ProductTier,
} from '@/data/products'

export const Route = createFileRoute('/$tenant/app/sales/product-catalog')({
  component: ProductCatalogPage,
})

function ProductCatalogPage() {
  const params = useParams({ strict: false }) as { tenant?: string }
  const tenant = params.tenant || ''

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Product dialog state
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Plan dialog state
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ProductTier | null>(null)
  const [selectedProductForPlan, setSelectedProductForPlan] = useState<Product | null>(null)

  // Loading states for delete operations
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
  const [, setDeletingPlanId] = useState<string | null>(null)

  // Load products function
  const loadProducts = useCallback(async () => {
    if (!tenant) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchProducts(tenant)
      setProducts(data)
    } catch {
      setError('Failed to load products')
    } finally {
      setIsLoading(false)
    }
  }, [tenant])

  // Load products on mount
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Product handlers
  const handleCreateProduct = () => {
    setEditingProduct(null)
    setProductDialogOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductDialogOpen(true)
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This will also remove all associated plans. This action cannot be undone.`)) {
      return
    }

    setDeletingProductId(product.id)
    try {
      const result = await deleteProduct(tenant, product.id)
      if (result.success) {
        setProducts(products.filter((p) => p.id !== product.id))
      } else {
        alert(result.error || 'Failed to delete product')
      }
    } finally {
      setDeletingProductId(null)
    }
  }

  const handleProductSaved = async () => {
    await loadProducts()
  }

  // Plan handlers
  const handleAddPlan = (product: Product) => {
    setSelectedProductForPlan(product)
    setEditingPlan(null)
    setPlanDialogOpen(true)
  }

  const handleEditPlan = (plan: ProductTier, product: Product) => {
    setSelectedProductForPlan(product)
    setEditingPlan(plan)
    setPlanDialogOpen(true)
  }

  const handleDeletePlan = async (plan: ProductTier, product: Product) => {
    if (!confirm(`Are you sure you want to delete the "${plan.name}" plan? This action cannot be undone.`)) {
      return
    }

    setDeletingPlanId(plan.id)
    try {
      const result = await deletePlan(tenant, plan.id)
      if (result.success) {
        // Update local state to remove the deleted plan
        setProducts(products.map((p) => {
          if (p.id === product.id) {
            return {
              ...p,
              plans: p.plans.filter((pl) => pl.id !== plan.id),
            }
          }
          return p
        }))
      } else {
        alert(result.error || 'Failed to delete plan')
      }
    } finally {
      setDeletingPlanId(null)
    }
  }

  const handlePlanSaved = async () => {
    await loadProducts()
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Product Catalog</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your products and their pricing plans.
          </p>
        </div>
        <Button
          className="bg-indigo-500 hover:bg-indigo-600 text-white"
          onClick={handleCreateProduct}
        >
          <Plus size={18} />
          Create Product
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
          <span className="ml-3 text-gray-500">Loading products...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && products.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full flex items-center justify-center">
            <Package size={32} className="text-indigo-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Get started by creating your first product. You can then add pricing plans to each product.
          </p>
          <Button
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
            onClick={handleCreateProduct}
          >
            <Plus size={18} className="mr-1" />
            Create Your First Product
          </Button>
        </div>
      )}

      {/* Products List */}
      {!isLoading && products.length > 0 && (
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className="relative">
              {deletingProductId === product.id && (
                <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-xl">
                  <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                </div>
              )}
              <ProductCard
                product={product}
                onEditProduct={handleEditProduct}
                onDeleteProduct={handleDeleteProduct}
                onAddPlan={handleAddPlan}
                onEditPlan={handleEditPlan}
                onDeletePlan={handleDeletePlan}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Product Dialog */}
      <CreateProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        product={editingProduct}
        onSaved={handleProductSaved}
      />

      {/* Create/Edit Plan Dialog */}
      <ProductPlanDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        plan={editingPlan}
        productId={selectedProductForPlan?.id}
        productName={selectedProductForPlan?.name}
        onSaved={handlePlanSaved}
      />
    </main>
  )
}
