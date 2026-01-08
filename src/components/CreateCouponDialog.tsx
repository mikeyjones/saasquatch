import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { Tag, RefreshCw } from "lucide-react";

import { useAppForm } from "@/hooks/demo.form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

// Schema removed - validation is handled in onSubmit

interface ProductPlan {
	id: string;
	name: string;
	status: string;
}

interface CouponData {
	id: string;
	code: string;
	discountType: string;
	discountValue: number;
	applicablePlanIds?: string[] | null;
	maxRedemptions?: number | null;
	expiresAt?: string | null;
}

interface CreateCouponDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCouponCreated?: () => void;
	couponId?: string | null;
	coupon?: CouponData | null;
}

export function CreateCouponDialog({
	open,
	onOpenChange,
	onCouponCreated,
	couponId,
	coupon: initialCoupon,
}: CreateCouponDialogProps) {
	const params = useParams({ strict: false }) as { tenant?: string };
	const tenant = params.tenant || "";
	const isEditMode = !!couponId;

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [plans, setPlans] = useState<ProductPlan[]>([]);
	const [isLoadingPlans, setIsLoadingPlans] = useState(false);
	const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
	const [loadedCoupon, setLoadedCoupon] = useState<CouponData | null>(null);

	// Fetch coupon data when in edit mode
	useEffect(() => {
		if (!open || !tenant || !isEditMode || !couponId) {
			setLoadedCoupon(null);
			return;
		}

		const loadCoupon = async () => {
			try {
				const response = await fetch(
					`/api/tenant/${tenant}/coupons/${couponId}`,
				);
				if (response.ok) {
					const data = await response.json();
					setLoadedCoupon(data.coupon);
					setSelectedPlans(data.coupon.applicablePlanIds || []);
				}
			} catch (err) {
				console.error("Failed to load coupon:", err);
				setError("Failed to load coupon data");
			}
		};

		loadCoupon();
	}, [open, tenant, isEditMode, couponId]);

	// Fetch available plans when dialog opens
	useEffect(() => {
		if (!open || !tenant) return;

		const loadPlans = async () => {
			setIsLoadingPlans(true);
			try {
				const response = await fetch(
					`/api/tenant/${tenant}/product-catalog/plans`,
				);
				if (response.ok) {
					const data = await response.json();
					setPlans(data.plans || []);
				}
			} catch (err) {
				console.error("Failed to load plans:", err);
			} finally {
				setIsLoadingPlans(false);
			}
		};

		loadPlans();
	}, [open, tenant]);

	// Determine coupon data to display
	const couponData = loadedCoupon || initialCoupon;

	const form = useAppForm({
		defaultValues: {
			code: "",
			discountType: "percentage" as
				| "percentage"
				| "fixed_amount"
				| "free_months"
				| "trial_extension",
			discountValue: 0,
			maxRedemptions: undefined as number | undefined,
			expiresAt: "",
		},
		onSubmit: async ({ value }) => {
			setIsSubmitting(true);
			setError(null);

			try {
				console.log("Form submission - values:", value);
				console.log(
					"discountType:",
					value.discountType,
					"type:",
					typeof value.discountType,
				);
				console.log(
					"discountValue:",
					value.discountValue,
					"type:",
					typeof value.discountValue,
				);

				// Validate discount value
				if (
					value.discountValue === undefined ||
					value.discountValue === null ||
					value.discountValue === 0
				) {
					setError("Discount value is required and must be greater than 0");
					setIsSubmitting(false);
					return;
				}

				// Additional validation for percentage type
				if (
					value.discountType === "percentage" &&
					(value.discountValue < 0 || value.discountValue > 100)
				) {
					setError("Percentage discount must be between 0 and 100");
					setIsSubmitting(false);
					return;
				}

				const requestBody: Record<string, unknown> = {
					code: value.code?.trim() || undefined,
					discountType: value.discountType,
					discountValue: value.discountValue,
					applicablePlanIds: selectedPlans.length > 0 ? selectedPlans : null,
					maxRedemptions: value.maxRedemptions || null,
					expiresAt: value.expiresAt?.trim() || null,
				};

				// Remove undefined values
				Object.keys(requestBody).forEach((key) => {
					if (requestBody[key] === undefined) {
						delete requestBody[key];
					}
				});

				if (isEditMode && couponId) {
					// Update existing coupon
					const response = await fetch(
						`/api/tenant/${tenant}/coupons/${couponId}`,
						{
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(requestBody),
						},
					);

					if (!response.ok) {
						let errorMessage = "Failed to update coupon";
						try {
							const data = await response.json();
							errorMessage = data.error || errorMessage;
						} catch {
							// If response isn't JSON, use status text
							errorMessage = response.statusText || errorMessage;
						}
						throw new Error(errorMessage);
					}

					await response.json();

					onOpenChange(false);
					onCouponCreated?.();
				} else {
					// Create new coupon
					const response = await fetch(`/api/tenant/${tenant}/coupons`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(requestBody),
					});

					if (!response.ok) {
						let errorMessage = "Failed to create coupon";
						try {
							const data = await response.json();
							errorMessage = data.error || errorMessage;
						} catch {
							// If response isn't JSON, use status text
							errorMessage =
								response.statusText || `Server returned ${response.status}`;
						}
						throw new Error(errorMessage);
					}

					await response.json();

					// Reset form and close dialog
					form.reset();
					setSelectedPlans([]);
					onOpenChange(false);
					onCouponCreated?.();
				}
			} catch (err) {
				console.error(
					`Error ${isEditMode ? "updating" : "creating"} coupon:`,
					err,
				);
				setError(
					err instanceof Error
						? err.message
						: `Failed to ${isEditMode ? "update" : "create"} coupon`,
				);
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	// Update form when coupon data is loaded
	useEffect(() => {
		if (couponData && isEditMode && form) {
			form.setFieldValue("code", couponData.code || "");
			form.setFieldValue(
				"discountType",
				couponData.discountType as
					| "percentage"
					| "fixed_amount"
					| "free_months"
					| "trial_extension",
			);
			form.setFieldValue("discountValue", couponData.discountValue);
			form.setFieldValue(
				"maxRedemptions",
				couponData.maxRedemptions || undefined,
			);
			form.setFieldValue("expiresAt", couponData.expiresAt || "");
		}
	}, [couponData, isEditMode, form]);

	// Reset form when dialog closes
	useEffect(() => {
		if (!open) {
			form.reset();
			setSelectedPlans([]);
			setError(null);
			setLoadedCoupon(null);
		}
	}, [open, form]);

	const togglePlanSelection = (planId: string) => {
		setSelectedPlans((prev) =>
			prev.includes(planId)
				? prev.filter((id) => id !== planId)
				: [...prev, planId],
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Tag className="h-5 w-5" />
						{isEditMode ? "Edit Coupon" : "Create Coupon"}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? "Update the coupon details below"
							: "Create a new discount coupon for your products"}
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					{error && (
						<div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm font-medium border border-destructive/20 sticky top-0 z-10">
							<div className="flex items-start gap-2">
								<span className="font-bold">Error:</span>
								<span>{error}</span>
							</div>
						</div>
					)}

					{/* Coupon Code */}
					<form.AppField name="code">
						{(field) => (
							<field.TextField
								label="Coupon Code (Optional)"
								placeholder="Leave empty to auto-generate"
								disabled={isEditMode}
								helperText={
									isEditMode
										? "Code cannot be changed after creation"
										: "Auto-generated if left empty"
								}
							/>
						)}
					</form.AppField>

					{/* Discount Type */}
					<form.AppField name="discountType">
						{(field) => (
							<field.Select
								label="Discount Type"
								values={[
									{ label: "Percentage Off", value: "percentage" },
									{ label: "Fixed Amount Off", value: "fixed_amount" },
									{ label: "Free Months", value: "free_months" },
									{ label: "Trial Extension", value: "trial_extension" },
								]}
								placeholder="Select discount type..."
							/>
						)}
					</form.AppField>

					{/* Discount Value */}
					<form.Subscribe selector={(state) => state.values.discountType}>
						{(discountType) => (
							<form.AppField name="discountValue">
								{(field) => (
									<field.NumberField
										label="Discount Value"
										placeholder={
											discountType === "percentage"
												? "0-100"
												: discountType === "fixed_amount"
													? "Amount in cents (e.g., 1000 = $10)"
													: "Number of months/days"
										}
										min={0}
										max={discountType === "percentage" ? 100 : undefined}
										helperText={
											discountType === "percentage"
												? "Enter a percentage between 0 and 100"
												: discountType === "fixed_amount"
													? "Amount in cents (e.g., 1000 = $10.00)"
													: discountType === "free_months"
														? "Number of free months to add"
														: "Number of days to extend trial"
										}
									/>
								)}
							</form.AppField>
						)}
					</form.Subscribe>

					{/* Applicable Plans */}
					<div className="space-y-2">
						<Label className="text-sm font-medium text-gray-700">
							Applicable Plans
						</Label>
						{isLoadingPlans ? (
							<div className="flex items-center gap-2 text-gray-500 text-sm py-2">
								<RefreshCw size={14} className="animate-spin" />
								Loading plans...
							</div>
						) : plans.length === 0 ? (
							<div className="text-sm text-gray-500 py-2">
								No plans available
							</div>
						) : (
							<div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={selectedPlans.length === 0}
										onChange={() => setSelectedPlans([])}
										className="rounded border-gray-300"
									/>
									<span className="font-medium">All Plans</span>
								</label>
								{plans.map((plan) => (
									<label
										key={plan.id}
										className="flex items-center gap-2 text-sm"
									>
										<input
											type="checkbox"
											checked={selectedPlans.includes(plan.id)}
											onChange={() => togglePlanSelection(plan.id)}
											className="rounded border-gray-300"
										/>
										<span>{plan.name}</span>
										{plan.status !== "active" && (
											<span className="text-xs text-gray-500">
												({plan.status})
											</span>
										)}
									</label>
								))}
							</div>
						)}
						<p className="text-xs text-gray-500">
							Select specific plans or leave empty to apply to all plans
						</p>
					</div>

					{/* Max Redemptions */}
					<form.AppField name="maxRedemptions">
						{(field) => (
							<field.NumberField
								label="Max Redemptions (Optional)"
								placeholder="Leave empty for unlimited"
								min={1}
								helperText="Maximum number of times this coupon can be used"
							/>
						)}
					</form.AppField>

					{/* Expiration Date */}
					<form.AppField name="expiresAt">
						{(field) => (
							<field.TextField
								label="Expiration Date (Optional)"
								type="datetime-local"
								helperText="Leave empty for no expiration"
							/>
						)}
					</form.AppField>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
									{isEditMode ? "Updating..." : "Creating..."}
								</>
							) : isEditMode ? (
								"Update Coupon"
							) : (
								"Create Coupon"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
