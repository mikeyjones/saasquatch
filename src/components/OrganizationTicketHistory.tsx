import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Clock, CheckCircle2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Ticket {
	id: string;
	ticketNumber: string;
	title: string;
	status: string;
	priority: string;
	channel: string;
	tenantUserId: string;
	customerName: string;
	customerEmail: string;
	assignedToUserId: string | null;
	createdAt: string;
	updatedAt: string | null;
	resolvedAt: string | null;
}

export function OrganizationTicketHistory({
	tickets,
	tenant,
}: {
	tickets: Ticket[];
	tenant: string;
}) {
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [priorityFilter, setPriorityFilter] = useState<string>("all");

	const filteredTickets = useMemo(() => {
		return tickets.filter((ticket) => {
			const matchesStatus =
				statusFilter === "all" || ticket.status === statusFilter;
			const matchesPriority =
				priorityFilter === "all" || ticket.priority === priorityFilter;
			return matchesStatus && matchesPriority;
		});
	}, [tickets, statusFilter, priorityFilter]);

	const priorityIcon = {
		urgent: <AlertCircle size={14} className="text-red-500" />,
		high: <AlertCircle size={14} className="text-orange-500" />,
		normal: <Clock size={14} className="text-blue-500" />,
		low: <CheckCircle2 size={14} className="text-gray-500" />,
	};

	const priorityStyles = {
		urgent: "bg-red-100 text-red-700",
		high: "bg-orange-100 text-orange-700",
		normal: "bg-blue-100 text-blue-700",
		low: "bg-gray-100 text-gray-600",
	};

	const statusStyles = {
		open: "bg-green-100 text-green-700",
		closed: "bg-gray-100 text-gray-600",
		pending: "bg-yellow-100 text-yellow-700",
		waiting_on_customer: "bg-orange-100 text-orange-700",
		escalated: "bg-red-100 text-red-700",
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex items-center gap-3">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="gap-2">
							<Filter size={14} />
							Status: {statusFilter === "all" ? "All" : statusFilter}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuLabel>Filter by status</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => setStatusFilter("all")}>
							All
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setStatusFilter("open")}>
							Open
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setStatusFilter("pending")}>
							Pending
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setStatusFilter("closed")}>
							Closed
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="gap-2">
							<Filter size={14} />
							Priority: {priorityFilter === "all" ? "All" : priorityFilter}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuLabel>Filter by priority</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => setPriorityFilter("all")}>
							All
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setPriorityFilter("urgent")}>
							Urgent
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setPriorityFilter("high")}>
							High
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setPriorityFilter("normal")}>
							Normal
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setPriorityFilter("low")}>
							Low
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<div className="ml-auto text-sm text-gray-500">
					Showing {filteredTickets.length} of {tickets.length} tickets
				</div>
			</div>

			{/* Tickets Table */}
			<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
				<table className="w-full">
					<thead>
						<tr className="border-b border-gray-100 bg-gray-50">
							<th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								Ticket #
							</th>
							<th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								Subject
							</th>
							<th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								Priority
							</th>
							<th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								Contact
							</th>
							<th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								Created
							</th>
							<th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								Last Updated
							</th>
						</tr>
					</thead>
					<tbody>
						{filteredTickets.length === 0 ? (
							<tr>
								<td
									colSpan={7}
									className="px-4 py-12 text-center text-gray-500"
								>
									No tickets found
								</td>
							</tr>
						) : (
							filteredTickets.map((ticket) => (
								<tr
									key={ticket.id}
									className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
								>
									<td className="px-4 py-3">
										<Link
											to={`/${tenant}/app/support/tickets`}
											className="text-blue-600 hover:underline font-medium text-sm"
										>
											{ticket.ticketNumber}
										</Link>
									</td>
									<td className="px-4 py-3">
										<div className="text-sm text-gray-900">{ticket.title}</div>
									</td>
									<td className="px-4 py-3">
										<span
											className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded capitalize ${
												statusStyles[ticket.status as keyof typeof statusStyles] ||
												"bg-gray-100 text-gray-600"
											}`}
										>
											{ticket.status.replace("_", " ")}
										</span>
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center gap-1">
											{
												priorityIcon[
													ticket.priority as keyof typeof priorityIcon
												]
											}
											<span
												className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded capitalize ${
													priorityStyles[
														ticket.priority as keyof typeof priorityStyles
													] || "bg-gray-100 text-gray-600"
												}`}
											>
												{ticket.priority}
											</span>
										</div>
									</td>
									<td className="px-4 py-3">
										<Link
											to={`/${tenant}/app/support/members/${ticket.tenantUserId}`}
											className="text-sm text-gray-900 hover:text-blue-600 hover:underline"
										>
											{ticket.customerName}
										</Link>
									</td>
									<td className="px-4 py-3">
										<span className="text-sm text-gray-500">
											{formatDate(ticket.createdAt)}
										</span>
									</td>
									<td className="px-4 py-3">
										<span className="text-sm text-gray-500">
											{ticket.updatedAt
												? formatDate(ticket.updatedAt)
												: "-"}
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
