import { useState, useEffect, useId } from 'react'
import { useParams } from '@tanstack/react-router'
import { Package, DollarSign, Loader2 } from 'lucide-react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AvailableAddOn } from '@/data/products'

interface AddOnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  addOn?: AvailableAddOn | null // If provided, edit mode
  onSaved?: () => void
}

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
]

// Interval options
const intervalOptions = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'One-time', value: 'onetime' },
]

// Currency options
const currencyOptions = [
  { label: 'USD ($)', value: 'USD' },
  { label: 'EUR (€)', value: 'EUR' },
  { label: 'GBP (£)', value: 'GBP' },
]

export function AddOnDialog({
  open,
  onOpenChange,
  addOn,
  onSaved,
}: AddOnDialogProps) {
  const params = useParams({ strict: false }) as { tenant?: string }
  const tenant = params.tenant || ''
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameId = useId()
  const descriptionId = useId()

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>('draft')
  const [pricingModel, setPricingModel] = useState<'flat' | 'seat' | 'usage'>('flat')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [interval, setInterval] = useState<string>('monthly')

  const isEditMode = !!addOn

  // Reset form when dialog opens with different add-on
  useEffect(() => {
    if (open) {
      setName(addOn?.name || '')
      setDescription(addOn?.description || '')
      setStatus((addOn?.status as 'active' | 'draft' | 'archived') || 'draft')
      setPricingModel((addOn?.pricingModel as 'flat' | 'seat' | 'usage') || 'flat')
      setAmount(addOn?.basePrice?.amount?.toString() || '')
      setCurrency(addOn?.basePrice?.currency || 'USD')
      // Map null/undefined interval to "onetime" for the UI
      setInterval(addOn?.basePrice?.interval || 'onetime')
      setError(null)
    }
  }, [open, addOn])

  const resetForm = () => {
    setName('')
    setDescription('')
    setStatus('draft')
    setPricingModel('flat')
    setAmount('')
    setCurrency('USD')
    setInterval('monthly')
    setError(null)
  }

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tenant) {
      setError('Tenant is required')
      return
    }
    
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Convert "onetime" to undefined for the API (no recurring interval)
      const intervalValue = interval === 'onetime' ? undefined : interval

      const requestBody = {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        pricingModel,
        basePrice: amount
          ? {
              amount: parseFloat(amount),
              currency,
              interval: intervalValue,
            }
          : undefined,
      }

      const url = isEditMode
        ? `/api/tenant/${tenant}/product-catalog/add-ons`
        : `/api/tenant/${tenant}/product-catalog/add-ons`
      
      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(isEditMode ? { ...requestBody, id: addOn?.id } : requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} add-on`)
      }

      resetForm()
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      console.error('Error saving add-on:', err)
      setError(err instanceof Error ? err.message : 'Failed to save add-on')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" />
            {isEditMode ? 'Edit Add-On' : 'Create New Add-On'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the add-on details below.'
              : 'Create a new add-on that can be attached to product plans as bolt-ons.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor={nameId} className="text-sm font-medium">
              Add-On Name *
            </Label>
            <Input
              id={nameId}
              placeholder="e.g., Extra Storage, Priority Support"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor={descriptionId} className="text-sm font-medium">
              Description
            </Label>
            <textarea
              id={descriptionId}
              placeholder="Describe what this add-on includes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Status & Pricing Model Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Pricing Model</Label>
              <Select value={pricingModel} onValueChange={(v) => setPricingModel(v as typeof pricingModel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {pricingModelOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <DollarSign size={14} />
              Base Pricing (Optional)
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Interval</Label>
                <Select value={interval} onValueChange={setInterval}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {intervalOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Set the base price for this add-on. For usage-based pricing, this can be left empty.
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {isEditMode ? 'Saving...' : 'Creating...'}
                </>
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Create Add-On'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

