import { useState, useMemo, useCallback } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	type ColumnDef,
	type SortingState,
	type FilterFn,
} from "@tanstack/react-table";
import { rankItem } from "@tanstack/match-sorter-utils";
import {
	ChevronDown,
	ChevronUp,
	ChevronRight,
	MoreHorizontal,
	ExternalLink,
	Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CRMActivityTimeline, type Activity } from "./CRMActivityTimeline";

/**
 * Customer data for CRM table display.
 */
export interface CRMCustomer {
	id: string;
	name: string;
	industry: string;
	logo?: string;
	website?: string;
	status: "customer" | "prospect" | "inactive";
	subscriptionStatus?: "active" | "trialing" | "canceled" | "past_due";
	subscriptionPlan?: string;
	importance?: "low" | "normal" | "high" | "vip";
	realizedValue: number;
	potentialValue: number;
	lastActivity: string;
	dealCount: number;
	contactCount: number;
	assignedTo?: {
		id: string;
		name: string;
	};
	tags?: string[];
	activities?: Activity[];
}

/**
 * Props for the CRMCustomerTable component.
 */
interface CRMCustomerTableProps {
	customers: CRMCustomer[];
	selectedIds: string[];
	onSelectionChange: (ids: string[]) => void;
	onEdit?: (customer: CRMCustomer) => void;
	onCreateSubscription?: (customer: CRMCustomer) => void;
	onAddContact?: (customer: CRMCustomer) => void;
}

const statusStyles = {
	customer: "bg-emerald-100 text-emerald-700",
	prospect: "bg-blue-100 text-blue-700",
	inactive: "bg-gray-100 text-gray-600",
};

const subscriptionStyles = {
	active: "bg-emerald-100 text-emerald-700",
	trialing: "bg-amber-100 text-amber-700",
	canceled: "bg-red-100 text-red-700",
	past_due: "bg-orange-100 text-orange-700",
};

/**
 * Format a currency value in a compact format (K, M).
 *
 * @param value - The numeric value to format
 * @returns Formatted currency string
 */
function formatCurrency(value: number): string {
	if (value >= 1000000) {
		return `$${(value / 1000000).toFixed(1)}M`;
	}
	if (value >= 1000) {
		return `$${(value / 1000).toFixed(0)}K`;
	}
	return `$${value.toLocaleString()}`;
}

/**
 * Format a timestamp as relative time (e.g., "2h ago", "3d ago").
 *
 * @param timestamp - ISO timestamp string
 * @returns Formatted relative time string
 */
function formatRelativeTime(timestamp: string): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 60) {
		return `${diffMins}m ago`;
	}
	if (diffHours < 24) {
		return `${diffHours}h ago`;
	}
	if (diffDays < 7) {
		return `${diffDays}d ago`;
	}
	return date.toLocaleDateString();
}

/**
 * Table component displaying CRM customers with sorting, filtering, and selection.
 *
 * Features expandable rows showing activity timeline, bulk selection, and
 * action buttons for editing, creating subscriptions, and adding contacts.
 *
 * @param props - Component props
 * @param props.customers - Array of customers to display
 * @param props.selectedIds - Array of selected customer IDs
 * @param props.onSelectionChange - Callback when selection changes
 * @param props.onEdit - Callback when edit is clicked
 * @param props.onCreateSubscription - Callback when create subscription is clicked
 * @param props.onAddContact - Callback when add contact is clicked
 */
