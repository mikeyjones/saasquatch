import { useState, useEffect, useMemo, useId } from 'react'
import { useParams } from '@tanstack/react-router'
import { z } from 'zod'
import { Building, RefreshCw, User, CreditCard } from 'lucide-react'

import { useAppForm } from '@/hooks/demo.form'
import { zodFormValidator } from '@/lib/form-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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

const customerSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  industry: z.string().default(''),
  website: z.string().default(''),
  billingEmail: z.string().default(''),
  billingAddress: z.string().default(''),
  assignedToUserId: z.string().default(''),
  importance: z.enum(['low', 'normal', 'high', 'vip']).optional(),
  tags: z.string().default(''),
  notes: z.string().default(''),
  createSubscription: z.boolean().default(false),
  productPlanId: z.string().default(''),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  seats: z.number().min(1).default(1),
})

/**
 * Product plan data for customer creation.
 */
interface ProductPlan {
  id: string
  name: string
  description?: string
  status: string
  pricingModel: string
  pricing?: {
    monthly?: number
    yearly?: number
  }
}

/**
 * Team member data for assignment.
 */
interface TeamMember {
  id: string
  name: string
}

/**
 * Customer data structure.
 */
interface CustomerData {
  id: string
  name: string
  industry?: string | null
  website?: string | null
  billingEmail?: string | null
  billingAddress?: string | null
  assignedToUserId?: string | null
  importance?: string | null
  tags?: string[]
  notes?: string | null
}

/**
 * Props for the CreateCustomerDialog component.
 */
interface CreateCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerCreated?: () => void
  customerId?: string | null // If provided, dialog is in edit mode
  customer?: CustomerData | null // Pre-filled customer data for edit mode
}

const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Retail',
  'Education',
  'Manufacturing',
  'Legal',
  'Energy',
  'Real Estate',
  'Media',
  'Other',
]

/**
 * Dialog component for creating or editing a customer/organization.
 * 
 * Supports both create and edit modes. When customerId is provided,
 * the form is pre-populated with existing customer data. Optionally
 * allows creating a subscription during customer creation.
 * 
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Callback when dialog open state changes
 * @param props.onCustomerCreated - Callback fired after successful save
 * @param props.customerId - Customer ID for edit mode (optional)
 * @param props.customer - Pre-filled customer data for edit mode (optional)
 */
