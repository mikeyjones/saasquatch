/**
 * CreateQuoteDialog Component
 *
 * A comprehensive dialog for creating new quotes with product/plan selection,
 * line item management, and pricing calculation.
 *
 * @module CreateQuoteDialog
 */

import { useState, useMemo, useId, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { FileText, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Combobox } from '@/components/ui/combobox'
import { createQuote, type CreateQuoteInput } from '@/data/quotes'
import { fetchPlans, fetchProducts, type Product, type ProductTier } from '@/data/products'

/**
 * Represents a single line item in the quote form.
 * Each line item can be linked to a product and plan.
 */
interface LineItem {
	/** Unique identifier for this line item in the form */
	id: string
	/** Selected product ID for this line item */
	productId?: string
	/** Selected plan ID for this line item */
	planId?: string
	/** Description text (auto-populated from plan name) */
	description: string
	/** Number of units */
	quantity: number
	/** Price per unit in dollars (not cents) */
	unitPrice: number
	/** Total price for this line (quantity × unitPrice) in dollars */
	total: number
}

/**
 * Represents a company/customer that can receive a quote.
 */
interface Company {
	/** Unique company identifier */
	id: string
	/** Company display name */
	name: string
}

/**
 * Represents a deal that can be linked to a quote.
 */
interface Deal {
	/** Unique deal identifier */
	id: string
	/** Deal display name */
	name: string
}

/**
 * Represents a customer's existing product subscription.
 * Used to filter out products the customer already has.
 */
interface CustomerSubscription {
	/** Subscription ID */
	id: string
	/** Product ID for this subscription */
	productId: string | null
	/** Product name for display */
	productName: string | null
	/** Subscription status (active, trial, etc.) */
	status: string
}

/**
 * Props for the CreateQuoteDialog component.
 */
interface CreateQuoteDialogProps {
	/** Whether the dialog is currently visible */
	open: boolean
	/** Callback to control the dialog's open state */
	onOpenChange: (open: boolean) => void
	/** Callback invoked after successful quote creation */
	onQuoteCreated?: () => void
	/** Pre-select a company by ID when dialog opens */
	preSelectedCompanyId?: string | null
	/** Pre-select a deal by ID when dialog opens */
	preSelectedDealId?: string | null
}

/**
 * CreateQuoteDialog provides a multi-step form for creating new quotes.
 *
 * Features:
 * - Searchable company selection via Combobox
 * - Optional deal linking
 * - Dynamic line items with product/plan dropdowns
 * - Automatic price calculation from selected plans
 * - Products already subscribed by customer are filtered out
 * - Validity date selection (defaults to 30 days from today)
 * - Tax amount input
 * - Notes field
 * - Real-time subtotal/tax/total calculation
 *
 * The dialog loads companies, deals, and products asynchronously when opened.
 * When a company is selected, their existing subscriptions are loaded to
 * prevent quoting products they already have.
 *
 * @param props - Component props
 * @returns Dialog component with quote creation form
 *
 * @example
 * <CreateQuoteDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onQuoteCreated={() => refetchQuotes()}
 *   preSelectedCompanyId="company-123"
 * />
 */
export function CreateQuoteDialog({
	open,
	onOpenChange,
	onQuoteCreated,
	preSelectedCompanyId,
	preSelectedDealId,
}: CreateQuoteDialogProps) {
	const params = useParams({ strict: false }) as { tenant?: string }
	const tenant = params.tenant || ''
	const validUntilId = useId()
	const taxId = useId()
	const notesId = useId()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lineItems, setLineItems] = useState<LineItem[]>([
		{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0 },
	])
	const [tax, setTax] = useState<number>(0) // in dollars
	const [notes, setNotes] = useState('')
	const [validUntil, setValidUntil] = useState(
		new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
	)

	// Company selection
	const [companies, setCompanies] = useState<Company[]>([])
	const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
		preSelectedCompanyId || ''
	)
	const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)
	const [customerSubscriptions, setCustomerSubscriptions] = useState<CustomerSubscription[]>([])

	// Deal selection
	const [deals, setDeals] = useState<Deal[]>([])
	const [selectedDealId, setSelectedDealId] = useState<string | undefined>(preSelectedDealId || undefined)
	const [isLoadingDeals, setIsLoadingDeals] = useState(false)

	// Products and plans (for all line items)
	const [products, setProducts] = useState<Product[]>([])
	const [plans, setPlans] = useState<ProductTier[]>([])
	const [isLoadingProducts, setIsLoadingProducts] = useState(false)

	// Load companies
	useEffect(() => {
		if (!open || !tenant) return

		const loadCompanies = async () => {
			setIsLoadingCompanies(true)
			try {
				const response = await fetch(`/api/tenant/${tenant}/crm/customers`)
				if (response.ok) {
					const data = await response.json()
					setCompanies(data.customers || [])
					// Set pre-selected company only if provided and not already set
					if (preSelectedCompanyId) {
						setSelectedCompanyId(preSelectedCompanyId)
					}
				}
			} catch (err) {
				console.error('Failed to load companies:', err)
			} finally {
				setIsLoadingCompanies(false)
			}
		}

		loadCompanies()
	}, [open, tenant, preSelectedCompanyId])

	// Load customer subscriptions when company is selected
	useEffect(() => {
		if (!selectedCompanyId || !tenant) {
			setCustomerSubscriptions([])
			return
		}

		const loadSubscriptions = async () => {
			try {
				const response = await fetch(`/api/tenant/${tenant}/crm/customers/${selectedCompanyId}`)
				if (response.ok) {
					const data = await response.json()
					const subs = (data.subscriptions || [])
						.filter((s: any) => s.status === 'active' || s.status === 'trial')
						.map((s: any) => ({
							id: s.id,
							productId: s.productId,
							productName: s.productName,
							status: s.status,
						}))
					setCustomerSubscriptions(subs)
				}
			} catch (err) {
				console.error('Failed to load customer subscriptions:', err)
			}
		}

		loadSubscriptions()
	}, [selectedCompanyId, tenant])

	// Load deals
	useEffect(() => {
		if (!open || !tenant) return

		const loadDeals = async () => {
			setIsLoadingDeals(true)
			try {
				const response = await fetch(`/api/tenant/${tenant}/deals`)
				if (response.ok) {
					const data = await response.json()
					setDeals(data.deals || [])
					// Set pre-selected deal only if provided and not already set
					if (preSelectedDealId) {
						setSelectedDealId(preSelectedDealId)
					}
				}
			} catch (err) {
				console.error('Failed to load deals:', err)
			} finally {
				setIsLoadingDeals(false)
			}
		}

		loadDeals()
	}, [open, tenant, preSelectedDealId])

	// Load products and plans
	useEffect(() => {
		if (!open || !tenant) return

		const loadProducts = async () => {
			setIsLoadingProducts(true)
			try {
				const productsData = await fetchProducts(tenant, { status: 'active' })
				setProducts(productsData)

				const plansData = await fetchPlans(tenant, { status: 'active' })
				setPlans(plansData)
			} catch (err) {
				console.error('Failed to load products:', err)
			} finally {
				setIsLoadingProducts(false)
			}
		}

		loadProducts()
	}, [open, tenant])

	// Convert companies to combobox options
	const companyOptions = useMemo(() => {
		return companies.map((company) => ({
			value: company.id,
			label: company.name,
		}))
	}, [companies])

	// Get available products for a specific line item (excluding already subscribed and already added)
	const getAvailableProductsForLine = (lineItemId: string) => {
		const subscribedProductIds = customerSubscriptions.map((s) => s.productId).filter(Boolean)
		const usedProductIds = lineItems
			.filter((item) => item.id !== lineItemId && item.productId)
			.map((item) => item.productId)

		return products.filter(
			(product) => !subscribedProductIds.includes(product.id) && !usedProductIds.includes(product.id)
		)
	}

	// Get available plans for a product in a specific line item
	const getAvailablePlansForProduct = (productId: string) => {
		return plans.filter((plan) => plan.productId === productId)
	}

	// Calculate totals
	const subtotal = useMemo(() => {
		return lineItems.reduce((sum, item) => sum + item.total, 0)
	}, [lineItems])

	const total = useMemo(() => {
		return subtotal + tax
	}, [subtotal, tax])

	const resetForm = () => {
		setLineItems([
			{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0 },
		])
		setTax(0)
		setNotes('')
		setValidUntil(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
		setSelectedCompanyId(preSelectedCompanyId || '')
		setSelectedDealId(preSelectedDealId || undefined)
		setCustomerSubscriptions([])
		setError(null)
	}

	const handleDialogClose = (isOpen: boolean) => {
		if (!isOpen) {
			resetForm()
		}
		onOpenChange(isOpen)
	}

	const addLineItem = () => {
		setLineItems([
			...lineItems,
			{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0 },
		])
	}

	const removeLineItem = (id: string) => {
		if (lineItems.length > 1) {
			setLineItems(lineItems.filter((item) => item.id !== id))
		}
	}

	const updateLineItem = (
		id: string,
		field: keyof Omit<LineItem, 'id'>,
		value: string | number
	) => {
		const updated = lineItems.map((item) => {
			if (item.id !== id) return item

			const updatedItem = { ...item, [field]: value }

			// Recalculate total for this line item
			if (field === 'quantity' || field === 'unitPrice') {
				const qty = field === 'quantity' ? Number(value) : updatedItem.quantity
				const price = field === 'unitPrice' ? Number(value) : updatedItem.unitPrice
				updatedItem.total = qty * price
			}

			return updatedItem
		})

		setLineItems(updated)
	}

	const handleLineItemProductChange = (lineItemId: string, productId: string) => {
		const updated = lineItems.map((item) => {
			if (item.id !== lineItemId) return item

			const product = products.find((p) => p.id === productId)
			return {
				...item,
				productId,
				planId: undefined,
				description: product?.name || '',
				unitPrice: 0,
				total: 0,
			}
		})

		setLineItems(updated)
	}

	const handleLineItemPlanChange = (lineItemId: string, planId: string) => {
		const updated = lineItems.map((item) => {
			if (item.id !== lineItemId) return item

			const plan = plans.find((p) => p.id === planId)
			const unitPrice = plan?.basePrice?.amount || 0

			return {
				...item,
				planId,
				description: plan?.name || '',
				unitPrice,
				total: item.quantity * unitPrice,
			}
		})

		setLineItems(updated)
	}

	const canSubmit = useMemo(() => {
		// Must have selected company and at least one line item with product and plan
		const hasValidLineItem = lineItems.some((item) => item.productId && item.planId)
		return selectedCompanyId && hasValidLineItem && !isSubmitting
	}, [lineItems, selectedCompanyId, isSubmitting])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		e.stopPropagation()

		// Validation
		if (!tenant) {
			setError('Tenant is required')
			return
		}

		if (!selectedCompanyId) {
			setError('Please select a company')
			return
		}

		const validLineItems = lineItems.filter((item) => item.description.trim() !== '')
		if (validLineItems.length === 0) {
			setError('At least one line item with a description is required')
			return
		}

		setIsSubmitting(true)
		setError(null)

		try {
			// Convert dollars to cents for API
			const lineItemsInCents = validLineItems.map((item) => ({
				description: item.description.trim(),
				quantity: item.quantity,
				unitPrice: Math.round(item.unitPrice * 100),
				total: Math.round(item.total * 100),
			}))

			const quoteData: CreateQuoteInput = {
				tenantOrganizationId: selectedCompanyId,
				lineItems: lineItemsInCents,
				tax: Math.round(tax * 100), // Convert to cents
				validUntil,
				notes: notes.trim() || undefined,
			}

			if (selectedDealId) {
				quoteData.dealId = selectedDealId
			}

			const result = await createQuote(tenant, quoteData)

			if (!result.success) {
				throw new Error(result.error || 'Failed to create quote')
			}

			// Success - add small delay to ensure any portal cleanup completes
			resetForm()
			onQuoteCreated?.()
			// Use setTimeout to avoid race conditions with dialog/select portal cleanup
			setTimeout(() => {
				onOpenChange(false)
			}, 100)
		} catch (err) {
			console.error('Error creating quote:', err)
			setError(err instanceof Error ? err.message : 'Failed to create quote')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleDialogClose}>
			<DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-xl flex items-center gap-2">
						<FileText className="w-5 h-5 text-indigo-500" />
						Create Quote
					</DialogTitle>
					<DialogDescription>
						Create a pricing proposal for a customer
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Company Selection */}
					<div className="space-y-2">
						<Label htmlFor="company">Company *</Label>
						{isLoadingCompanies ? (
							<div className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
								Loading companies...
							</div>
						) : (
							<Combobox
								id="company"
								options={companyOptions}
								value={selectedCompanyId}
								onValueChange={setSelectedCompanyId}
								placeholder="Select a company"
								searchPlaceholder="Type to search companies..."
								emptyText="No companies found"
								required
							/>
						)}
					</div>

					{/* Deal Selection (Optional) */}
					<div className="space-y-2">
						<Label htmlFor="deal">Deal (Optional)</Label>
						<Select 
							value={selectedDealId} 
							onValueChange={(value) => setSelectedDealId(value)}
						>
							<SelectTrigger id="deal">
								<SelectValue placeholder="Link to a deal (optional)" />
							</SelectTrigger>
							<SelectContent>
								{isLoadingDeals ? (
									<SelectItem value="loading" disabled>
										Loading...
									</SelectItem>
								) : (
									deals.map((deal) => (
										<SelectItem key={deal.id} value={deal.id}>
											{deal.name}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
						{selectedDealId && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setSelectedDealId(undefined)}
								className="h-6 text-xs"
							>
								Clear selection
							</Button>
						)}
					</div>

					{/* Validity Date */}
					<div className="space-y-2">
						<Label htmlFor={validUntilId}>Valid Until</Label>
						<Input
							id={validUntilId}
							type="date"
							value={validUntil}
							onChange={(e) => setValidUntil(e.target.value)}
						/>
					</div>

					{/* Line Items */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label className="text-base font-semibold">Line Items</Label>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={addLineItem}
								className="h-8"
							>
								<Plus className="h-4 w-4 mr-1" />
								Add Line
							</Button>
						</div>

						<div className="space-y-3">
							{lineItems.map((item, index) => {
								const availableProducts = getAvailableProductsForLine(item.id)
								const availablePlans = item.productId ? getAvailablePlansForProduct(item.productId) : []

								return (
									<div
										key={item.id}
										className="p-4 border rounded-lg space-y-3 bg-muted/30"
									>
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1 space-y-3">
												{/* Product Selection */}
												<div className="space-y-2">
													<Label htmlFor={`product-${index}`} className="text-xs">
														Product *
													</Label>
													<Select
														value={item.productId}
														onValueChange={(value) => handleLineItemProductChange(item.id, value)}
														disabled={!selectedCompanyId || isLoadingProducts}
													>
														<SelectTrigger id={`product-${index}`}>
															<SelectValue placeholder={!selectedCompanyId ? "Select a company first" : "Select a product"} />
														</SelectTrigger>
														<SelectContent>
															{availableProducts.length === 0 ? (
																<SelectItem value="no-products" disabled>
																	No available products
																</SelectItem>
															) : (
																availableProducts.map((product) => (
																	<SelectItem key={product.id} value={product.id}>
																		{product.name}
																	</SelectItem>
																))
															)}
														</SelectContent>
													</Select>
												</div>

												{/* Plan Selection */}
												<div className="space-y-2">
													<Label htmlFor={`plan-${index}`} className="text-xs">
														Plan *
													</Label>
													<Select
														value={item.planId}
														onValueChange={(value) => handleLineItemPlanChange(item.id, value)}
														disabled={!item.productId}
													>
														<SelectTrigger id={`plan-${index}`}>
															<SelectValue placeholder={!item.productId ? "Select a product first" : "Select a plan"} />
														</SelectTrigger>
														<SelectContent>
															{availablePlans.length === 0 ? (
																<SelectItem value="no-plans" disabled>
																	No plans available
																</SelectItem>
															) : (
																availablePlans.map((plan) => (
																	<SelectItem key={plan.id} value={plan.id}>
																		{plan.name}
																	</SelectItem>
																))
															)}
														</SelectContent>
													</Select>
												</div>
											</div>
											{lineItems.length > 1 && (
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => removeLineItem(item.id)}
													className="h-8 w-8 p-0 mt-6"
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											)}
										</div>

										<div className="grid grid-cols-3 gap-3">
										<div className="space-y-2">
											<Label htmlFor={`quantity-${index}`} className="text-xs">
												Quantity
											</Label>
											<Input
												id={`quantity-${index}`}
												type="number"
												min="1"
												step="1"
												value={item.quantity}
												onChange={(e) =>
													updateLineItem(item.id, 'quantity', Number(e.target.value))
												}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor={`unitPrice-${index}`} className="text-xs">
												Unit Price ($)
											</Label>
											<Input
												id={`unitPrice-${index}`}
												type="number"
												min="0"
												step="0.01"
												value={item.unitPrice}
												onChange={(e) =>
													updateLineItem(item.id, 'unitPrice', Number(e.target.value))
												}
											/>
										</div>
										<div className="space-y-2">
											<Label className="text-xs">Total</Label>
											<div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center justify-end font-medium">
												${item.total.toFixed(2)}
											</div>
										</div>
									</div>
								</div>
							)})}
						</div>
					</div>

					{/* Tax */}
					<div className="space-y-2">
						<Label htmlFor={taxId}>Tax Amount ($)</Label>
						<Input
							id={taxId}
							type="number"
							min="0"
							step="0.01"
							value={tax}
							onChange={(e) => setTax(Number(e.target.value))}
							placeholder="0.00"
						/>
					</div>

					{/* Totals Summary */}
					<div className="bg-muted/50 rounded-lg p-4 space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Subtotal:</span>
							<span className="font-medium">${subtotal.toFixed(2)}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Tax:</span>
							<span className="font-medium">${tax.toFixed(2)}</span>
						</div>
						<div className="flex justify-between text-lg font-bold pt-2 border-t">
							<span>Total:</span>
							<span>${total.toFixed(2)}</span>
						</div>
					</div>

					{/* Notes */}
					<div className="space-y-2">
						<Label htmlFor={notesId}>Notes (Optional)</Label>
						<Textarea
							id={notesId}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Internal notes about this quote..."
							rows={3}
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleDialogClose(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!canSubmit}>
							{isSubmitting ? (
								<>
									<span className="animate-spin mr-2">⏳</span>
									Creating...
								</>
							) : (
								'Create Quote'
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

