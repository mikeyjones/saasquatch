import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from '@tanstack/react-router'
import { z } from 'zod'

import { useAppForm } from '@/hooks/demo.form'
import { zodFormValidator } from '@/lib/form-utils'
import {
  createProduct,
  updateProduct,
  type Product,
  type CreateProductInput,
  type UpdateProductInput,
} from '@/data/products'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().default(''),
  status: z.enum(['active', 'draft', 'archived']),
})

/**
 * Props for the CreateProductDialog component.
 */
interface CreateProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null // If provided, edit mode
  onSaved?: () => void
}

/**
 * Status options for product status dropdown.
 */
const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
]

/**
 * Dialog component for creating or editing a product.
 * 
 * Supports both create and edit modes. When a product is provided,
 * the form is pre-populated and the dialog operates in edit mode.
 * 
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Callback when dialog open state changes
 * @param props.product - Product to edit (optional, for edit mode)
 * @param props.onSaved - Callback fired after successful save
 */
export function CreateProductDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: CreateProductDialogProps) {
  const params = useParams({ strict: false }) as { tenant?: string }
  const tenant = params.tenant || ''
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditMode = !!product

  // Memoize defaultValues to prevent unnecessary form recreation
  const defaultValues = useMemo(
    () => ({
      name: product?.name || '',
      description: product?.description || '',
      status: (product?.status || 'draft') as 'active' | 'draft' | 'archived',
    }),
    [product]
  )

  // Memoize onSubmit handler to keep it stable
  const handleSubmit = useCallback(
    async (value: typeof defaultValues): Promise<boolean> => {
      if (!tenant) return false
      setIsSubmitting(true)
      setError(null)

      try {
        if (isEditMode && product) {
          const input: UpdateProductInput = {
            id: product.id,
            name: value.name,
            description: value.description || undefined,
            status: value.status,
          }
          const result = await updateProduct(tenant, input)

          if (!result.success) {
            setError(result.error || 'Failed to update product')
            return false
          }
        } else {
          const input: CreateProductInput = {
            name: value.name,
            description: value.description || undefined,
            status: value.status,
          }
          const result = await createProduct(tenant, input)

          if (!result.success) {
            setError(result.error || 'Failed to create product')
            return false
          }
        }

        setError(null)
        onOpenChange(false)
        onSaved?.()
        return true
      } finally {
        setIsSubmitting(false)
      }
    },
    [tenant, isEditMode, product, onOpenChange, onSaved]
  )

  const form = useAppForm({
    defaultValues,
    validators: {
      onBlur: zodFormValidator(productSchema),
    },
    onSubmit: async ({ value }) => {
      const success = await handleSubmit(value)
      if (success) {
        form.reset()
      }
    },
  })

  const resetForm = () => {
    form.reset()
    setError(null)
  }

  // Reset form when dialog opens with different product
  useEffect(() => {
    if (open) {
      form.reset()
      form.setFieldValue('name', defaultValues.name)
      form.setFieldValue('description', defaultValues.description)
      form.setFieldValue('status', defaultValues.status)
      setError(null)
    }
  }, [open, defaultValues, form])

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditMode ? 'Edit Product' : 'Create New Product'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the product details below.'
              : 'Create a new product. You can add pricing plans after creating the product.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-5"
        >
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Name Field */}
          <form.AppField name="name">
            {(field) => (
              <field.TextField label="Product Name" placeholder="e.g., CRM Platform, Marketing Suite" />
            )}
          </form.AppField>

          {/* Description Field */}
          <form.AppField name="description">
            {(field) => (
              <field.TextArea label="Description" rows={3} />
            )}
          </form.AppField>

          {/* Status Field */}
          <form.AppField name="status">
            {(field) => (
              <field.Select label="Status" values={statusOptions} placeholder="Select status" />
            )}
          </form.AppField>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              {isSubmitting
                ? isEditMode
                  ? 'Saving...'
                  : 'Creating...'
                : isEditMode
                  ? 'Save Changes'
                  : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


