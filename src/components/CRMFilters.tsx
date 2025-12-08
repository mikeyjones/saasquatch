import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export interface CRMFiltersState {
	search: string;
	industry: string;
	status: string;
	importance: string;
}

interface CRMFiltersProps {
	filters: CRMFiltersState;
	onFiltersChange: (filters: CRMFiltersState) => void;
	industries: string[];
}

export function CRMFilters({
	filters,
	onFiltersChange,
	industries,
}: CRMFiltersProps) {
	const hasActiveFilters =
		filters.search || filters.industry !== "all" || filters.status !== "all" || filters.importance !== "all";

	const clearFilters = () => {
		onFiltersChange({
			search: "",
			industry: "all",
			status: "all",
			importance: "all",
		});
	};

	return (
		<div className="flex flex-wrap items-center gap-3 py-4">
			{/* Search */}
			<div className="relative flex-1 min-w-[200px] max-w-sm">
				<Search
					className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
					size={18}
				/>
				<Input
					type="text"
					placeholder="Search companies, industries..."
					value={filters.search}
					onChange={(e) =>
						onFiltersChange({ ...filters, search: e.target.value })
					}
					className="pl-10 bg-white"
				/>
			</div>

			{/* Industry Filter */}
			<Select
				value={filters.industry}
				onValueChange={(value) =>
					onFiltersChange({
						...filters,
						industry: value,
					})
				}
			>
				<SelectTrigger className="w-[160px] bg-white">
					<Filter size={16} className="mr-2 text-gray-400" />
					<SelectValue placeholder="Industry" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Industries</SelectItem>
					{industries.map((industry) => (
						<SelectItem key={industry} value={industry}>
							{industry}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Status Filter */}
			<Select
				value={filters.status}
				onValueChange={(value) =>
					onFiltersChange({ ...filters, status: value })
				}
			>
				<SelectTrigger className="w-[160px] bg-white">
					<SelectValue placeholder="Status" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Statuses</SelectItem>
					<SelectItem value="active">Active</SelectItem>
					<SelectItem value="trialing">Trialing</SelectItem>
					<SelectItem value="canceled">Canceled</SelectItem>
					<SelectItem value="past_due">Past Due</SelectItem>
				</SelectContent>
			</Select>

			{/* Importance Filter */}
			<Select
				value={filters.importance}
				onValueChange={(value) =>
					onFiltersChange({ ...filters, importance: value })
				}
			>
				<SelectTrigger className="w-[160px] bg-white">
					<SelectValue placeholder="Importance" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Importance</SelectItem>
					<SelectItem value="low">Low</SelectItem>
					<SelectItem value="normal">Normal</SelectItem>
					<SelectItem value="high">High</SelectItem>
					<SelectItem value="vip">VIP</SelectItem>
				</SelectContent>
			</Select>

			{/* Clear Filters */}
			{hasActiveFilters && (
				<Button
					variant="ghost"
					size="sm"
					onClick={clearFilters}
					className="text-gray-500 hover:text-gray-700"
				>
					<X size={16} className="mr-1" />
					Clear filters
				</Button>
			)}
		</div>
	);
}
