import { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { z } from 'zod'
import { Plus, X } from 'lucide-react'

import { useAppForm } from '@/hooks/demo.form'
import {
  createPlan,
  updatePlan,
  type ProductTier,
  type CreatePlanInput,
  type UpdatePlanInput,
} from '@/data/products'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const planSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  status: z.enum(['active', 'draft', 'archived']),
  pricingModel: z.enum(['flat', 'seat', 'usage', 'hybrid']),
  baseAmount: z.string().min(1, 'Price is required'),
  baseCurrency: z.string().min(1, 'Currency is required'),
  baseInterval: z.enum(['monthly', 'yearly']),
})

interface ProductPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: ProductTier | null // If provided, edit mode
  onSaved?: () => void
}

// Currency options
const currencyOptions = [
  { label: 'USD ($)', value: 'USD' },
  { label: 'EUR (€)', value: 'EUR' },
  { label: 'GBP (£)', value: 'GBP' },
  { label: 'JPY (¥)', value: 'JPY' },
  { label: 'CAD (C$)', value: 'CAD' },
  { label: 'AUD (A$)', value: 'AUD' },
]

// Region options
const regionOptions = [
  { label: 'United States', value: 'US' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Germany', value: 'DE' },
  { label: 'France', value: 'FR' },
  { label: 'Japan', value: 'JP' },
  { label: 'Canada', value: 'CA' },
  { label: 'Australia', value: 'AU' },
]

// Status options
const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
]

// Pricing model options
const pricingModelOptions = [
  { label: 'Flat Rate', value: 'flat' },
  { label: 'Seat-based', value: 'seat' },
  { label: 'Usage-based', value: 'usage' },
  { label: 'Hybrid', value: 'hybrid' },
]

// Interval options
const intervalOptions = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
]

