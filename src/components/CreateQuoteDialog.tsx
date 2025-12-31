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
import { fetchPlans, fetchProducts, type Product } from '@/data/products'

interface LineItem {
	id: string
	description: string
	quantity: number
	unitPrice: number // in dollars
	total: number // in dollars
}

interface Company {
	id: string
	name: string
}

interface ProductPlan {
	id: string
	name: string
	description?: string
}

interface Deal {
	id: string
	name: string
}

/**
 * Props for the CreateQuoteDialog component.
 */
interface CreateQuoteDialogProps {
	/** Controls the open state of the dialog. */
	open: boolean
	/** Callback function to change the open state of the dialog. */
	onOpenChange: (open: boolean) => void
	/** Callback function to be called after a quote is successfully created. */
	onQuoteCreated?: () => void
	/** Optional ID of a company to pre-select in the dialog. */
	preSelectedCompanyId?: string | null
	/** Optional name of a company to pre-fill in the dialog. */
	preSelectedCompanyName?: string | null
	/** Optional ID of a deal to pre-select in the dialog. */
	preSelectedDealId?: string | null
}

/**
 * CreateQuoteDialog component provides a form for creating new quotes.
 * It allows selecting a company, optional deal and product plan, line items, validity date, and notes.
 * @param props The props for the CreateQuoteDialog component.
 */
export function CreateQuoteDialog({
	open,
	onOpenChange,
	onQuoteCreated,
	preSelectedCompanyId,
	preSelectedCompanyName,
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

	// Deal selection
	const [deals, setDeals] = useState<Deal[]>([])
	const [selectedDealId, setSelectedDealId] = useState<string | undefined>(preSelectedDealId || undefined)
	const [isLoadingDeals, setIsLoadingDeals] = useState(false)

	// Product selection
	const [products, setProducts] = useState<Product[]>([])
	const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined)
	const [isLoadingProducts, setIsLoadingProducts] = useState(false)

	// Product plan selection
	const [plans, setPlans] = useState<ProductPlan[]>([])
	const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined)
	const [isLoadingPlans, setIsLoadingPlans] = useState(false)

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
					if (preSelectedCompanyId && !selectedCompanyId) {
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
	}, [open, tenant, preSelectedCompanyId, selectedCompanyId])

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
					if (preSelectedDealId && !selectedDealId) {
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
	}, [open, tenant, preSelectedDealId, selectedDealId])

	// Load products (which include their plans)
	useEffect(() => {
		if (!open || !tenant) return

		const loadProducts = async () => {
			setIsLoadingProducts(true)
			try {
				const productsData = await fetchProducts(tenant, { status: 'active' })
				setProducts(productsData)

				// Also load all plans for backward compatibility
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

	// Clear selected plan when product changes
	useEffect(() => {
		setSelectedPlanId(undefined)
	}, [selectedProductId])

	// Auto-populate line items when plan is selected
	useEffect(() => {
		if (!selectedPlanId || lineItems.some((item) => item.description)) return

		const plan = plans.find((p) => p.id === selectedPlanId)
		if (plan) {
			setLineItems([
				{
					id: crypto.randomUUID(),
					description: plan.name,
					quantity: 1,
					unitPrice: 0, // Will need to fetch pricing separately
					total: 0,
				},
			])
		}
	}, [selectedPlanId, plans])

	// Convert companies to combobox options
	const companyOptions = useMemo(() => {
		return companies.map((company) => ({
			value: company.id,
			label: company.name,
		}))
	}, [companies])

	// Convert products to combobox options
	const productOptions = useMemo(() => {
		return products.map((product) => ({
			value: product.id,
			label: product.name,
		}))
	}, [products])

	// Filter plans based on selected product
	const filteredPlans = useMemo(() => {
		if (!selectedProductId) {
			return []
		}
		return plans.filter((plan) => plan.productId === selectedProductId)
	}, [plans, selectedProductId])

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
		setSelectedProductId(undefined)
		setSelectedPlanId(undefined)
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

	const canSubmit = useMemo(() => {
		// Must have selected company and at least one line item with a description
		const hasValidLineItem = lineItems.some((item) => item.description.trim() !== '')
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

			if (selectedPlanId) {
				quoteData.productPlanId = selectedPlanId
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

					{/* Product Selection (Optional) */}
					<div className="space-y-2">
						<Label htmlFor="product">Product (Optional)</Label>
						{isLoadingProducts ? (
							<div className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
								Loading products...
							</div>
						) : (
							<>
								<Combobox
									id="product"
									options={productOptions}
									value={selectedProductId}
									onValueChange={setSelectedProductId}
									placeholder="Select a product"
									searchPlaceholder="Type to search products..."
									emptyText="No products found"
								/>
								{selectedProductId && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => setSelectedProductId(undefined)}
										className="h-6 text-xs"
									>
										Clear selection
									</Button>
								)}
							</>
						)}
					</div>

					{/* Product Plan Selection (Optional) */}
					<div className="space-y-2">
						<Label htmlFor="plan">Product Plan (Optional)</Label>
						{!selectedProductId ? (
							<div className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
								Select a product first
							</div>
						) : (
							<>
								<Select
									value={selectedPlanId}
									onValueChange={(value) => setSelectedPlanId(value)}
									disabled={filteredPlans.length === 0}
								>
									<SelectTrigger id="plan">
										<SelectValue placeholder={filteredPlans.length === 0 ? "No plans available" : "Select a plan (optional)"} />
									</SelectTrigger>
									<SelectContent>
										{filteredPlans.map((plan) => (
											<SelectItem key={plan.id} value={plan.id}>
												{plan.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{selectedPlanId && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => setSelectedPlanId(undefined)}
										className="h-6 text-xs"
									>
										Clear selection
									</Button>
								)}
							</>
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
							{lineItems.map((item, index) => (
								<div
									key={item.id}
									className="p-4 border rounded-lg space-y-3 bg-muted/30"
								>
									<div className="flex items-start justify-between gap-2">
										<div className="flex-1 space-y-2">
											<Label htmlFor={`description-${index}`} className="text-xs">
												Description
											</Label>
											<Input
												id={`description-${index}`}
												value={item.description}
												onChange={(e) =>
													updateLineItem(item.id, 'description', e.target.value)
												}
												placeholder="e.g., Consulting Services"
												required={index === 0}
											/>
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
							))}
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

