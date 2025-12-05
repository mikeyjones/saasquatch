import { useState, useEffect, useMemo } from 'react'
import { useParams } from '@tanstack/react-router'
import { z } from 'zod'
import { CreditCard, RefreshCw, Building, Package, FileText } from 'lucide-react'

import { useAppForm } from '@/hooks/demo.form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const subscriptionSchema = z.object({
  tenantOrganizationId: z.string().min(1, 'Company is required'),
  productPlanId: z.string().min(1, 'Product plan is required'),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  seats: z.number().min(1).default(1),
  couponId: z.string().optional(),
  notes: z.string().optional(),
})

interface Company {
  id: string
  name: string
  subscriptionStatus?: string | null
}

interface ProductPlan {
  id: string
  name: string
  description?: string
  status: string
  pricingModel: string
}

interface CreateSubscriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubscriptionCreated?: () => void
  preSelectedCompanyId?: string | null
  preSelectedCompanyName?: string | null
}

export function CreateSubscriptionDialog({
  open,
  onOpenChange,
  onSubscriptionCreated,
  preSelectedCompanyId,
  preSelectedCompanyName,
}: CreateSubscriptionDialogProps) {
  const params = useParams({ strict: false }) as { tenant?: string }
  const tenant = params.tenant || ''

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [plans, setPlans] = useState<ProductPlan[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [seats, setSeats] = useState(1)
  const [notes, setNotes] = useState('')

  // Initialize with pre-selected company
  useEffect(() => {
    if (open && preSelectedCompanyId) {
      setSelectedCompanyId(preSelectedCompanyId)
    }
  }, [open, preSelectedCompanyId])

  // Fetch companies and plans when dialog opens
  useEffect(() => {
    if (!open || !tenant) return

    const loadData = async () => {
      setIsLoadingData(true)
      try {
        // Fetch companies (tenant organizations)
        const companiesResponse = await fetch(`/api/tenant/${tenant}/crm/customers?segment=all`)
        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json()
          setCompanies(companiesData.customers || [])
        }

        // Fetch product plans
        const plansResponse = await fetch(`/api/tenant/${tenant}/product-catalog/plans?status=active`)
        if (plansResponse.ok) {
          const plansData = await plansResponse.json()
          setPlans(plansData.plans || [])
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [open, tenant])

  const activePlans = useMemo(() => {
    return plans.filter(p => p.status === 'active')
  }, [plans])

  const selectedPlan = useMemo(() => {
    return plans.find(p => p.id === selectedPlanId)
  }, [plans, selectedPlanId])

  const selectedCompany = useMemo(() => {
    return companies.find(c => c.id === selectedCompanyId)
  }, [companies, selectedCompanyId])

  // Check if selected company already has an active subscription
  const companyHasActiveSubscription = useMemo(() => {
    if (!selectedCompany) return false
    return selectedCompany.subscriptionStatus === 'active'
  }, [selectedCompany])

  const form = useAppForm({
    defaultValues: {
      tenantOrganizationId: '',
      productPlanId: '',
      billingCycle: 'monthly' as const,
      seats: 1,
      couponId: '',
      notes: '',
    },
    validators: {
      onBlur: subscriptionSchema,
    },
    onSubmit: async () => {
      // Validation checks
      if (!tenant) {
        setError('Tenant is required')
        return
      }
      if (!selectedCompanyId) {
        setError('Please select a company')
        return
      }
      if (!selectedPlanId) {
        setError('Please select a product plan')
        return
      }
      if (companyHasActiveSubscription) {
        setError('This company already has an active subscription. Please cancel the existing subscription before creating a new one.')
        return
      }

      setIsSubmitting(true)
      setError(null)

      try {
        const requestBody = {
          tenantOrganizationId: selectedCompanyId,
          productPlanId: selectedPlanId,
          billingCycle: selectedBillingCycle,
          seats: seats,
          notes: notes || undefined,
        }

        const response = await fetch(`/api/tenant/${tenant}/subscriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        const data = await response.json()

        if (!response.ok) {
          if (response.status === 409) {
            throw new Error('This company already has an active subscription. Please cancel the existing subscription before creating a new one.')
          }
          throw new Error(data.error || 'Failed to create subscription')
        }

        // Reset form and close dialog
        resetForm()
        onOpenChange(false)
        onSubscriptionCreated?.()
      } catch (err) {
        console.error('Error creating subscription:', err)
        setError(err instanceof Error ? err.message : 'Failed to create subscription')
      } finally {
        setIsSubmitting(false)
      }
    },
  })

  const resetForm = () => {
    form.reset()
    setSelectedCompanyId(preSelectedCompanyId || '')
    setSelectedPlanId('')
    setSelectedBillingCycle('monthly')
    setSeats(1)
    setNotes('')
    setError(null)
  }

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  const canSubmit = selectedCompanyId && selectedPlanId && !companyHasActiveSubscription && !isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-500" />
            Create Subscription
          </DialogTitle>
          <DialogDescription>
            Create a new subscription for a company. Each company can only have one active subscription.
          </DialogDescription>
        </DialogHeader>

        {/* Draft status notice */}
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
          <FileText size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Subscription will be created in draft status</p>
            <p className="text-amber-700 mt-1">
              A draft invoice will be generated automatically. The subscription will become active when the invoice is marked as paid.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            
            // Validation checks
            if (!tenant) {
              setError('Tenant is required')
              return
            }
            if (!selectedCompanyId) {
              setError('Please select a company')
              return
            }
            if (!selectedPlanId) {
              setError('Please select a product plan')
              return
            }
            if (companyHasActiveSubscription) {
              setError('This company already has an active subscription. Please cancel the existing subscription before creating a new one.')
              return
            }

            setIsSubmitting(true)
            setError(null)

            try {
              const requestBody = {
                tenantOrganizationId: selectedCompanyId,
                productPlanId: selectedPlanId,
                billingCycle: selectedBillingCycle,
                seats: seats,
                notes: notes || undefined,
              }

              const response = await fetch(`/api/tenant/${tenant}/subscriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
              })

              const data = await response.json()

              if (!response.ok) {
                if (response.status === 409) {
                  throw new Error('This company already has an active subscription. Please cancel the existing subscription before creating a new one.')
                }
                throw new Error(data.error || 'Failed to create subscription')
              }

              // Reset form and close dialog
              resetForm()
              onOpenChange(false)
              onSubscriptionCreated?.()
            } catch (err) {
              console.error('Error creating subscription:', err)
              setError(err instanceof Error ? err.message : 'Failed to create subscription')
            } finally {
              setIsSubmitting(false)
            }
          }}
          className="space-y-5"
        >
          {/* Company Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Building size={14} />
              Company *
            </Label>
            {preSelectedCompanyId && preSelectedCompanyName ? (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <Building size={16} className="text-gray-500" />
                <span className="font-medium">{preSelectedCompanyName}</span>
              </div>
            ) : (
              <Select 
                value={selectedCompanyId} 
                onValueChange={setSelectedCompanyId}
                disabled={isLoadingData}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingData ? "Loading companies..." : "Select company..."} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      <div className="flex items-center gap-2">
                        <span>{company.name}</span>
                        {company.subscriptionStatus === 'active' && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                            Has subscription
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {companyHasActiveSubscription && (
              <p className="text-sm text-amber-600">
                ⚠️ This company already has an active subscription. Cancel it first to create a new one.
              </p>
            )}
          </div>

          {/* Product Plan Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Package size={14} />
              Product Plan *
            </Label>
            {isLoadingData ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <RefreshCw size={14} className="animate-spin" />
                Loading plans...
              </div>
            ) : activePlans.length === 0 ? (
              <div className="text-sm text-gray-500">
                No active product plans available. Create a plan first in the Product Catalog.
              </div>
            ) : (
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan..." />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedPlan?.description && (
              <p className="text-xs text-gray-500">{selectedPlan.description}</p>
            )}
          </div>

          {/* Billing Cycle */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Billing Cycle
            </Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedBillingCycle('monthly')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  selectedBillingCycle === 'monthly'
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setSelectedBillingCycle('yearly')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  selectedBillingCycle === 'yearly'
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* Seats */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Seats</Label>
            <Input
              type="number"
              min={1}
              value={seats}
              onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-32"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Notes (optional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes about this subscription..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
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
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Subscription'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


