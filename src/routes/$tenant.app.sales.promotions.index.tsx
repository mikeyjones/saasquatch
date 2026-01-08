import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CouponTable } from "@/components/CouponTable";
import { CreateCouponDialog } from "@/components/CreateCouponDialog";

export const Route = createFileRoute("/$tenant/app/sales/promotions/")({
	component: PromotionsPage,
});

interface Coupon {
	id: string;
	code: string;
	discountType: string;
	discountValue: number;
	applicablePlanIds: string[] | null;
	maxRedemptions: number | null;
	redemptionCount: number;
	status: string;
	actualStatus: string;
	expiresAt: string | null;
	createdAt: string;
}

interface PromotionsApiResponse {
	coupons: Coupon[];
	error?: string;
}

function PromotionsPage() {
	const params = useParams({ strict: false }) as { tenant?: string };
	const tenant = params.tenant || "";

	const [coupons, setCoupons] = useState<Coupon[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("all");

	// Fetch coupons from API
	const fetchCoupons = useCallback(async () => {
		if (!tenant) return;

		setIsLoading(true);
		setError(null);

		try {
			const queryParams = new URLSearchParams();
			if (statusFilter && statusFilter !== "all") {
				queryParams.set("status", statusFilter);
			}

			const response = await fetch(
				`/api/tenant/${tenant}/coupons?${queryParams.toString()}`,
			);

			if (!response.ok) {
				throw new Error("Failed to fetch coupons");
			}

			const data: PromotionsApiResponse = await response.json();

			if (data.error) {
				throw new Error(data.error);
			}

			setCoupons(data.coupons || []);
		} catch (err) {
			console.error("Error fetching coupons:", err);
			setError(err instanceof Error ? err.message : "Failed to load coupons");
		} finally {
			setIsLoading(false);
		}
	}, [tenant, statusFilter]);

	// Fetch coupons on mount and when filter changes
	useEffect(() => {
		fetchCoupons();
	}, [fetchCoupons]);

	const handleEdit = (coupon: Coupon) => {
		setEditingCoupon(coupon);
		setIsCreateDialogOpen(true);
	};

	const handleDelete = async (couponId: string) => {
		if (!confirm("Are you sure you want to disable this coupon?")) return;

		try {
			const response = await fetch(
				`/api/tenant/${tenant}/coupons/${couponId}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				throw new Error("Failed to disable coupon");
			}

			// Refresh coupons list
			fetchCoupons();
		} catch (err) {
			console.error("Error disabling coupon:", err);
			alert("Failed to disable coupon");
		}
	};

	const handleCouponCreated = () => {
		setIsCreateDialogOpen(false);
		setEditingCoupon(null);
		fetchCoupons();
	};

	const handleDialogClose = () => {
		setIsCreateDialogOpen(false);
		setEditingCoupon(null);
	};

	// Calculate statistics
	const stats = {
		total: coupons.length,
		active: coupons.filter((c) => c.actualStatus === "active").length,
		expired: coupons.filter((c) => c.actualStatus === "expired").length,
		disabled: coupons.filter((c) => c.actualStatus === "disabled").length,
	};

	return (
		<div className="container mx-auto p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<Tag className="h-8 w-8" />
						Promotions
					</h1>
					<p className="text-muted-foreground mt-1">
						Manage discount coupons for your products and services
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Button
						variant="outline"
						size="sm"
						onClick={fetchCoupons}
						disabled={isLoading}
					>
						<RefreshCw
							className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
						/>
						Refresh
					</Button>
					<Button onClick={() => setIsCreateDialogOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Create Coupon
					</Button>
				</div>
			</div>

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-card rounded-lg border p-4">
					<div className="text-sm font-medium text-muted-foreground">
						Total Coupons
					</div>
					<div className="text-2xl font-bold mt-1">{stats.total}</div>
				</div>
				<div className="bg-card rounded-lg border p-4">
					<div className="text-sm font-medium text-muted-foreground">
						Active
					</div>
					<div className="text-2xl font-bold mt-1 text-green-600">
						{stats.active}
					</div>
				</div>
				<div className="bg-card rounded-lg border p-4">
					<div className="text-sm font-medium text-muted-foreground">
						Expired
					</div>
					<div className="text-2xl font-bold mt-1 text-yellow-600">
						{stats.expired}
					</div>
				</div>
				<div className="bg-card rounded-lg border p-4">
					<div className="text-sm font-medium text-muted-foreground">
						Disabled
					</div>
					<div className="text-2xl font-bold mt-1 text-gray-600">
						{stats.disabled}
					</div>
				</div>
			</div>

			{/* Filter Tabs */}
			<div className="border-b">
				<nav className="flex space-x-8">
					{["all", "active", "expired", "disabled"].map((status) => (
						<button
							key={status}
							type="button"
							onClick={() => setStatusFilter(status)}
							className={`py-4 px-1 border-b-2 font-medium text-sm ${
								statusFilter === status
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
							}`}
						>
							{status.charAt(0).toUpperCase() + status.slice(1)}
							{status === "all" && ` (${stats.total})`}
							{status === "active" && ` (${stats.active})`}
							{status === "expired" && ` (${stats.expired})`}
							{status === "disabled" && ` (${stats.disabled})`}
						</button>
					))}
				</nav>
			</div>

			{/* Coupons Table */}
			{error && (
				<div className="bg-destructive/10 text-destructive rounded-lg p-4">
					{error}
				</div>
			)}

			{isLoading ? (
				<div className="flex items-center justify-center h-64">
					<RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : coupons.length === 0 ? (
				<div className="bg-card rounded-lg border p-12 text-center">
					<Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
					<h3 className="text-lg font-medium mb-2">No coupons yet</h3>
					<p className="text-muted-foreground mb-4">
						Create your first coupon to start offering discounts
					</p>
					<Button onClick={() => setIsCreateDialogOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Create Coupon
					</Button>
				</div>
			) : (
				<CouponTable
					coupons={coupons}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>
			)}

			{/* Create/Edit Coupon Dialog */}
			<CreateCouponDialog
				open={isCreateDialogOpen}
				onOpenChange={handleDialogClose}
				onCouponCreated={handleCouponCreated}
				couponId={editingCoupon?.id || null}
				coupon={editingCoupon}
			/>
		</div>
	);
}
