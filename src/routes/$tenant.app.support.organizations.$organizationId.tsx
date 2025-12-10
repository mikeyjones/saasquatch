import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationSupportHeader } from "@/components/OrganizationSupportHeader";
import { OrganizationSupportMetrics } from "@/components/OrganizationSupportMetrics";
import { OrganizationTicketHistory } from "@/components/OrganizationTicketHistory";

export const Route = createFileRoute(
	"/$tenant/app/support/organizations/$organizationId",
)({
	component: OrganizationSupportPage,
});

interface Organization {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	industry: string | null;
	website: string | null;
	billingEmail: string | null;
	billingAddress: string | null;
	subscriptionPlan: string | null;
	subscriptionStatus: string | null;
	tags: string[];
	notes: string | null;
	metadata: Record<string, string>;
	createdAt: string;
	updatedAt: string | null;
}

interface Subscription {
	id: string;
	subscriptionNumber: string;
	productPlanId: string;
	planName: string;
	status: string;
	billingCycle: string;
	mrr: string;
	seats: number;
	startDate: string | null;
	renewalDate: string | null;
	canceledAt: string | null;
	createdAt: string;
}

interface Contact {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	title: string | null;
	role: string;
	isOwner: boolean;
	status: string;
	lastActivityAt: string | null;
	createdAt: string;
}

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

interface Invoice {
	id: string;
	invoiceNumber: string;
	status: string;
	total: string;
	dueDate: string | null;
	paidAt: string | null;
	createdAt: string;
}

interface Metrics {
	totalTickets: number;
	openTickets: number;
	closedTickets: number;
	urgentTickets: number;
	ticketsThisMonth: number;
	avgResponseTime: string | null;
	contactCount: number;
	totalMRR: string;
}

interface OrganizationData {
	organization: Organization;
	subscriptions: Subscription[];
	contacts: Contact[];
	tickets: Ticket[];
	invoices: Invoice[];
	metrics: Metrics;
}

