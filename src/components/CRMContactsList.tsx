import { useState, useMemo, useCallback } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	flexRender,
	type ColumnDef,
	type SortingState,
	type FilterFn,
} from "@tanstack/react-table";
import { rankItem } from "@tanstack/match-sorter-utils";
import {
	ChevronDown,
	ChevronUp,
	MoreHorizontal,
	Mail,
	Phone,
	Building2,
	User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Contact {
	id: string;
	name: string;
	email: string;
	phone?: string | null;
	avatarUrl?: string | null;
	title?: string | null;
	role: string;
	isOwner: boolean;
	status: string;
	notes?: string | null;
	lastActivityAt?: string | null;
	createdAt: string;
	updatedAt: string;
	customer?: {
		id: string;
		name: string;
		slug?: string;
		industry?: string | null;
	};
}

interface CRMContactsListProps {
	contacts: Contact[];
	selectedIds: string[];
	onSelectionChange: (ids: string[]) => void;
	onEdit?: (contact: Contact) => void;
	onDelete?: (contact: Contact) => void;
	onViewCustomer?: (customerId: string) => void;
	showCustomer?: boolean;
}

const roleStyles: Record<string, string> = {
	owner: "bg-purple-100 text-purple-700",
	admin: "bg-blue-100 text-blue-700",
	user: "bg-gray-100 text-gray-700",
	viewer: "bg-gray-100 text-gray-500",
};

const statusStyles: Record<string, string> = {
	active: "bg-emerald-100 text-emerald-700",
	suspended: "bg-red-100 text-red-700",
	invited: "bg-amber-100 text-amber-700",
};

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

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.substring(0, 2);
}

export function CRMContactsList({
	contacts,
	selectedIds,
	onSelectionChange,
	onEdit,
	onDelete,
	onViewCustomer,
	showCustomer = true,
}: CRMContactsListProps) {
	const [sorting, setSorting] = useState<SortingState>([]);

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
		if (selectedIds.length === contacts.length) {
			onSelectionChange([]);
		} else {
			onSelectionChange(contacts.map((c) => c.id));
		}
	}, [selectedIds, contacts, onSelectionChange]);

	const columns = useMemo<ColumnDef<Contact>[]>(
		() => [
			{
				id: "select",
				header: () => (
					<input
						type="checkbox"
						checked={
							selectedIds.length === contacts.length && contacts.length > 0
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
				accessorKey: "name",
				header: ({ column }) => (
					<button
						type="button"
						onClick={() => column.toggleSorting()}
						className="flex items-center gap-1 font-medium"
					>
						Contact
						{column.getIsSorted() === "asc" ? (
							<ChevronUp size={14} />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown size={14} />
						) : null}
					</button>
				),
				cell: ({ row }) => (
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center overflow-hidden">
							{row.original.avatarUrl ? (
								<img
									src={row.original.avatarUrl}
									alt={row.original.name}
									className="w-full h-full object-cover"
								/>
							) : (
								<span className="text-white text-sm font-medium">
									{getInitials(row.original.name)}
								</span>
							)}
						</div>
						<div>
							<div className="font-medium text-gray-900">
								{row.original.name}
							</div>
							{row.original.title && (
								<div className="text-xs text-gray-500">
									{row.original.title}
								</div>
							)}
						</div>
					</div>
				),
			},
			{
				accessorKey: "email",
				header: "Email",
				cell: ({ row }) => (
					<a
						href={`mailto:${row.original.email}`}
						className="text-gray-600 hover:text-indigo-600 flex items-center gap-1 text-sm"
					>
						<Mail size={14} />
						{row.original.email}
					</a>
				),
			},
			{
				accessorKey: "phone",
				header: "Phone",
				cell: ({ row }) =>
					row.original.phone ? (
						<a
							href={`tel:${row.original.phone}`}
							className="text-gray-600 hover:text-indigo-600 flex items-center gap-1 text-sm"
						>
							<Phone size={14} />
							{row.original.phone}
						</a>
					) : (
						<span className="text-gray-400 text-sm">-</span>
					),
			},
			{
				accessorKey: "role",
				header: "Role",
				cell: ({ row }) => (
					<span
						className={`px-2 py-1 text-xs font-medium rounded-full ${
							roleStyles[row.original.role] || roleStyles.user
						}`}
					>
						{row.original.role.charAt(0).toUpperCase() +
							row.original.role.slice(1)}
					</span>
				),
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => (
					<span
						className={`px-2 py-1 text-xs font-medium rounded-full ${
							statusStyles[row.original.status] || statusStyles.active
						}`}
					>
						{row.original.status.charAt(0).toUpperCase() +
							row.original.status.slice(1)}
					</span>
				),
			},
			...(showCustomer
				? [
						{
							id: "customer",
							accessorKey: "customer.name",
							header: "Company",
							cell: ({ row }: { row: { original: Contact } }) =>
								row.original.customer ? (
									<button
										type="button"
										onClick={() =>
											row.original.customer?.id &&
											onViewCustomer?.(row.original.customer.id)
										}
										className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600"
									>
										<Building2 size={14} />
										{row.original.customer.name}
									</button>
								) : (
									<span className="text-gray-400 text-sm">-</span>
								),
						} as ColumnDef<Contact>,
					]
				: []),
			{
				accessorKey: "lastActivityAt",
				header: "Last Activity",
				cell: ({ row }) => (
					<span className="text-gray-500 text-sm">
						{row.original.lastActivityAt
							? formatRelativeTime(row.original.lastActivityAt)
							: "Never"}
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
							<DropdownMenuItem onClick={() => onEdit?.(row.original)}>
								Edit
							</DropdownMenuItem>
							{row.original.customer && (
								<DropdownMenuItem
									onClick={() =>
										row.original.customer?.id &&
										onViewCustomer?.(row.original.customer.id)
									}
								>
									View Company
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-red-600"
								onClick={() => onDelete?.(row.original)}
							>
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
			contacts.length,
			showCustomer,
			toggleRowSelection,
			toggleAllSelection,
			onEdit,
			onViewCustomer,
			onDelete,
		],
	);

	const fuzzyFilter: FilterFn<Contact> = (row, columnId, value) => {
		const itemRank = rankItem(row.getValue(columnId), value as string);
		return itemRank.passed;
	};

	const table = useReactTable({
		data: contacts,
		columns,
		state: {
			sorting,
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
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
					))}
				</tbody>
			</table>

			{contacts.length === 0 && (
				<div className="text-center py-12 text-gray-500">
					<User size={48} className="mx-auto mb-4 text-gray-300" />
					<p className="text-lg font-medium">No contacts found</p>
					<p className="text-sm">
						Try adjusting your filters or add a new contact
					</p>
				</div>
			)}
		</div>
	);
}
