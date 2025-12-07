import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Download, Plus, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CRMSegments } from "@/components/CRMSegments";
import { CRMFilters, type CRMFiltersState } from "@/components/CRMFilters";
import { CRMBulkActions } from "@/components/CRMBulkActions";
import {
	CRMCustomerTable,
	type CRMCustomer,
} from "@/components/CRMCustomerTable";
import { CreateCustomerDialog } from "@/components/CreateCustomerDialog";
import { CreateSubscriptionDialog } from "@/components/CreateSubscriptionDialog";
import { CreateContactDialog } from "@/components/CreateContactDialog";

export const Route = createFileRoute("/$tenant/app/sales/crm/")({
	component: CRMPage,
});

interface CRMApiResponse {
	customers: CRMCustomer[];
	counts: {
		all: number;
		customers: number;
		prospects: number;
		inactive: number;
	};
	industries: string[];
	error?: string;
}

function CRMPage() {
	const params = useParams({ strict: false }) as { tenant?: string };
	const tenant = params.tenant || "";

	const [activeSegment, setActiveSegment] = useState("all");
	const [filters, setFilters] = useState<CRMFiltersState>({
		search: "",
		industry: "all",
		status: "all",
	});
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [customers, setCustomers] = useState<CRMCustomer[]>([]);
	const [counts, setCounts] = useState({
		all: 0,
		customers: 0,
		prospects: 0,
		inactive: 0,
	});
	const [industries, setIndustries] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [editingCustomer, setEditingCustomer] = useState<CRMCustomer | null>(
		null,
	);
	const [isCreateSubscriptionDialogOpen, setIsCreateSubscriptionDialogOpen] =
		useState(false);
	const [selectedCustomerForSubscription, setSelectedCustomerForSubscription] =
		useState<CRMCustomer | null>(null);
	const [isCreateContactDialogOpen, setIsCreateContactDialogOpen] =
		useState(false);
	const [selectedCustomerForContact, setSelectedCustomerForContact] =
		useState<CRMCustomer | null>(null);

	// Fetch customers from API
	const fetchCustomers = useCallback(async () => {
		if (!tenant) return;

		setIsLoading(true);
		setError(null);

		try {
			const queryParams = new URLSearchParams();
			queryParams.set("segment", activeSegment);
			if (filters.search) queryParams.set("search", filters.search);
			if (filters.industry && filters.industry !== "all")
				queryParams.set("industry", filters.industry);
			if (filters.status && filters.status !== "all")
				queryParams.set("status", filters.status);

			const response = await fetch(
				`/api/tenant/${tenant}/crm/customers?${queryParams.toString()}`,
			);
			const data: CRMApiResponse = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to fetch customers");
			}

			setCustomers(data.customers);
			setCounts(data.counts);
			setIndustries(data.industries);
		} catch (err) {
			console.error("Error fetching CRM customers:", err);
			setError(err instanceof Error ? err.message : "Failed to load customers");
		} finally {
			setIsLoading(false);
		}
	}, [tenant, activeSegment, filters]);

	// Load data on mount and when filters change
	useEffect(() => {
		fetchCustomers();
	}, [fetchCustomers]);

	// Clear selection when customers change
	// biome-ignore lint/correctness/useExhaustiveDependencies: we want to clear selection when customers array reference changes
	useEffect(() => {
		setSelectedIds([]);
	}, [customers]);

	// Segment definitions with counts from API
	const segments = [
		{ id: "all", label: "All", count: counts.all },
		{ id: "customers", label: "Current Customers", count: counts.customers },
		{ id: "prospects", label: "Prospects", count: counts.prospects },
		{ id: "inactive", label: "Inactive", count: counts.inactive },
	];

	// Calculate totals from current customers list
	const totals = useMemo(() => {
		const realizedValue = customers.reduce(
			(sum, c) => sum + c.realizedValue,
			0,
		);
		const potentialValue = customers.reduce(
			(sum, c) => sum + c.potentialValue,
			0,
		);
		return { realizedValue, potentialValue };
	}, [customers]);

	const formatCurrency = (value: number): string => {
		if (value >= 1000000) {
			return `$${(value / 1000000).toFixed(1)}M`;
		}
		if (value >= 1000) {
			return `$${(value / 1000).toFixed(0)}K`;
		}
		return `$${value.toLocaleString()}`;
	};

	const handleExportAll = () => {
		console.log("Export all customers");
		// TODO: Implement CSV export
	};

	const handleBulkTag = () => {
		console.log("Tag selected:", selectedIds);
	};

	const handleBulkAssign = () => {
		console.log("Assign selected:", selectedIds);
	};

	const handleBulkExport = () => {
		console.log("Export selected:", selectedIds);
	};

	const handleBulkDelete = () => {
		console.log("Delete selected:", selectedIds);
	};

	const handleRefresh = () => {
		fetchCustomers();
	};

	return (
		<main className="flex-1 overflow-auto p-6">
			{/* Page Header */}
			<div className="flex items-start justify-between mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">CRM</h1>
					<p className="text-gray-500 text-sm mt-1">
						Manage customers and prospects with realized and potential value
						tracking.
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Link to={`/${tenant}/app/sales/crm/contacts`}>
						<Button variant="outline">
							<Users size={18} className="mr-1" />
							View Contacts
						</Button>
					</Link>
					<Button
						variant="outline"
						onClick={handleRefresh}
						disabled={isLoading}
					>
						<RefreshCw
							size={18}
							className={`mr-1 ${isLoading ? "animate-spin" : ""}`}
						/>
						Refresh
					</Button>
					<Button variant="outline" onClick={handleExportAll}>
						<Download size={18} className="mr-1" />
						Export
					</Button>
					<Button
						className="bg-indigo-500 hover:bg-indigo-600 text-white"
						onClick={() => setIsCreateDialogOpen(true)}
					>
						<Plus size={18} className="mr-1" />
						Add Customer
					</Button>
				</div>
			</div>
			{/* Create Customer Dialog */}
			<CreateCustomerDialog
				open={isCreateDialogOpen}
				onOpenChange={(open) => {
					setIsCreateDialogOpen(open);
					if (!open) setEditingCustomer(null);
				}}
				onCustomerCreated={() => {
					setIsCreateDialogOpen(false);
					setEditingCustomer(null);
					fetchCustomers();
				}}
			/>
			{/* Edit Customer Dialog */}
			<CreateCustomerDialog
				open={!!editingCustomer}
				onOpenChange={(open) => {
					if (!open) setEditingCustomer(null);
				}}
				onCustomerCreated={() => {
					setEditingCustomer(null);
					fetchCustomers();
				}}
				customerId={editingCustomer?.id || null}
			/>
			{/* Create Subscription Dialog */}
			<CreateSubscriptionDialog
				open={isCreateSubscriptionDialogOpen}
				onOpenChange={(open) => {
					setIsCreateSubscriptionDialogOpen(open);
					if (!open) setSelectedCustomerForSubscription(null);
				}}
				onSubscriptionCreated={() => {
					setIsCreateSubscriptionDialogOpen(false);
					setSelectedCustomerForSubscription(null);
					fetchCustomers();
				}}
				preSelectedCompanyId={selectedCustomerForSubscription?.id}
				preSelectedCompanyName={selectedCustomerForSubscription?.name}
			/>
			{/* Create Contact Dialog */}
			<CreateContactDialog
				open={isCreateContactDialogOpen}
				onOpenChange={(open) => {
					setIsCreateContactDialogOpen(open);
					if (!open) setSelectedCustomerForContact(null);
				}}
				onContactCreated={() => {
					setIsCreateContactDialogOpen(false);
					setSelectedCustomerForContact(null);
					fetchCustomers();
				}}
				customerId={selectedCustomerForContact?.id}
				customerName={selectedCustomerForContact?.name}
			/>
			{/* Error Banner */}
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
					<p className="font-medium">Error loading customers</p>
					<p className="text-sm">{error}</p>
				</div>
			)}
			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-lg border border-gray-200 p-4">
					<p className="text-sm text-gray-500">Total Customers</p>
					<p className="text-2xl font-semibold text-gray-900">
						{isLoading ? "..." : customers.length}
					</p>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 p-4">
					<p className="text-sm text-gray-500">Realized Value</p>
					<p className="text-2xl font-semibold text-emerald-600">
						{isLoading ? "..." : formatCurrency(totals.realizedValue)}
					</p>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 p-4">
					<p className="text-sm text-gray-500">Potential Value</p>
					<p className="text-2xl font-semibold text-blue-600">
						{isLoading ? "..." : formatCurrency(totals.potentialValue)}
					</p>
				</div>
			</div>
			{/* Segments */}
			<div className="bg-white rounded-lg border border-gray-200 mb-4">
				<CRMSegments
					segments={segments}
					activeSegment={activeSegment}
					onSegmentChange={setActiveSegment}
				/>
			</div>
			{/* Filters */}
			<CRMFilters
				filters={filters}
				onFiltersChange={setFilters}
				industries={
					industries.length > 0
						? industries
						: [
								"Technology",
								"Finance",
								"Healthcare",
								"Retail",
								"Education",
								"Manufacturing",
								"Legal",
								"Energy",
							]
				}
			/>
			{/* Bulk Actions */}
			<CRMBulkActions
				selectedCount={selectedIds.length}
				onTag={handleBulkTag}
				onAssign={handleBulkAssign}
				onExport={handleBulkExport}
				onDelete={handleBulkDelete}
				onClearSelection={() => setSelectedIds([])}
			/>
			{/* Loading State */}
			{isLoading ? (
				<div className="bg-white rounded-lg border border-gray-200 p-12">
					<div className="flex flex-col items-center justify-center text-gray-500">
						<RefreshCw size={32} className="animate-spin mb-4" />
						<p>Loading customers...</p>
					</div>
				</div>
			) : (
				/* Customer Table */
				<CRMCustomerTable
					customers={customers}
					selectedIds={selectedIds}
					onSelectionChange={setSelectedIds}
					onEdit={(customer) => setEditingCustomer(customer)}
					onCreateSubscription={(customer) => {
						setSelectedCustomerForSubscription(customer);
						setIsCreateSubscriptionDialogOpen(true);
					}}
					onAddContact={(customer) => {
						setSelectedCustomerForContact(customer);
						setIsCreateContactDialogOpen(true);
					}}
				/>
			)}
		</main>
	);
}
