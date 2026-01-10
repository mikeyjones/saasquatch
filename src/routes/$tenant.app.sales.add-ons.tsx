import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
	Plus,
	Loader2,
	Package,
	Pencil,
	Trash2,
	DollarSign,
	Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddOnDialog } from "@/components/AddOnDialog";
import { fetchAddOns, type AvailableAddOn } from "@/data/products";

export const Route = createFileRoute("/$tenant/app/sales/add-ons")({
	component: AddOnsPage,
});

function AddOnsPage() {
	const params = useParams({ strict: false }) as { tenant?: string };
	const tenant = params.tenant || "";

	const [addOns, setAddOns] = useState<AvailableAddOn[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Dialog state
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingAddOn, setEditingAddOn] = useState<AvailableAddOn | null>(null);

	// Delete confirmation state
	const [deletingAddOnId, setDeletingAddOnId] = useState<string | null>(null);

	// Load add-ons on mount
	useEffect(() => {
		if (!tenant) return;

		const loadAddOns = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const data = await fetchAddOns(tenant);
				setAddOns(data);
			} catch {
				setError("Failed to load add-ons");
			} finally {
				setIsLoading(false);
			}
		};

		loadAddOns();
	}, [tenant]);

	const handleCreateAddOn = () => {
		setEditingAddOn(null);
		setDialogOpen(true);
	};

	const handleEdit = (addOn: AvailableAddOn) => {
		setEditingAddOn(addOn);
		setDialogOpen(true);
	};

	const handleDelete = async (addOn: AvailableAddOn) => {
		if (
			!confirm(
				`Are you sure you want to delete "${addOn.name}"? This action cannot be undone.`,
			)
		) {
			return;
		}

		setDeletingAddOnId(addOn.id);
		try {
			const response = await fetch(
				`/${tenant}/api/product-catalog/add-ons?id=${addOn.id}`,
				{
					method: "DELETE",
					credentials: "include",
				},
			);

			const data = await response.json();

			if (response.ok) {
				setAddOns(addOns.filter((a) => a.id !== addOn.id));
			} else {
				alert(data.error || "Failed to delete add-on");
			}
		} finally {
			setDeletingAddOnId(null);
		}
	};

	const handleSaved = async () => {
		// Reload add-ons after create/update
		const data = await fetchAddOns(tenant);
		setAddOns(data);
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "active":
				return (
					<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
						Active
					</span>
				);
			case "draft":
				return (
					<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
						Draft
					</span>
				);
			case "archived":
				return (
					<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
						Archived
					</span>
				);
			default:
				return null;
		}
	};

	const getPricingModelBadge = (model: string) => {
		switch (model) {
			case "flat":
				return (
					<span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
						<DollarSign size={10} />
						Flat
					</span>
				);
			case "seat":
				return (
					<span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700">
						<Package size={10} />
						Per Seat
					</span>
				);
			case "usage":
				return (
					<span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700">
						<Zap size={10} />
						Usage
					</span>
				);
			default:
				return null;
		}
	};

	return (
		<main className="flex-1 overflow-auto p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Package className="w-7 h-7 text-indigo-500" />
						Add-Ons
					</h1>
					<p className="text-gray-500 mt-1">
						Manage add-ons that can be attached to product plans as bolt-ons
					</p>
				</div>
				<Button
					onClick={handleCreateAddOn}
					className="bg-indigo-500 hover:bg-indigo-600 text-white"
				>
					<Plus size={16} className="mr-2" />
					New Add-On
				</Button>
			</div>

			{/* Loading State */}
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
				</div>
			)}

			{/* Error State */}
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
					{error}
				</div>
			)}

			{/* Empty State */}
			{!isLoading && !error && addOns.length === 0 && (
				<div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
					<Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">
						No add-ons yet
					</h3>
					<p className="text-gray-500 mb-4">
						Create your first add-on to attach to product plans as bolt-ons.
					</p>
					<Button
						onClick={handleCreateAddOn}
						className="bg-indigo-500 hover:bg-indigo-600 text-white"
					>
						<Plus size={16} className="mr-2" />
						Create Add-On
					</Button>
				</div>
			)}

			{/* Add-Ons Grid */}
			{!isLoading && addOns.length > 0 && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{addOns.map((addOn) => (
						<div
							key={addOn.id}
							className={`relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${
								deletingAddOnId === addOn.id ? "opacity-50" : ""
							}`}
						>
							{deletingAddOnId === addOn.id && (
								<div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-lg">
									<Loader2 className="w-6 h-6 text-red-500 animate-spin" />
								</div>
							)}

							<div className="p-5">
								{/* Header */}
								<div className="flex items-start justify-between mb-3">
									<div className="flex items-center gap-2">
										<div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
											<Package className="w-5 h-5 text-indigo-600" />
										</div>
										<div>
											<h3 className="font-semibold text-gray-900">
												{addOn.name}
											</h3>
											<div className="flex items-center gap-2 mt-1">
												{getStatusBadge(addOn.status)}
												{getPricingModelBadge(addOn.pricingModel)}
											</div>
										</div>
									</div>
								</div>

								{/* Description */}
								{addOn.description && (
									<p className="text-sm text-gray-600 mb-4 line-clamp-2">
										{addOn.description}
									</p>
								)}

								{/* Pricing */}
								<div className="mb-4">
									{addOn.basePrice ? (
										<div className="flex items-baseline gap-1">
											<span className="text-2xl font-bold text-gray-900">
												${addOn.basePrice.amount}
											</span>
											<span className="text-sm text-gray-500">
												{addOn.basePrice.currency}
												{addOn.basePrice.interval &&
													`/${addOn.basePrice.interval}`}
											</span>
										</div>
									) : (
										<span className="text-sm text-gray-500 italic">
											No pricing set
										</span>
									)}
								</div>

								{/* Actions */}
								<div className="flex items-center gap-2 pt-3 border-t border-gray-100">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleEdit(addOn)}
										className="flex-1"
									>
										<Pencil size={14} className="mr-1" />
										Edit
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleDelete(addOn)}
										className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
									>
										<Trash2 size={14} />
									</Button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Create/Edit Dialog */}
			<AddOnDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				addOn={editingAddOn}
				onSaved={handleSaved}
			/>
		</main>
	);
}
