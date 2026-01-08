import { useState, useMemo, useId } from "react";
import { useParams } from "@tanstack/react-router";
import { FileText, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface LineItem {
	id: string;
	description: string;
	quantity: number;
	unitPrice: number; // in dollars
	total: number; // in dollars
}

interface CreateStandaloneInvoiceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onInvoiceCreated?: () => void;
	customerId: string;
	customerName: string;
}

export function CreateStandaloneInvoiceDialog({
	open,
	onOpenChange,
	onInvoiceCreated,
	customerId,
	customerName,
}: CreateStandaloneInvoiceDialogProps) {
	const params = useParams({ strict: false }) as { tenant?: string };
	const tenant = params.tenant || "";
	const issueDateId = useId();
	const dueDateId = useId();
	const taxId = useId();
	const notesId = useId();

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lineItems, setLineItems] = useState<LineItem[]>([
		{
			id: crypto.randomUUID(),
			description: "",
			quantity: 1,
			unitPrice: 0,
			total: 0,
		},
	]);
	const [tax, setTax] = useState<number>(0); // in dollars
	const [notes, setNotes] = useState("");
	const [issueDate, setIssueDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [dueDate, setDueDate] = useState(
		new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
	);

	// Calculate totals
	const subtotal = useMemo(() => {
		return lineItems.reduce((sum, item) => sum + item.total, 0);
	}, [lineItems]);

	const total = useMemo(() => {
		return subtotal + tax;
	}, [subtotal, tax]);

	const resetForm = () => {
		setLineItems([
			{
				id: crypto.randomUUID(),
				description: "",
				quantity: 1,
				unitPrice: 0,
				total: 0,
			},
		]);
		setTax(0);
		setNotes("");
		setIssueDate(new Date().toISOString().split("T")[0]);
		setDueDate(
			new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0],
		);
		setError(null);
	};

	const handleDialogClose = (isOpen: boolean) => {
		if (!isOpen) {
			resetForm();
		}
		onOpenChange(isOpen);
	};

	const addLineItem = () => {
		setLineItems([
			...lineItems,
			{
				id: crypto.randomUUID(),
				description: "",
				quantity: 1,
				unitPrice: 0,
				total: 0,
			},
		]);
	};

	const removeLineItem = (id: string) => {
		if (lineItems.length > 1) {
			setLineItems(lineItems.filter((item) => item.id !== id));
		}
	};

	const updateLineItem = (
		id: string,
		field: keyof Omit<LineItem, "id">,
		value: string | number,
	) => {
		const updated = lineItems.map((item) => {
			if (item.id !== id) return item;

			const updatedItem = { ...item, [field]: value };

			// Recalculate total for this line item
			if (field === "quantity" || field === "unitPrice") {
				const qty = field === "quantity" ? Number(value) : updatedItem.quantity;
				const price =
					field === "unitPrice" ? Number(value) : updatedItem.unitPrice;
				updatedItem.total = qty * price;
			}

			return updatedItem;
		});

		setLineItems(updated);
	};

	const canSubmit = useMemo(() => {
		// Must have at least one line item with a description
		const hasValidLineItem = lineItems.some(
			(item) => item.description.trim() !== "",
		);
		return hasValidLineItem && !isSubmitting;
	}, [lineItems, isSubmitting]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		e.stopPropagation();

		// Validation
		if (!tenant) {
			setError("Tenant is required");
			return;
		}

		const validLineItems = lineItems.filter(
			(item) => item.description.trim() !== "",
		);
		if (validLineItems.length === 0) {
			setError("At least one line item with a description is required");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			// Convert dollars to cents for API
			const lineItemsInCents = validLineItems.map((item) => ({
				description: item.description.trim(),
				quantity: item.quantity,
				unitPrice: Math.round(item.unitPrice * 100),
				total: Math.round(item.total * 100),
			}));

			const requestBody = {
				tenantOrganizationId: customerId,
				lineItems: lineItemsInCents,
				tax: Math.round(tax * 100), // Convert to cents
				notes: notes.trim() || undefined,
				issueDate,
				dueDate,
			};

			const response = await fetch(`/api/tenant/${tenant}/invoices`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Failed to create invoice");
			}

			// Success
			resetForm();
			onInvoiceCreated?.();
			onOpenChange(false);
		} catch (err) {
			console.error("Error creating invoice:", err);
			setError(err instanceof Error ? err.message : "Failed to create invoice");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleDialogClose}>
			<DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-xl flex items-center gap-2">
						<FileText className="w-5 h-5 text-indigo-500" />
						Create Invoice
					</DialogTitle>
					<DialogDescription>
						Create a standalone invoice for {customerName}
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Dates */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor={issueDateId}>Issue Date</Label>
							<Input
								id={issueDateId}
								type="date"
								value={issueDate}
								onChange={(e) => setIssueDate(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={dueDateId}>Due Date</Label>
							<Input
								id={dueDateId}
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
								required
							/>
						</div>
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
											<Label
												htmlFor={`description-${index}`}
												className="text-xs"
											>
												Description
											</Label>
											<Input
												id={`description-${index}`}
												value={item.description}
												onChange={(e) =>
													updateLineItem(item.id, "description", e.target.value)
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
													updateLineItem(
														item.id,
														"quantity",
														Number(e.target.value),
													)
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
													updateLineItem(
														item.id,
														"unitPrice",
														Number(e.target.value),
													)
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
							placeholder="Internal notes about this invoice..."
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
								"Create Invoice"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