function OrganizationSupportPage() {
	const { tenant, organizationId } = Route.useParams();
	const navigate = useNavigate();
	const [data, setData] = useState<OrganizationData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<
		"overview" | "tickets" | "contacts" | "billing" | "notes"
	>("overview");

	useEffect(() => {
		const fetchData = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const response = await fetch(
					`/api/tenant/${tenant}/support/organizations/${organizationId}`,
				);
				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.error || "Failed to fetch organization");
				}

				setData(result);
			} catch (err) {
				console.error("Error fetching organization:", err);
				setError(
					err instanceof Error ? err.message : "Failed to load organization",
				);
			} finally {
				setIsLoading(false);
			}
		};

		if (tenant && organizationId) {
			fetchData();
		}
	}, [tenant, organizationId]);

	if (isLoading) {
		return (
			<main className="flex-1 overflow-auto p-6">
				<div className="container mx-auto">
					<div className="flex items-center justify-center h-64">
						<div className="text-gray-500">Loading organization...</div>
					</div>
				</div>
			</main>
		);
	}

	if (error || !data) {
		return (
			<main className="flex-1 overflow-auto p-6">
				<div className="container mx-auto">
					<div className="mb-6">
						<Link to={`/${tenant}/app/support/members`}>
							<Button variant="ghost" size="sm">
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back to Members
							</Button>
						</Link>
					</div>
					<div className="flex items-center justify-center h-64">
						<div className="text-red-600">{error || "Organization not found"}</div>
					</div>
				</div>
			</main>
		);
	}

	const { organization, subscriptions, contacts, tickets, invoices, metrics } =
		data;

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
		});
	};

	return (
		<main className="flex-1 overflow-auto p-6">
			<div className="container mx-auto space-y-6">
				{/* Breadcrumb */}
				<div className="flex items-center gap-2">
					<Link to={`/${tenant}/app/support/members`}>
						<Button variant="ghost" size="sm">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Members
						</Button>
					</Link>
				</div>

				{/* Organization Header */}
				<OrganizationSupportHeader
					organization={organization}
					onCreateTicket={() => {
						navigate({ to: `/${tenant}/app/support/tickets` });
					}}
					onContactCustomer={() => {
						// TODO: Implement contact customer functionality
						if (organization.billingEmail) {
							window.location.href = `mailto:${organization.billingEmail}`;
						} else {
							alert("No billing email available");
						}
					}}
					onAddNote={() => {
						// TODO: Implement add note functionality
						alert("Add note functionality coming soon");
					}}
				/>

				{/* Metrics */}
				<OrganizationSupportMetrics metrics={metrics} />

				{/* Tabs */}
				<div className="border-b">
					<nav className="flex space-x-8">
						{["overview", "tickets", "contacts", "billing", "notes"].map(
							(tab) => (
								<button
									key={tab}
									type="button"
									onClick={() =>
										setActiveTab(
											tab as
												| "overview"
												| "tickets"
												| "contacts"
												| "billing"
												| "notes",
										)
									}
									className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
										activeTab === tab
											? "border-blue-500 text-blue-600"
											: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
									}`}
								>
									{tab}
								</button>
							),
						)}
					</nav>
				</div>

				{/* Tab Content */}
				<div className="space-y-6">
					{/* Overview Tab */}
					{activeTab === "overview" && (
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Main content */}
							<div className="lg:col-span-2 space-y-6">
								{/* Recent Tickets */}
								<div className="bg-white rounded-lg border border-gray-200 p-6">
									<h2 className="text-lg font-semibold mb-4">Recent Tickets</h2>
									{tickets.length === 0 ? (
										<p className="text-gray-500 text-center py-8">
											No tickets yet
										</p>
									) : (
										<div className="space-y-3">
											{tickets.slice(0, 5).map((ticket) => (
												<div
													key={ticket.id}
													className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
												>
													<div>
														<div className="font-medium text-sm">
															{ticket.title}
														</div>
														<div className="text-xs text-gray-500">
															{ticket.ticketNumber} • {ticket.customerName}
														</div>
													</div>
													<span
														className={`px-2 py-1 text-xs rounded capitalize ${
															ticket.status === "open"
																? "bg-green-100 text-green-700"
																: ticket.status === "closed"
																	? "bg-gray-100 text-gray-600"
																	: "bg-yellow-100 text-yellow-700"
														}`}
													>
														{ticket.status}
													</span>
												</div>
											))}
										</div>
									)}
								</div>

								{/* Current Subscription */}
								{subscriptions.length > 0 && (
									<div className="bg-white rounded-lg border border-gray-200 p-6">
										<h2 className="text-lg font-semibold mb-4">
											Current Subscription
										</h2>
										{subscriptions.slice(0, 1).map((sub) => (
											<div key={sub.id} className="space-y-3">
												<div className="grid grid-cols-2 gap-4">
													<div>
														<div className="text-sm text-gray-500">Plan</div>
														<div className="font-medium">{sub.planName}</div>
													</div>
													<div>
														<div className="text-sm text-gray-500">Status</div>
														<div className="font-medium capitalize">
															{sub.status}
														</div>
													</div>
													<div>
														<div className="text-sm text-gray-500">MRR</div>
														<div className="font-medium">${sub.mrr}</div>
													</div>
													<div>
														<div className="text-sm text-gray-500">
															Billing Cycle
														</div>
														<div className="font-medium capitalize">
															{sub.billingCycle}
														</div>
													</div>
													<div>
														<div className="text-sm text-gray-500">Seats</div>
														<div className="font-medium">{sub.seats}</div>
													</div>
													{sub.renewalDate && (
														<div>
															<div className="text-sm text-gray-500">
																Renewal Date
															</div>
															<div className="font-medium">
																{formatDate(sub.renewalDate)}
															</div>
														</div>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Sidebar */}
							<div className="space-y-6">
								{/* Organization Details */}
								<div className="bg-white rounded-lg border border-gray-200 p-6">
									<h2 className="text-lg font-semibold mb-4">Details</h2>
									<div className="space-y-3">
										{organization.industry && (
											<div>
												<div className="text-sm text-gray-500">Industry</div>
												<div className="font-medium">
													{organization.industry}
												</div>
											</div>
										)}
										{organization.website && (
											<div>
												<div className="text-sm text-gray-500">Website</div>
												<a
													href={organization.website}
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-600 hover:underline"
												>
													{organization.website}
												</a>
											</div>
										)}
										{organization.billingEmail && (
											<div>
												<div className="text-sm text-gray-500">
													Billing Email
												</div>
												<a
													href={`mailto:${organization.billingEmail}`}
													className="text-blue-600 hover:underline"
												>
													{organization.billingEmail}
												</a>
											</div>
										)}
										<div>
											<div className="text-sm text-gray-500">Member Since</div>
											<div className="font-medium">
												{formatDate(organization.createdAt)}
											</div>
										</div>
									</div>
								</div>

								{/* Key Contacts */}
								<div className="bg-white rounded-lg border border-gray-200 p-6">
									<h2 className="text-lg font-semibold mb-4">Key Contacts</h2>
									{contacts.length === 0 ? (
										<p className="text-gray-500 text-sm">No contacts</p>
									) : (
										<div className="space-y-3">
											{contacts.slice(0, 3).map((contact) => (
												<div key={contact.id} className="flex items-start gap-3">
													<div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
														<span className="text-white text-sm font-medium">
															{contact.name
																.split(" ")
																.map((n) => n[0])
																.join("")
																.toUpperCase()
																.substring(0, 2)}
														</span>
													</div>
													<div className="flex-1 min-w-0">
														<Link
															to={`/${tenant}/app/support/members/${contact.id}`}
															className="font-medium text-sm hover:text-blue-600 hover:underline"
														>
															{contact.name}
														</Link>
														<div className="text-xs text-gray-500">
															{contact.email}
														</div>
														{contact.isOwner && (
															<span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
																Owner
															</span>
														)}
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Tickets Tab */}
					{activeTab === "tickets" && (
						<OrganizationTicketHistory tickets={tickets} tenant={tenant} />
					)}

					{/* Contacts Tab */}
					{activeTab === "contacts" && (
						<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
							<table className="w-full">
								<thead>
									<tr className="border-b border-gray-100 bg-gray-50">
										<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
											Name
										</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
											Email
										</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
											Phone
										</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
											Role
										</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
											Status
										</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
											Last Active
										</th>
									</tr>
								</thead>
								<tbody>
									{contacts.length === 0 ? (
										<tr>
											<td
												colSpan={6}
												className="px-6 py-12 text-center text-gray-500"
											>
												No contacts found
											</td>
										</tr>
									) : (
										contacts.map((contact) => (
											<tr
												key={contact.id}
												className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
											>
												<td className="px-6 py-4">
													<Link
														to={`/${tenant}/app/support/members/${contact.id}`}
														className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
													>
														{contact.name}
													</Link>
													{contact.isOwner && (
														<span className="ml-2 text-xs text-purple-600">
															(Owner)
														</span>
													)}
												</td>
												<td className="px-6 py-4">
													<a
														href={`mailto:${contact.email}`}
														className="text-blue-600 hover:underline text-sm"
													>
														{contact.email}
													</a>
												</td>
												<td className="px-6 py-4">
													<span className="text-sm text-gray-500">
														{contact.phone || "-"}
													</span>
												</td>
												<td className="px-6 py-4">
													<span className="text-sm text-gray-700 capitalize">
														{contact.role}
													</span>
												</td>
												<td className="px-6 py-4">
													<span
														className={`px-2 py-1 text-xs rounded capitalize ${
															contact.status === "active"
																? "bg-green-100 text-green-700"
																: "bg-red-100 text-red-700"
														}`}
													>
														{contact.status}
													</span>
												</td>
												<td className="px-6 py-4">
													<span className="text-sm text-gray-500">
														{contact.lastActivityAt
															? formatDate(contact.lastActivityAt)
															: "Never"}
													</span>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					)}

					{/* Billing Tab */}
					{activeTab === "billing" && (
						<div className="space-y-6">
							{/* Subscriptions */}
							<div className="bg-white rounded-lg border border-gray-200 p-6">
								<h2 className="text-lg font-semibold mb-4">Subscriptions</h2>
								{subscriptions.length === 0 ? (
									<p className="text-gray-500 text-center py-8">
										No subscriptions
									</p>
								) : (
									<div className="space-y-4">
										{subscriptions.map((sub) => (
											<div
												key={sub.id}
												className="border border-gray-100 rounded-lg p-4"
											>
												<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
													<div>
														<div className="text-sm text-gray-500">Plan</div>
														<div className="font-medium">{sub.planName}</div>
													</div>
													<div>
														<div className="text-sm text-gray-500">Status</div>
														<div className="font-medium capitalize">
															{sub.status}
														</div>
													</div>
													<div>
														<div className="text-sm text-gray-500">MRR</div>
														<div className="font-medium">${sub.mrr}</div>
													</div>
													<div>
														<div className="text-sm text-gray-500">Cycle</div>
														<div className="font-medium capitalize">
															{sub.billingCycle}
														</div>
													</div>
													<div>
														<div className="text-sm text-gray-500">Seats</div>
														<div className="font-medium">{sub.seats}</div>
													</div>
													{sub.renewalDate && (
														<div>
															<div className="text-sm text-gray-500">
																Renewal
															</div>
															<div className="font-medium">
																{formatDate(sub.renewalDate)}
															</div>
														</div>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Recent Invoices */}
							<div className="bg-white rounded-lg border border-gray-200 p-6">
								<h2 className="text-lg font-semibold mb-4">Recent Invoices</h2>
								{invoices.length === 0 ? (
									<p className="text-gray-500 text-center py-8">
										No invoices
									</p>
								) : (
									<table className="w-full">
										<thead>
											<tr className="border-b border-gray-100">
												<th className="text-left py-2 text-sm font-medium text-gray-500">
													Invoice #
												</th>
												<th className="text-left py-2 text-sm font-medium text-gray-500">
													Status
												</th>
												<th className="text-left py-2 text-sm font-medium text-gray-500">
													Amount
												</th>
												<th className="text-left py-2 text-sm font-medium text-gray-500">
													Date
												</th>
											</tr>
										</thead>
										<tbody>
											{invoices.map((invoice) => (
												<tr
													key={invoice.id}
													className="border-b border-gray-50"
												>
													<td className="py-3 text-sm">{invoice.invoiceNumber}</td>
													<td className="py-3">
														<span
															className={`px-2 py-1 text-xs rounded capitalize ${
																invoice.status === "paid"
																	? "bg-green-100 text-green-700"
																	: invoice.status === "draft"
																		? "bg-gray-100 text-gray-600"
																		: "bg-red-100 text-red-700"
															}`}
														>
															{invoice.status}
														</span>
													</td>
													<td className="py-3 text-sm font-medium">
														${invoice.total}
													</td>
													<td className="py-3 text-sm text-gray-500">
														{formatDate(invoice.createdAt)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
							</div>
						</div>
					)}

					{/* Notes Tab */}
					{activeTab === "notes" && (
						<div className="bg-white rounded-lg border border-gray-200 p-6">
							<h2 className="text-lg font-semibold mb-4">Support Notes</h2>
							<div className="space-y-4">
								{organization.notes ? (
									<div className="whitespace-pre-wrap text-sm text-gray-700 p-4 bg-gray-50 rounded-lg">
										{organization.notes}
									</div>
								) : (
									<p className="text-gray-500 text-center py-8">
										No notes available
									</p>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
