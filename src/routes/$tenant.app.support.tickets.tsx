import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useStore } from "@tanstack/react-store";
import { useParams } from "@tanstack/react-router";
import {
	Search,
	Filter,
	Mail,
	Clock,
	CheckCircle2,
	AlertCircle,
	Bot,
	Lock,
	Send,
	Loader2,
	User,
	ChevronDown,
	Check,
	UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	ticketsStore,
	filterOptions,
	fetchTickets,
	fetchTicket,
	postTicketMessage,
	updateTicket,
	fetchSupportMembers,
	type Ticket,
	type TicketDetail as TicketDetailType,
	type SupportMember,
} from "@/data/tickets";
import { useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/$tenant/app/support/tickets")({
	component: TicketsPage,
});

function TicketsPage() {
	const params = useParams({ strict: false }) as { tenant?: string };
	const tenant = params.tenant || "";
	const { data: session } = useSession();

	const tickets = useStore(ticketsStore);
	const [selectedTicketId, setSelectedTicketId] = useState<string>(
		tickets[0]?.id || "",
	);
	const [activeFilter, setActiveFilter] = useState("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [selectedTicketDetail, setSelectedTicketDetail] =
		useState<TicketDetailType | null>(null);
	const [isLoadingDetail, setIsLoadingDetail] = useState(false);

	const selectedTicket = useMemo(
		() => tickets.find((t) => t.id === selectedTicketId) || tickets[0],
		[tickets, selectedTicketId],
	);

	// Fetch tickets on component mount or when filter changes
	useEffect(() => {
		const loadTickets = async () => {
			setIsLoading(true);
			
			// Build filters based on activeFilter
			const filters: { status?: string; assignedToUserId?: string; unassigned?: boolean } = {};
			
			if (activeFilter === "my-open") {
				// Filter for open tickets assigned to current user
				filters.status = "open";
				if (session?.user?.id) {
					filters.assignedToUserId = session.user.id;
				}
			} else if (activeFilter === "unassigned") {
				// Filter for unassigned tickets
				filters.unassigned = true;
			} else if (activeFilter === "open") {
				filters.status = "open";
			} else if (activeFilter === "pending") {
				filters.status = "pending";
			} else if (activeFilter === "closed") {
				filters.status = "closed";
			} else if (activeFilter === "urgent") {
				// Note: priority filter is handled client-side for now
			}
			
			await fetchTickets(tenant, filters);
			setIsLoading(false);
		};

		if (tenant) {
			loadTickets();
		}
	}, [tenant, activeFilter, session?.user?.id]);

	// Fetch ticket details when selection changes
	useEffect(() => {
		const loadTicketDetail = async () => {
			if (!selectedTicketId || !tenant) return;

			setIsLoadingDetail(true);
			const detail = await fetchTicket(tenant, selectedTicketId);
			setSelectedTicketDetail(detail);
			setIsLoadingDetail(false);
		};

		loadTicketDetail();
	}, [selectedTicketId, tenant]);

	const filteredTickets = useMemo(
		() =>
			tickets.filter((ticket) => {
				// Apply status/priority filter
				// Note: "my-open" and "unassigned" are already filtered by the API, so we just pass through
				let matchesFilter = true;
				if (activeFilter === "all") matchesFilter = true;
				else if (activeFilter === "my-open") {
					// Already filtered by API (open + assigned to current user)
					// Just verify it's still open and assigned (in case of race conditions)
					matchesFilter = ticket.status === "open" && 
						(session?.user?.id ? ticket.assignedToUserId === session.user.id : false);
				} else if (activeFilter === "unassigned") {
					// Already filtered by API (unassigned tickets)
					// Just verify it's still unassigned (in case of race conditions)
					matchesFilter = !ticket.assignedToUserId;
				} else if (activeFilter === "open")
					matchesFilter = ticket.status === "open";
				else if (activeFilter === "pending")
					matchesFilter = ticket.status === "pending";
				else if (activeFilter === "closed")
					matchesFilter = ticket.status === "closed";
				else if (activeFilter === "urgent")
					matchesFilter = ticket.priority === "urgent";

				// Apply search filter
				let matchesSearch = true;
				if (searchQuery.trim()) {
					const query = searchQuery.toLowerCase();
					matchesSearch =
						ticket.title.toLowerCase().includes(query) ||
						ticket.company.toLowerCase().includes(query) ||
						ticket.ticketNumber.toLowerCase().includes(query) ||
						ticket.preview.toLowerCase().includes(query);
				}

				return matchesFilter && matchesSearch;
			}),
		[tickets, activeFilter, searchQuery, session?.user?.id],
	);

	return (
		<main className="flex-1 flex overflow-hidden">
			{/* Ticket List Panel */}
			<div className="w-[400px] border-r border-gray-200 bg-white flex flex-col">
				{/* List Header */}
				<div className="p-4 border-b border-gray-100">
					<div className="flex items-center justify-between mb-3">
						<div>
							<h1 className="text-xl font-semibold text-gray-900">
								Support Inbox
							</h1>
							<p className="text-sm text-gray-500">
								Manage incoming requests across all channels.
							</p>
						</div>
					</div>

					{/* Search and Filter */}
					<div className="flex items-center gap-2">
						<div className="flex-1 relative">
							<Search
								className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
								size={16}
							/>
							<Input
								type="text"
								placeholder="Search tickets..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9 h-9 text-sm bg-gray-50 border-gray-200"
							/>
						</div>
						<button type="button" className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
							<Filter size={18} className="text-gray-500" />
						</button>
					</div>
				</div>

				{/* Filter Dropdown */}
				<div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="gap-2">
								<Filter size={14} />
								<span>
									{filterOptions.find((f) => f.id === activeFilter)?.label || "All"}
								</span>
								<ChevronDown size={14} />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-48">
							<DropdownMenuLabel>Filter tickets</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{filterOptions.map((filter) => (
								<DropdownMenuItem
									key={filter.id}
									onClick={() => setActiveFilter(filter.id)}
									className="cursor-pointer"
								>
									{filter.label}
									{activeFilter === filter.id && (
										<Check size={14} className="ml-auto text-emerald-500" />
									)}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* Ticket List */}
				<div className="flex-1 overflow-auto">
					{isLoading ? (
						<div className="flex items-center justify-center h-32">
							<div className="text-sm text-gray-500">Loading tickets...</div>
						</div>
					) : filteredTickets.length === 0 ? (
						<div className="flex items-center justify-center h-32">
							<div className="text-sm text-gray-500">No tickets found</div>
						</div>
					) : (
						filteredTickets.map((ticket) => (
							<TicketCard
								key={ticket.id}
								ticket={ticket}
								isSelected={ticket.id === selectedTicketId}
								onClick={() => setSelectedTicketId(ticket.id)}
							/>
						))
					)}
				</div>
			</div>

			{/* Ticket Detail Panel */}
			{selectedTicket && (
				<TicketDetail
					ticket={selectedTicket}
					detail={selectedTicketDetail}
					isLoadingDetail={isLoadingDetail}
					tenant={tenant}
					onMessageSent={async () => {
						// Refresh ticket details after sending a message
						const detail = await fetchTicket(tenant, selectedTicketId);
						setSelectedTicketDetail(detail);
					}}
				/>
			)}
		</main>
	);
}

function TicketCard({
	ticket,
	isSelected,
	onClick,
}: {
	ticket: Ticket;
	isSelected: boolean;
	onClick: () => void;
}) {
	const priorityStyles = {
		urgent: "bg-red-100 text-red-700",
		high: "bg-orange-100 text-orange-700",
		normal: "bg-blue-100 text-blue-700",
		low: "bg-gray-100 text-gray-600",
	};

	const priorityIcon = {
		urgent: <AlertCircle size={14} className="text-red-500" />,
		high: <AlertCircle size={14} className="text-orange-500" />,
		normal: <Clock size={14} className="text-blue-500" />,
		low: <CheckCircle2 size={14} className="text-gray-500" />,
	};

	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
				isSelected ? "bg-gray-50 border-l-2 border-l-emerald-500" : ""
			}`}
		>
			<div className="flex items-start justify-between mb-1">
				<div className="flex items-center gap-2">
					{priorityIcon[ticket.priority]}
					<span className="font-medium text-gray-900 text-sm">
						{ticket.title}
					</span>
				</div>
				<span className="text-xs text-gray-400">{ticket.timeAgo}</span>
			</div>

			<div className="flex items-center gap-2 mb-2">
				<span className="text-xs text-gray-500">{ticket.company}</span>
				<span className="text-xs text-gray-400">•</span>
				<span className="text-xs text-gray-500">{ticket.ticketNumber}</span>

				<div className="flex items-center gap-1 ml-auto">
					{ticket.hasAI && (
						<span className="flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded">
							<Bot size={12} />
							AI
						</span>
					)}
					<span
						className={`px-2 py-0.5 text-xs rounded capitalize ${priorityStyles[ticket.priority]}`}
					>
						{ticket.priority === "normal"
							? "Normal"
							: ticket.priority.charAt(0).toUpperCase() +
								ticket.priority.slice(1)}
					</span>
				</div>
			</div>

			<p className="text-xs text-gray-500 line-clamp-1">{ticket.preview}</p>
		</button>
	);
}

function TicketDetail({
	ticket,
	detail,
	isLoadingDetail,
	tenant,
	onMessageSent,
}: {
	ticket: Ticket;
	detail: TicketDetailType | null;
	isLoadingDetail: boolean;
	tenant: string;
	onMessageSent: () => Promise<void>;
}) {
	const [replyText, setReplyText] = useState("");
	const [isPrivateNote, setIsPrivateNote] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [supportMembers, setSupportMembers] = useState<SupportMember[]>([]);
	const [isLoadingMembers, setIsLoadingMembers] = useState(false);
	const [isAssigning, setIsAssigning] = useState(false);
	const { data: session } = useSession();

	// Fetch support members when component mounts or tenant changes
	useEffect(() => {
		const loadMembers = async () => {
			if (!tenant) return;
			setIsLoadingMembers(true);
			const members = await fetchSupportMembers(tenant);
			setSupportMembers(members);
			setIsLoadingMembers(false);
		};
		loadMembers();
	}, [tenant]);

	// Find current user in support members list
	const currentUser = useMemo(() => {
		if (!session?.user?.id) return null;
		return supportMembers.find((m) => m.id === session.user.id) || null;
	}, [supportMembers, session?.user?.id]);

	const handleAssign = async (userId: string | null) => {
		if (!detail?.id) return;

		setIsAssigning(true);
		const success = await updateTicket(tenant, detail.id, {
			assignedToUserId: userId,
		});

		if (success) {
			await onMessageSent(); // Refresh ticket details
		}
		setIsAssigning(false);
	};

	const handleSendReply = async () => {
		if (!replyText.trim() || !detail?.id) return;

		setIsSending(true);
		setError(null);

		const result = await postTicketMessage(
			tenant,
			detail.id,
			replyText.trim(),
			isPrivateNote,
		);

		if (result.success) {
			setReplyText("");
			setIsPrivateNote(false);
			await onMessageSent();
		} else {
			setError(result.error || "Failed to send message");
		}

		setIsSending(false);
	};

	// Helper to get initials from name
	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((part) => part[0])
			.join("")
			.toUpperCase()
			.substring(0, 2);
	};

	const priorityStyles = {
		urgent: "bg-red-100 text-red-700 border-red-200",
		high: "bg-orange-100 text-orange-700 border-orange-200",
		normal: "bg-blue-100 text-blue-700 border-blue-200",
		low: "bg-gray-100 text-gray-600 border-gray-200",
	};

	const statusStyles = {
		open: "bg-green-100 text-green-700 border-green-200",
		closed: "bg-gray-100 text-gray-600 border-gray-200",
		pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
		waiting_on_customer: "bg-orange-100 text-orange-700 border-orange-200",
		escalated: "bg-red-100 text-red-700 border-red-200",
	};

	return (
		<div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
			{/* Detail Header */}
			<div className="bg-white border-b border-gray-200 p-4">
				<div className="flex items-start justify-between">
					<div>
						<div className="flex items-center gap-2 mb-2">
							<h2 className="text-xl font-semibold text-gray-900">
								{ticket.title}
							</h2>
							<span
								className={`px-2 py-0.5 text-xs rounded border capitalize ${priorityStyles[ticket.priority]}`}
							>
								{ticket.priority === "normal"
									? "Normal"
									: ticket.priority.charAt(0).toUpperCase() +
										ticket.priority.slice(1)}
							</span>
							<span
								className={`px-2 py-0.5 text-xs rounded border capitalize ${statusStyles[ticket.status]}`}
							>
								{ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
							</span>
						</div>
						<div className="flex items-center gap-4 text-sm text-gray-500">
							<div className="flex items-center gap-1">
								<Mail size={14} />
								<span>Ticket {ticket.ticketNumber}</span>
							</div>
							<div className="flex items-center gap-1">
								<Clock size={14} />
								<span>Created {ticket.timeAgo}</span>
							</div>
							{ticket.aiTriage && (
								<div className="flex items-center gap-1">
									<Bot size={14} />
									<span>Triage: High Frustration Detected</span>
								</div>
							)}
						</div>
					</div>
					<div className="flex items-center gap-3">
						{/* Current Assignee Display */}
						<div className="flex items-center gap-2 text-sm text-gray-600">
							<span className="text-gray-400">Assigned to:</span>
							{detail?.assignedTo ? (
								<div className="flex items-center gap-2">
									<div className="w-6 h-6 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
										<span className="text-white text-xs font-medium">
											{detail.assignedTo.initials || getInitials(detail.assignedTo.name)}
										</span>
									</div>
									<span className="font-medium text-gray-900">{detail.assignedTo.name}</span>
								</div>
							) : (
								<span className="text-gray-500">Unassigned</span>
							)}
						</div>

						{/* Assignment Dropdown */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" disabled={isAssigning || isLoadingMembers}>
									{isAssigning ? (
										<Loader2 size={14} className="mr-1 animate-spin" />
									) : (
										<User size={14} className="mr-1" />
									)}
									Assign
									<ChevronDown size={14} className="ml-1" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuLabel>Assign to team member</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{currentUser && (
									<>
										<DropdownMenuItem
											onClick={() => handleAssign(currentUser.id)}
											className="cursor-pointer bg-emerald-50 hover:bg-emerald-100"
										>
											<UserPlus size={14} className="mr-2 text-emerald-600" />
											<span className="font-medium text-emerald-900">Assign to me</span>
											{detail?.assignedTo?.id === currentUser.id && (
												<Check size={14} className="ml-auto text-emerald-600" />
											)}
										</DropdownMenuItem>
										<DropdownMenuSeparator />
									</>
								)}
								<DropdownMenuItem
									onClick={() => handleAssign(null)}
									className="cursor-pointer"
								>
									<User size={14} className="mr-2 text-gray-400" />
									<span>Unassigned</span>
									{!detail?.assignedTo && (
										<Check size={14} className="ml-auto text-emerald-500" />
									)}
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								{isLoadingMembers ? (
									<div className="px-2 py-3 text-sm text-gray-500 text-center">
										Loading team members...
									</div>
								) : supportMembers.length === 0 ? (
									<div className="px-2 py-3 text-sm text-gray-500 text-center">
										No team members found
									</div>
								) : (
									supportMembers.map((member) => (
										<DropdownMenuItem
											key={member.id}
											onClick={() => handleAssign(member.id)}
											className="cursor-pointer"
										>
											<div className="w-6 h-6 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center mr-2">
												<span className="text-white text-xs font-medium">
													{getInitials(member.name)}
												</span>
											</div>
											<div className="flex flex-col">
												<span className="font-medium">{member.name}</span>
												<span className="text-xs text-gray-500">{member.email}</span>
											</div>
											{detail?.assignedTo?.id === member.id && (
												<Check size={14} className="ml-auto text-emerald-500" />
											)}
										</DropdownMenuItem>
									))
								)}
							</DropdownMenuContent>
						</DropdownMenu>

						<Button
							size="sm"
							className="bg-emerald-500 hover:bg-emerald-600 text-white"
						>
							Resolve
						</Button>
					</div>
				</div>
			</div>

			{/* Messages Area */}
			<div className="flex-1 overflow-auto p-4 space-y-4">
				{isLoadingDetail ? (
					<div className="flex items-center justify-center h-32">
						<div className="text-sm text-gray-500">
							Loading ticket details...
						</div>
					</div>
				) : detail ? (
					<>
						{/* Messages */}
						{detail.messages?.map((message, index) => (
							<div key={message.id || `message-${index}-${message.timestamp}-${message.type}`} className="flex gap-3">
								<div
									className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
										message.type === "customer"
											? "bg-linear-to-br from-blue-400 to-blue-600"
											: message.type === "ai"
												? "bg-linear-to-br from-violet-400 to-violet-600"
												: message.isInternal
													? "bg-linear-to-br from-amber-400 to-amber-600"
													: "bg-linear-to-br from-emerald-400 to-emerald-600"
									}`}
								>
									{message.type === "ai" ? (
										<Bot size={20} className="text-white" />
									) : message.isInternal ? (
										<Lock size={18} className="text-white" />
									) : (
										<span className="text-white text-sm font-medium">
											{message.author?.charAt(0) || "U"}
										</span>
									)}
								</div>
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										{message.type === "customer" && message.authorTenantUserId ? (
											<Link
												to={`/${tenant}/app/support/members/${message.authorTenantUserId}`}
												className="font-medium text-gray-900 hover:underline"
											>
												{message.author}
											</Link>
										) : (
											<span className="font-medium text-gray-900">
												{message.author}
											</span>
										)}
										{message.type === "customer" && (
											<span className="text-sm text-gray-500">
												{detail.customer?.company || ""}
											</span>
										)}
										{message.type === "ai" && (
											<span className="text-sm text-gray-500">
												AI Assistant
											</span>
										)}
										{message.type === "agent" && !message.isInternal && (
											<span className="text-sm text-gray-500">
												Support Agent
											</span>
										)}
										{message.isInternal && (
											<span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
												Internal Note
											</span>
										)}
										<span className="text-sm text-gray-400">
											• {message.timestamp}
										</span>
									</div>
									<div
										className={`rounded-lg border p-4 ${
											message.type === "ai"
												? "bg-violet-50 border-violet-200"
												: message.isInternal
													? "bg-amber-50 border-amber-200"
													: "bg-white border-gray-200"
										}`}
									>
										<p className="text-gray-700 whitespace-pre-line">
											{message.content}
										</p>
									</div>
								</div>
							</div>
						))}

						{/* AI Triage Summary */}
						{detail.aiTriage && (
							<div className="flex gap-3">
								<div className="w-10 h-10 rounded-full bg-linear-to-br from-violet-400 to-violet-600 flex items-center justify-center shrink-0">
									<Bot size={20} className="text-white" />
								</div>
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<span className="font-medium text-gray-900">
											Apollo (AI)
										</span>
										<span className="text-sm text-gray-500">Internal Note</span>
										<span className="text-sm text-gray-400">• 1h ago</span>
									</div>
									<div className="bg-violet-50 rounded-lg border border-violet-200 p-4">
										<h4 className="font-medium text-violet-900 mb-2">
											AI Triage Summary:
										</h4>
										<ul className="space-y-1 text-sm text-violet-800">
											<li>
												<span className="font-medium">Category:</span>{" "}
												{detail.aiTriage.category}
											</li>
											<li>
												<span className="font-medium">Sentiment:</span>{" "}
												{detail.aiTriage.sentiment}
											</li>
											<li>
												<span className="font-medium">Suggested Action:</span>{" "}
												{detail.aiTriage.suggestedAction}
											</li>
											{detail.aiTriage.playbook && (
												<li>
													<span className="font-medium">Playbook:</span>{" "}
													<a
														href={detail.aiTriage.playbookLink}
														className="text-blue-600 hover:underline"
													>
														{detail.aiTriage.playbook}
													</a>
												</li>
											)}
										</ul>
									</div>
								</div>
							</div>
						)}
					</>
				) : (
					<div className="flex items-center justify-center h-32">
						<div className="text-sm text-gray-500">No messages found</div>
					</div>
				)}
			</div>

			{/* Reply Section */}
			<div className="bg-white border-t border-gray-200 p-4">
				<div className="flex items-center gap-2 mb-3">
					<Button variant="outline" size="sm" className="text-sm">
						<Bot size={14} className="mr-1" />
						AI Draft Reply
					</Button>
					<Button variant="outline" size="sm" className="text-sm">
						Insert Article
					</Button>
					<Button
						variant={isPrivateNote ? "default" : "outline"}
						size="sm"
						className={`text-sm ${isPrivateNote ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
						onClick={() => setIsPrivateNote(!isPrivateNote)}
					>
						<Lock size={14} className="mr-1" />
						Private Note
					</Button>
				</div>
				{isPrivateNote && (
					<div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
						<Lock size={14} className="inline-block mr-1" />
						This is a private note and will not be visible to the customer.
					</div>
				)}
				<div className="relative">
					<textarea
						value={replyText}
						onChange={(e) => setReplyText(e.target.value)}
						placeholder={isPrivateNote ? "Type your internal note..." : "Type your reply or use AI to draft..."}
						className={`w-full h-24 px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:border-transparent text-sm ${
							isPrivateNote 
								? "border-amber-300 focus:ring-amber-500 bg-amber-50" 
								: "border-gray-200 focus:ring-emerald-500"
						}`}
						disabled={isSending}
					/>
				</div>
				{error && (
					<div className="mt-2 text-sm text-red-600">{error}</div>
				)}
				<div className="flex justify-end mt-3">
					<Button
						onClick={handleSendReply}
						disabled={!replyText.trim() || isSending}
						className={`${
							isPrivateNote
								? "bg-amber-500 hover:bg-amber-600"
								: "bg-emerald-500 hover:bg-emerald-600"
						} text-white`}
					>
						{isSending ? (
							<>
								<Loader2 size={14} className="mr-1 animate-spin" />
								Sending...
							</>
						) : (
							<>
								<Send size={14} className="mr-1" />
								{isPrivateNote ? "Add Note" : "Send Reply"}
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