export function CRMCustomerTable({
	customers,
	selectedIds,
	onSelectionChange,
	onEdit,
	onCreateSubscription,
	onAddContact,
}: CRMCustomerTableProps) {
	const params = useParams({ strict: false }) as { tenant?: string };
	const tenant = params.tenant || "";
	const [sorting, setSorting] = useState<SortingState>([]);
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

	const toggleRowExpanded = useCallback((id: string) => {
		setExpandedRows((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const toggleRowSelection = useCallback(
		(id: string) => {
			if (selectedIds.includes(id)) {
				onSelectionChange(selectedIds.filter((i) => i !== id));
			} else {
				onSelectionChange([...selectedIds, id]);
			}
		},
		[selectedIds, onSelectionChange],
	);

	const toggleAllSelection = useCallback(() => {
		if (selectedIds.length === customers.length) {
			onSelectionChange([]);
		} else {
			onSelectionChange(customers.map((c) => c.id));
		}
	}, [selectedIds, customers, onSelectionChange]);

	const columns = useMemo<ColumnDef<CRMCustomer>[]>(
		() => [
			{
				id: "select",
				header: () => (
					<input
						type="checkbox"
						checked={
							selectedIds.length === customers.length && customers.length > 0
						}
						onChange={toggleAllSelection}
						className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
					/>
				),
				cell: ({ row }) => (
					<input
						type="checkbox"
						checked={selectedIds.includes(row.original.id)}
						onChange={() => toggleRowSelection(row.original.id)}
						className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
					/>
				),
				size: 40,
			},
			{
				id: "expand",
				header: () => null,
				cell: ({ row }) => (
					<button
						type="button"
						onClick={() => toggleRowExpanded(row.original.id)}
						className="p-1 hover:bg-gray-100 rounded transition-colors"
					>
						{expandedRows.has(row.original.id) ? (
							<ChevronDown size={16} className="text-gray-400" />
						) : (
							<ChevronRight size={16} className="text-gray-400" />
						)}
					</button>
				),
				size: 40,
			},
			{
				accessorKey: "name",
				header: "Company",
				cell: ({ row }) => (
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
							{row.original.logo ? (
								<img
									src={row.original.logo}
									alt={row.original.name}
									className="w-full h-full object-cover rounded-lg"
								/>
							) : (
								<Building2 size={18} className="text-white" />
							)}
						</div>
						<div>
							<Link
								to="/$tenant/app/sales/crm/$customerId"
								params={{ tenant, customerId: row.original.id }}
							>
								<div className="font-medium text-gray-900 hover:text-indigo-600 cursor-pointer">
									{row.original.name}
								</div>
							</Link>
							{row.original.website && (
								<a
									href={row.original.website}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1"
									onClick={(e) => e.stopPropagation()}
								>
									{row.original.website.replace(/^https?:\/\//, "")}
									<ExternalLink size={10} />
								</a>
							)}
						</div>
					</div>
				),
			},
			{
				accessorKey: "industry",
				header: "Industry",
				cell: ({ row }) => (
					<span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
						{row.original.industry}
					</span>
				),
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => (
					<div className="flex flex-col gap-1">
						<span
							className={`px-2 py-1 text-xs font-medium rounded-full w-fit ${
								statusStyles[row.original.status]
							}`}
						>
							{row.original.status.charAt(0).toUpperCase() +
								row.original.status.slice(1)}
						</span>
						{row.original.subscriptionStatus && (
							<span
								className={`px-2 py-0.5 text-xs rounded-full w-fit ${
									subscriptionStyles[row.original.subscriptionStatus]
								}`}
							>
								{row.original.subscriptionStatus.replace("_", " ")}
							</span>
						)}
					</div>
				),
			},
			{
				accessorKey: "importance",
				header: "Importance",
				cell: ({ row }) => {
					const importance = row.original.importance || "normal";
					const importanceStyles = {
						low: "bg-gray-100 text-gray-600",
						normal: "bg-blue-100 text-blue-700",
						high: "bg-orange-100 text-orange-700",
						vip: "bg-purple-100 text-purple-700",
					};
					return (
						<span
							className={`px-2 py-1 text-xs font-medium rounded-full uppercase ${
								importanceStyles[importance as keyof typeof importanceStyles]
							}`}
						>
							{importance}
						</span>
					);
				},
			},
			{
				accessorKey: "realizedValue",
				header: ({ column }) => (
					<button
						type="button"
						onClick={() => column.toggleSorting()}
						className="flex items-center gap-1 font-medium"
					>
						Realized Value
						{column.getIsSorted() === "asc" ? (
							<ChevronUp size={14} />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown size={14} />
						) : null}
					</button>
				),
				cell: ({ row }) => (
					<div className="text-right font-medium text-emerald-600">
						{formatCurrency(row.original.realizedValue)}
					</div>
				),
			},
			{
				accessorKey: "potentialValue",
				header: ({ column }) => (
					<button
						type="button"
						onClick={() => column.toggleSorting()}
						className="flex items-center gap-1 font-medium"
					>
						Potential Value
						{column.getIsSorted() === "asc" ? (
							<ChevronUp size={14} />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown size={14} />
						) : null}
					</button>
				),
				cell: ({ row }) => (
					<div className="text-right font-medium text-blue-600">
						{formatCurrency(row.original.potentialValue)}
					</div>
				),
			},
			{
				accessorKey: "lastActivity",
				header: "Last Activity",
				cell: ({ row }) => (
					<span className="text-gray-500 text-sm">
						{formatRelativeTime(row.original.lastActivity)}
					</span>
				),
			},
			{
				accessorKey: "dealCount",
				header: "Deals",
				cell: ({ row }) => (
					<span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
						{row.original.dealCount}
					</span>
				),
			},
			{
				id: "actions",
				header: () => null,
				cell: ({ row }) => (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<MoreHorizontal size={16} />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem asChild>
								<Link
									to="/$tenant/app/sales/crm/$customerId"
									params={{ tenant, customerId: row.original.id }}
								>
									View Details
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onEdit?.(row.original)}>
								Edit
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							{row.original.subscriptionStatus !== "active" && (
								<DropdownMenuItem
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										onCreateSubscription?.(row.original);
									}}
								>
									Create Subscription
								</DropdownMenuItem>
							)}
							<DropdownMenuItem>Add Deal</DropdownMenuItem>
							<DropdownMenuItem
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onAddContact?.(row.original);
								}}
							>
								Add Contact
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem className="text-red-600">
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				),
				size: 50,
			},
		],
		[
			selectedIds,
			customers.length,
			expandedRows,
			toggleRowExpanded,
			toggleRowSelection,
			toggleAllSelection,
			tenant,
			onEdit,
			onCreateSubscription,
			onAddContact,
		],
	);

	const fuzzyFilter: FilterFn<CRMCustomer> = (row, columnId, value) => {
		const itemRank = rankItem(row.getValue(columnId), value as string);
		return itemRank.passed;
	};

	const table = useReactTable({
		data: customers,
		columns,
		state: {
			sorting,
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		filterFns: {
			fuzzy: fuzzyFilter,
		},
	});

	return (
		<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
			<table className="w-full">
				<thead className="bg-gray-50 border-b border-gray-200">
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<th
									key={header.id}
									className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									style={{
										width:
											header.getSize() !== 150 ? header.getSize() : undefined,
									}}
								>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody className="divide-y divide-gray-200">
					{table.getRowModel().rows.map((row) => (
						<>
							<tr
								key={row.id}
								className={`hover:bg-gray-50 transition-colors ${
									selectedIds.includes(row.original.id) ? "bg-indigo-50" : ""
								}`}
							>
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="px-4 py-3 whitespace-nowrap">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
							{expandedRows.has(row.original.id) && row.original.activities && (
								<tr key={`${row.id}-expanded`}>
									<td colSpan={columns.length} className="px-4 py-2 bg-gray-50">
										<div className="pl-20 pr-4 py-2">
											<h4 className="text-sm font-medium text-gray-700 mb-2">
												Recent Activity
											</h4>
											<CRMActivityTimeline
												activities={row.original.activities}
											/>
										</div>
									</td>
								</tr>
							)}
						</>
					))}
				</tbody>
			</table>

			{customers.length === 0 && (
				<div className="text-center py-12 text-gray-500">
					<Building2 size={48} className="mx-auto mb-4 text-gray-300" />
					<p className="text-lg font-medium">No customers found</p>
					<p className="text-sm">
						Try adjusting your filters or add a new customer
					</p>
				</div>
			)}
		</div>
	);
}