export function ProductPlanDialog({
  open,
  onOpenChange,
  plan,
  onSaved,
}: ProductPlanDialogProps) {
  const params = useParams({ strict: false }) as { tenant?: string }
  const tenant = params.tenant || ''
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Regional pricing state
  const [regionalPricing, setRegionalPricing] = useState<
    Array<{ region: string; currency: string; amount: string }>
  >([])

  // Features state
  const [features, setFeatures] = useState<string[]>([])
  const [newFeature, setNewFeature] = useState('')

  const isEditMode = !!plan

  const form = useAppForm({
    defaultValues: {
      name: plan?.name || '',
      description: plan?.description || '',
      status: (plan?.status || 'draft') as 'active' | 'draft' | 'archived',
      pricingModel: (plan?.pricingModel || 'flat') as 'flat' | 'seat' | 'usage' | 'hybrid',
      baseAmount: plan?.basePrice?.amount?.toString() || '0',
      baseCurrency: plan?.basePrice?.currency || 'USD',
      baseInterval: (plan?.basePrice?.interval || 'monthly') as 'monthly' | 'yearly',
    },
    validators: {
      onBlur: planSchema,
    },
    onSubmit: async ({ value }) => {
      if (!tenant) return
      setIsSubmitting(true)
      setError(null)

      try {
        const basePrice = {
          amount: Number.parseFloat(value.baseAmount) || 0,
          currency: value.baseCurrency,
          interval: value.baseInterval,
        }

        const formattedRegionalPricing = regionalPricing
          .filter((rp) => rp.region && rp.amount)
          .map((rp) => ({
            region: rp.region,
            currency: rp.currency,
            amount: Number.parseFloat(rp.amount) || 0,
          }))

        if (isEditMode && plan) {
          const input: UpdatePlanInput = {
            id: plan.id,
            name: value.name,
            description: value.description || undefined,
            status: value.status,
            pricingModel: value.pricingModel,
            basePrice,
            regionalPricing: formattedRegionalPricing,
            features: features.filter(Boolean),
          }
          const result = await updatePlan(tenant, input)

          if (!result.success) {
            setError(result.error || 'Failed to update plan')
            return
          }
        } else {
          const input: CreatePlanInput = {
            name: value.name,
            description: value.description || undefined,
            status: value.status,
            pricingModel: value.pricingModel,
            basePrice,
            regionalPricing: formattedRegionalPricing,
            features: features.filter(Boolean),
          }
          const result = await createPlan(tenant, input)

          if (!result.success) {
            setError(result.error || 'Failed to create plan')
            return
          }
        }

        resetForm()
        onOpenChange(false)
        onSaved?.()
      } finally {
        setIsSubmitting(false)
      }
    },
  })

  const resetForm = () => {
    form.reset()
    setRegionalPricing([])
    setFeatures([])
    setNewFeature('')
    setError(null)
  }

  // Reset form when dialog opens with different plan
  useEffect(() => {
    if (open) {
      form.reset()
      form.setFieldValue('name', plan?.name || '')
      form.setFieldValue('description', plan?.description || '')
      form.setFieldValue('status', (plan?.status || 'draft') as 'active' | 'draft' | 'archived')
      form.setFieldValue('pricingModel', (plan?.pricingModel || 'flat') as 'flat' | 'seat' | 'usage' | 'hybrid')
      form.setFieldValue('baseAmount', plan?.basePrice?.amount?.toString() || '0')
      form.setFieldValue('baseCurrency', plan?.basePrice?.currency || 'USD')
      form.setFieldValue('baseInterval', (plan?.basePrice?.interval || 'monthly') as 'monthly' | 'yearly')

      // Set regional pricing
      if (plan?.regionalPricing && plan.regionalPricing.length > 0) {
        setRegionalPricing(
          plan.regionalPricing.map((rp) => ({
            region: rp.region,
            currency: rp.currency,
            amount: rp.amount.toString(),
          }))
        )
      } else {
        setRegionalPricing([])
      }

      // Set features
      if (plan?.features && plan.features.length > 0) {
        setFeatures(plan.features)
      } else {
        setFeatures([])
      }

      setNewFeature('')
      setError(null)
    }
  }, [open, plan])

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  const addRegionalPricing = () => {
    setRegionalPricing([...regionalPricing, { region: '', currency: 'USD', amount: '' }])
  }

  const removeRegionalPricing = (index: number) => {
    setRegionalPricing(regionalPricing.filter((_, i) => i !== index))
  }

  const updateRegionalPricing = (
    index: number,
    field: 'region' | 'currency' | 'amount',
    value: string
  ) => {
    const updated = [...regionalPricing]
    updated[index] = { ...updated[index], [field]: value }
    setRegionalPricing(updated)
  }

  const addFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()])
      setNewFeature('')
    }
  }

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditMode ? 'Edit Plan' : 'Create New Plan'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the plan details below.'
              : 'Create a new subscription plan. Fill in the details below.'}
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
              <field.TextField label="Plan Name" placeholder="e.g., Pro Plan, Enterprise" />
            )}
          </form.AppField>

          {/* Description Field */}
          <form.AppField name="description">
            {(field) => (
              <field.TextArea label="Description" rows={3} />
            )}
          </form.AppField>

          {/* Status & Pricing Model Row */}
          <div className="grid grid-cols-2 gap-4">
            <form.AppField name="status">
              {(field) => (
                <field.Select label="Status" values={statusOptions} placeholder="Select status" />
              )}
            </form.AppField>

            <form.AppField name="pricingModel">
              {(field) => (
                <field.Select
                  label="Pricing Model"
                  values={pricingModelOptions}
                  placeholder="Select model"
                />
              )}
            </form.AppField>
          </div>

          {/* Base Pricing Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Base Pricing</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Amount</Label>
                <form.Subscribe selector={(state) => state.values.baseAmount}>
                  {(amount) => (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => form.setFieldValue('baseAmount', e.target.value)}
                    />
                  )}
                </form.Subscribe>
              </div>
              <form.AppField name="baseCurrency">
                {(field) => (
                  <div>
                    <Label className="text-xs text-gray-500">Currency</Label>
                    <field.Select values={currencyOptions} placeholder="Currency" />
                  </div>
                )}
              </form.AppField>
              <form.AppField name="baseInterval">
                {(field) => (
                  <div>
                    <Label className="text-xs text-gray-500">Interval</Label>
                    <field.Select values={intervalOptions} placeholder="Interval" />
                  </div>
                )}
              </form.AppField>
            </div>
          </div>

          {/* Regional Pricing Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Regional Pricing (Optional)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRegionalPricing}>
                <Plus size={14} className="mr-1" />
                Add Region
              </Button>
            </div>
            {regionalPricing.length > 0 && (
              <div className="space-y-2">
                {regionalPricing.map((rp, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={rp.region}
                      onChange={(e) => updateRegionalPricing(index, 'region', e.target.value)}
                    >
                      <option value="">Select Region</option>
                      {regionOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Amount"
                      value={rp.amount}
                      onChange={(e) => updateRegionalPricing(index, 'amount', e.target.value)}
                      className="w-28"
                    />
                    <select
                      className="flex h-9 w-24 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={rp.currency}
                      onChange={(e) => updateRegionalPricing(index, 'currency', e.target.value)}
                    >
                      {currencyOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.value}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => removeRegionalPricing(index)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {regionalPricing.length === 0 && (
              <p className="text-xs text-gray-500">
                Add region-specific pricing for different markets.
              </p>
            )}
          </div>

          {/* Features Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Features</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add a feature (e.g., 'Up to 10 users')"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addFeature()
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                <Plus size={14} className="mr-1" />
                Add
              </Button>
            </div>
            {features.length > 0 && (
              <div className="space-y-1">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md"
                  >
                    <span className="text-sm text-gray-700">{feature}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-red-500"
                      onClick={() => removeFeature(index)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {features.length === 0 && (
              <p className="text-xs text-gray-500">
                Add features that are included in this plan.
              </p>
            )}
          </div>

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
                  : 'Create Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