export function CreateCustomerDialog({
  open,
  onOpenChange,
  onCustomerCreated,
  customerId,
  customer: initialCustomer,
}: CreateCustomerDialogProps) {
  const params = useParams({ strict: false }) as { tenant?: string }
  const tenant = params.tenant || ''
  const isEditMode = !!customerId

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createSubscription, setCreateSubscription] = useState(false)
  const createSubscriptionId = useId()
  const [plans, setPlans] = useState<ProductPlan[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false)
  const [loadedCustomer, setLoadedCustomer] = useState<CustomerData | null>(null)
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [selectedImportance, setSelectedImportance] = useState('normal')
  const [seats, setSeats] = useState(1)

  // Fetch customer data when in edit mode
  useEffect(() => {
    if (!open || !tenant || !isEditMode || !customerId) {
      setLoadedCustomer(null)
      return
    }

    const loadCustomer = async () => {
      setIsLoadingCustomer(true)
      try {
        const response = await fetch(`/api/tenant/${tenant}/crm/customers/${customerId}`)
        if (response.ok) {
          const data = await response.json()
          const customer = data.customer
          setLoadedCustomer(customer)
          setSelectedIndustry(customer.industry || '')
          setSelectedAssignee(customer.assignedToUserId || '')
          setSelectedImportance(customer.importance || 'normal')
        }
      } catch (err) {
        console.error('Failed to load customer:', err)
        setError('Failed to load customer data')
      } finally {
        setIsLoadingCustomer(false)
      }
    }

    loadCustomer()
  }, [open, tenant, isEditMode, customerId])

  // Fetch plans and team members when dialog opens
  useEffect(() => {
    if (!open || !tenant) return

    const loadData = async () => {
      setIsLoadingData(true)
      try {
        // Only fetch plans if not in edit mode (subscription creation not available in edit)
        if (!isEditMode) {
          const plansResponse = await fetch(`/api/tenant/${tenant}/product-catalog/plans?status=active`)
          if (plansResponse.ok) {
            const plansData = await plansResponse.json()
            setPlans(plansData.plans || [])
          }
        }

        // Fetch team members (organization members)
        const membersResponse = await fetch(`/api/tenant/${tenant}/members`)
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          setTeamMembers(membersData.members || [])
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [open, tenant, isEditMode])

  // Determine which customer data to use (loaded or initial)
  const customerData = loadedCustomer || initialCustomer

  const activePlans = useMemo(() => {
    return plans.filter(p => p.status === 'active')
  }, [plans])

  const selectedPlan = useMemo(() => {
    return plans.find(p => p.id === selectedPlanId)
  }, [plans, selectedPlanId])

  const form = useAppForm({
    defaultValues: {
      name: customerData?.name || '',
      industry: customerData?.industry || '',
      website: customerData?.website || '',
      billingEmail: customerData?.billingEmail || '',
      billingAddress: customerData?.billingAddress || '',
      assignedToUserId: customerData?.assignedToUserId || '',
      tags: customerData?.tags?.join(', ') || '',
      notes: customerData?.notes || '',
      createSubscription: false,
      productPlanId: '',
      billingCycle: 'monthly' as 'monthly' | 'yearly',
      seats: 1,
    },
    validators: {
      onBlur: zodFormValidator(customerSchema),
    },
    onSubmit: async ({ value }) => {
      if (!tenant) return

      setIsSubmitting(true)
      setError(null)

      try {
        // Parse tags from comma-separated string
        const tagsArray = value.tags
          ? value.tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
          : []

        const requestBody: Record<string, unknown> = {
          name: value.name,
          industry: selectedIndustry || undefined,
          website: value.website || undefined,
          billingEmail: value.billingEmail || undefined,
          billingAddress: value.billingAddress || undefined,
          assignedToUserId: selectedAssignee && selectedAssignee !== 'unassigned' ? selectedAssignee : (selectedAssignee === 'unassigned' ? null : undefined),
          importance: selectedImportance || 'normal',
          tags: tagsArray.length > 0 ? tagsArray : undefined,
          notes: value.notes || undefined,
        }

        if (isEditMode && customerId) {
          // Update existing customer
          const response = await fetch(`/api/tenant/${tenant}/crm/customers/${customerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Failed to update customer')
          }

          onOpenChange(false)
          onCustomerCreated?.()
        } else {
          // Create new customer
          if (createSubscription && selectedPlanId) {
            requestBody.createSubscription = true
            requestBody.subscriptionData = {
              productPlanId: selectedPlanId,
              status: 'active',
              billingCycle: selectedBillingCycle,
              seats: seats,
            }
          }

          const response = await fetch(`/api/tenant/${tenant}/crm/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create customer')
          }

          // Reset form and close dialog
          form.reset()
          setCreateSubscription(false)
          setSelectedIndustry('')
          setSelectedPlanId('')
          setSelectedBillingCycle('monthly')
          setSelectedAssignee('')
          setSelectedImportance('normal')
          setSeats(1)
          onOpenChange(false)
          onCustomerCreated?.()
        }
      } catch (err) {
        console.error(`Error ${isEditMode ? 'updating' : 'creating'} customer:`, err)
        setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} customer`)
      } finally {
        setIsSubmitting(false)
      }
    },
  })

  // Update form when customer data is loaded
  useEffect(() => {
    if (customerData && isEditMode && form) {
      form.setFieldValue('name', customerData.name || '')
      form.setFieldValue('website', customerData.website || '')
      form.setFieldValue('billingEmail', customerData.billingEmail || '')
      form.setFieldValue('billingAddress', customerData.billingAddress || '')
      form.setFieldValue('tags', customerData.tags?.join(', ') || '')
      form.setFieldValue('notes', customerData.notes || '')
    }
  }, [customerData, isEditMode, form])

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      if (!isEditMode) {
        form.reset()
        setCreateSubscription(false)
        setSelectedPlanId('')
        setSelectedBillingCycle('monthly')
        setSeats(1)
      }
      setSelectedIndustry('')
      setSelectedAssignee('')
      setError(null)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-500" />
            {isEditMode ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update customer information and details.'
              : 'Create a new customer or prospect. Optionally create a subscription immediately.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-5"
        >
          {/* Company Name */}
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label="Company Name *"
                placeholder="e.g., Acme Corporation"
              />
            )}
          </form.AppField>

          {/* Industry */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Industry</Label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Select industry..." />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Website */}
          <form.AppField name="website">
            {(field) => (
              <field.TextField
                label="Website"
                placeholder="https://example.com"
              />
            )}
          </form.AppField>

          {/* Billing Email */}
          <form.AppField name="billingEmail">
            {(field) => (
              <field.TextField
                label="Billing Email"
                placeholder="billing@example.com"
              />
            )}
          </form.AppField>

          {/* Billing Address */}
          <form.AppField name="billingAddress">
            {(field) => (
              <field.TextArea
                label="Billing Address"
                rows={2}
              />
            )}
          </form.AppField>

          {/* Assign To */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User size={14} />
              Assign To
            </Label>
            <Select value={selectedAssignee || 'unassigned'} onValueChange={(value) => setSelectedAssignee(value === 'unassigned' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select sales rep..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Importance */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Customer Importance
            </Label>
            <Select value={selectedImportance} onValueChange={setSelectedImportance}>
              <SelectTrigger>
                <SelectValue placeholder="Select importance..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <form.AppField name="tags">
            {(field) => (
              <field.TextField
                label="Tags"
                placeholder="enterprise, high-value (comma-separated)"
              />
            )}
          </form.AppField>

          {/* Notes */}
          <form.AppField name="notes">
            {(field) => (
              <field.TextArea
                label="Notes"
                rows={2}
              />
            )}
          </form.AppField>

          {/* Create Subscription Checkbox - Only show in create mode */}
          {!isEditMode && (
            <>
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={createSubscriptionId}
                    checked={createSubscription}
                    onCheckedChange={(checked) => setCreateSubscription(checked === true)}
                  />
                  <label
                    htmlFor={createSubscriptionId}
                    className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2"
                  >
                    <CreditCard size={16} />
                    Create subscription now (make this a customer)
                  </label>
                </div>
              </div>

              {/* Subscription Fields */}
              {createSubscription && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 text-sm">Subscription Details</h4>

                  {isLoadingData ? (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <RefreshCw size={14} className="animate-spin" />
                      Loading plans...
                    </div>
                  ) : activePlans.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      No active product plans available. Create a plan first.
                    </div>
                  ) : (
                    <>
                      {/* Product Plan */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Product Plan *
                        </Label>
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
                          onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-32"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {isLoadingCustomer && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={24} className="animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading customer data...</span>
            </div>
          )}

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
              disabled={isSubmitting || isLoadingCustomer || (createSubscription && !selectedPlanId)}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : isEditMode ? (
                'Update Customer'
              ) : createSubscription ? (
                'Create Customer'
              ) : (
                'Create Prospect'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


