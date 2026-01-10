import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
	ArrowLeft,
	Plus,
	FileText,
	CheckCircle,
	Clock,
	AlertTriangle,
	XCircle,
	Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationHeader } from "@/components/OrganizationHeader";
import { OrganizationMetrics } from "@/components/OrganizationMetrics";
import { OrganizationInvoiceHistory } from "@/components/OrganizationInvoiceHistory";
import { OrganizationCustomProperties } from "@/components/OrganizationCustomProperties";
import { CRMContactsList } from "@/components/CRMContactsList";
import {
	CRMActivityTimeline,
	type Activity as CRMActivity,
} from "@/components/CRMActivityTimeline";
import { ProductSubscriptionsCard } from "@/components/ProductSubscriptionsCard";
import { CreateCustomerDialog } from "@/components/CreateCustomerDialog";
import { CreateContactDialog } from "@/components/CreateContactDialog";
import { CreateStandaloneInvoiceDialog } from "@/components/CreateStandaloneInvoiceDialog";
import { CreateQuoteDialog } from "@/components/CreateQuoteDialog";
import { QuoteList } from "@/components/QuoteList";
import { QuoteDetailDialog } from "@/components/QuoteDetailDialog";
import {
	sendQuote,
	acceptQuote,
	rejectQuote,
	getQuotePDFUrl,
	type Quote,
} from "@/data/quotes";

export const Route = createFileRoute("/$tenant/app/sales/crm/$customerId")({
	component: OrganizationDetailPage,
});

interface Contact {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	avatarUrl: string | null;
	title: string | null;
	role: string;
	isOwner: boolean;
	status: string;
	lastActivityAt: string | null;
	notes: string | null;
	createdAt: string;
}

interface Subscription {
	id: string;
	subscriptionNumber: string;
	productPlanId: string;
	planName: string;
	productId: string | null;
	productName: string | null;
	productStatus: string | null;
	status: string;
	billingCycle: string;
	seats: number;
	mrr: number;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	createdAt: string;
}

interface Invoice {
	id: string;
	invoiceNumber: string;
	status: string;
	subtotal: number;
	tax: number;
	total: number;
	currency: string;
	issueDate: string;
	dueDate: string;
	paidAt: string | null;
	subscriptionId: string;
	createdAt: string;
}

interface Deal {
	id: string;
	name: string;
	value: number;
	stageId: string;
	stageName: string;
	stageColor: string;
	assignedToUserId: string | null;
	badges: string[];
	nextTask: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

interface Activity {
	id: string;
	dealId: string;
	activityType: string;
	description: string;
	userId: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: string;
}

interface Customer {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	industry: string | null;
	website: string | null;
	billingEmail: string | null;
	billingAddress: string | null;
	assignedToUserId: string | null;
	importance: string | null;
	tags: string[];
	notes: string | null;
	metadata: Record<string, unknown>;
	subscriptionPlan: string | null;
	subscriptionStatus: string | null;
	createdAt: string;
	updatedAt: string;
}

interface OrganizationData {
	customer: Customer;
	subscriptions: Subscription[];
	contacts: Contact[];
	invoices: Invoice[];
	deals: Deal[];
	quotes: Quote[];
	activities: Activity[];
	metrics: {
		totalMRR: number;
		lifetimeIncome: number;
		contactCount: number;
		dealCount: number;
		invoiceCount: number;
		quoteCount: number;
	};
}

function OrganizationDetailPage() {
	const { tenant, customerId } = useParams({
		from: "/$tenant/app/sales/crm/$customerId",
	});

	const [data, setData] = useState<OrganizationData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<
		| "overview"
		| "contacts"
		| "invoices"
		| "deals"
		| "quotes"
		| "activity"
		| "properties"
		| "subscriptions"
	>("overview");
	const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
	const [isCreateInvoiceDialogOpen, setIsCreateInvoiceDialogOpen] =
		useState(false);
	const [isCreateQuoteDialogOpen, setIsCreateQuoteDialogOpen] = useState(false);
	const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
	const [isQuoteDetailDialogOpen, setIsQuoteDetailDialogOpen] = useState(false);
	const [quoteStatusFilter, setQuoteStatusFilter] = useState<
		"all" | "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted"
	>("all");

	// Fetch organization data
	const fetchOrganization = useCallback(async () => {
		if (!tenant || !customerId) {
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const url = `/${tenant}/api/crm/customers/${customerId}`;
			const response = await fetch(url);
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Failed to fetch organization data");
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
	}, [tenant, customerId]);

	useEffect(() => {
		fetchOrganization();
	}, [fetchOrganization]);

	const handleMetadataUpdate = async (newMetadata: Record<string, unknown>) => {
		if (!tenant || !customerId) return;

		try {
			const response = await fetch(
				`/${tenant}/api/crm/customers/${customerId}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ metadata: newMetadata }),
				},
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Failed to update custom properties");
			}

			// Update local data
			if (data) {
				setData({
					...data,
					customer: {
						...data.customer,
						metadata: newMetadata,
					},
				});
			}
		} catch (err) {
			console.error("Error updating metadata:", err);
			alert(
				err instanceof Error
					? err.message
					: "Failed to update custom properties",
			);
		}
	};

	if (isLoading) {
		return (
			<div className="container mx-auto p-6">
				<div className="flex items-center gap-2 mb-6">
					<Link to="/$tenant/app/sales/crm" params={{ tenant }}>
						<Button variant="ghost" size="sm">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to CRM
						</Button>
					</Link>
				</div>
				<div className="flex items-center justify-center h-64">
					<div className="text-muted-foreground">Loading organization...</div>
				</div>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="container mx-auto p-6">
				<div className="flex items-center gap-2 mb-6">
					<Link to="/$tenant/app/sales/crm" params={{ tenant }}>
						<Button variant="ghost" size="sm">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to CRM
						</Button>
					</Link>
				</div>
				<div className="flex items-center justify-center h-64">
					<div className="text-destructive">
						{error || "Organization not found"}
					</div>
				</div>
			</div>
		);
	}

	const {
		customer,
		subscriptions,
		contacts,
		invoices,
		deals,
		quotes,
		activities,
		metrics,
	} = data;

	const statusFilters = [
		{ value: "all" as const, label: "All", icon: FileText },
		{ value: "draft" as const, label: "Draft", icon: Clock },
		{ value: "sent" as const, label: "Sent", icon: Send },
		{ value: "accepted" as const, label: "Accepted", icon: CheckCircle },
		{ value: "rejected" as const, label: "Rejected", icon: XCircle },
		{ value: "expired" as const, label: "Expired", icon: AlertTriangle },
		{ value: "converted" as const, label: "Converted", icon: CheckCircle },
	];

	const filteredQuotes =
		quoteStatusFilter === "all"
			? quotes
			: quotes.filter((q) => q.status === quoteStatusFilter);

	const handleViewQuote = (quote: Quote) => {
		setSelectedQuote(quote);
		setIsQuoteDetailDialogOpen(true);
	};

	const handleSendQuote = async (quote: Quote) => {
		const result = await sendQuote(tenant, quote.id);
		if (result.success) {
			fetchOrganization();
		} else {
			alert(result.error || "Failed to send quote");
		}
	};

	const handleAcceptQuote = async (quote: Quote) => {
		const result = await acceptQuote(tenant, quote.id);
		if (result.success) {
			fetchOrganization();
			setIsQuoteDetailDialogOpen(false);
			setSelectedQuote(null);
		} else {
			alert(result.error || "Failed to accept quote");
		}
	};

	const handleRejectQuote = async (quote: Quote) => {
		const result = await rejectQuote(tenant, quote.id);
		if (result.success) {
			fetchOrganization();
			setIsQuoteDetailDialogOpen(false);
			setSelectedQuote(null);
		} else {
			alert(result.error || "Failed to reject quote");
		}
	};

	const handleDownloadQuotePDF = async (quote: Quote) => {
		try {
			const url = getQuotePDFUrl(tenant, quote.id);
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error("Failed to download PDF");
			}

			const blob = await response.blob();
			const downloadUrl = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = downloadUrl;
			a.download = `${quote.quoteNumber}.pdf`;
			a.style.display = "none";
			document.body.appendChild(a);
			a.click();

			// Use setTimeout to ensure click completes before cleanup
			setTimeout(() => {
				if (a.parentNode === document.body) {
					document.body.removeChild(a);
				}
				window.URL.revokeObjectURL(downloadUrl);
			}, 100);
		} catch (err) {
			console.error("Error downloading PDF:", err);
			alert("Failed to download quote PDF");
		}
	};

	// Transform activities to match CRMActivityTimeline component format
	function mapActivityType(
		activityType: string,
	):
		| "deal_created"
		| "deal_won"
		| "deal_lost"
		| "contact_added"
		| "note"
		| "meeting" {
		if (activityType === "deal_created") return "deal_created";
		if (activityType === "stage_change") return "deal_created";
		if (activityType === "deal_won" || activityType.includes("won"))
			return "deal_won";
		if (activityType === "deal_lost" || activityType.includes("lost"))
			return "deal_lost";
		if (activityType === "contact_added") return "contact_added";
		if (activityType === "meeting") return "meeting";
		return "note";
	}

	const transformedActivities: CRMActivity[] = activities.map((a) => ({
		id: a.id,
		type: mapActivityType(a.activityType),
		description: a.description,
		timestamp: a.createdAt,
		userId: a.userId || undefined,
		userName: undefined, // Could be fetched if needed
	}));

	return (
		<div className="container mx-auto p-6 space-y-6">
			{/* Breadcrumb Navigation */}
			<div className="flex items-center gap-2">
				<Link to="/$tenant/app/sales/crm" params={{ tenant }}>
					<Button variant="ghost" size="sm">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to CRM
					</Button>
				</Link>
			</div>

			{/* Organization Header */}
			<OrganizationHeader
				customer={customer}
				subscriptions={subscriptions}
				onEdit={() => setIsEditDialogOpen(true)}
				onAddContact={() => setIsAddContactDialogOpen(true)}
				onCreateInvoice={() => setIsCreateInvoiceDialogOpen(true)}
			/>

			{/* Metrics Cards */}
			<OrganizationMetrics metrics={metrics} />

			{/* Tabs */}
			<div className="border-b">
				<nav className="flex space-x-8">
					<button
						type="button"
						onClick={() => setActiveTab("overview")}
						className={`py-4 px-1 border-b-2 font-medium text-sm ${
							activeTab === "overview"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
						}`}
					>
						Overview
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("contacts")}
						className={`py-4 px-1 border-b-2 font-medium text-sm ${
							activeTab === "contacts"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
						}`}
					>
						Contacts ({contacts.length})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("invoices")}
						className={`py-4 px-1 border-b-2 font-medium text-sm ${
							activeTab === "invoices"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
						}`}
					>
						Invoices ({invoices.length})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("deals")}
						className={`py-4 px-1 border-b-2 font-medium text-sm ${
							activeTab === "deals"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
						}`}
					>
						Deals ({deals.length})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("quotes")}
						className={`py-4 px-1 border-b-2 font-medium text-sm ${
							activeTab === "quotes"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
						}`}
					>
						Quotes ({quotes.length})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("activity")}
						className={`py-4 px-1 border-b-2 font-medium text-sm ${
							activeTab === "activity"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
						}`}
					>
						Activity
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("properties")}
						className={`py-4 px-1 border-b-2 font-medium text-sm ${
							activeTab === "properties"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
						}`}
					>
						Custom Properties
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("subscriptions")}
						className={`py-4 px-1 border-b-2 font-medium text-sm ${
							activeTab === "subscriptions"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
						}`}
					>
						Subscriptions ({subscriptions.length})
					</button>
				</nav>
			</div>

			{/* Tab Content */}
			<div className="space-y-6">
				{activeTab === "overview" && (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Main content column */}
						<div className="lg:col-span-2 space-y-6">
							{/* Product Subscriptions Summary */}
							{subscriptions.length > 0 && (
								<div className="bg-card rounded-lg border p-6">
									<h2 className="text-lg font-semibold mb-4">
										Product Subscriptions
									</h2>
									<div className="space-y-4">
										{Array.from(
											new Set(
												subscriptions
													.filter((s) => s.productName)
													.map((s) => s.productName),
											),
										).map((productName) => {
											const productSubscriptions = subscriptions.filter(
												(s) => s.productName === productName,
											);
											const activeSub = productSubscriptions.find(
												(s) => s.status === "active",
											);
											return (
												<div
													key={productName}
													className="border rounded-lg p-4"
												>
													<div className="font-medium mb-2">{productName}</div>
													{activeSub && (
														<div className="grid grid-cols-2 gap-4 text-sm">
															<div>
																<div className="text-muted-foreground">
																	Plan
																</div>
																<div className="font-medium">
																	{activeSub.planName}
																</div>
															</div>
															<div>
																<div className="text-muted-foreground">MRR</div>
																<div className="font-medium">
																	${(activeSub.mrr / 100).toFixed(2)}
																</div>
															</div>
														</div>
													)}
													{productSubscriptions.length > 1 && (
														<div className="text-xs text-muted-foreground mt-2">
															{productSubscriptions.length} subscription(s)
															total
														</div>
													)}
												</div>
											);
										})}
										{subscriptions.filter((s) => !s.productName).length > 0 && (
											<div className="border rounded-lg p-4">
												<div className="font-medium mb-2">Other Plans</div>
												<div className="text-sm text-muted-foreground">
													{subscriptions.filter((s) => !s.productName).length}{" "}
													subscription(s) without product
												</div>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Notes */}
							{customer.notes && (
								<div className="bg-card rounded-lg border p-6">
									<h2 className="text-lg font-semibold mb-4">Notes</h2>
									<p className="text-sm whitespace-pre-wrap">
										{customer.notes}
									</p>
								</div>
							)}

							{/* Recent Activity */}
							<div className="bg-card rounded-lg border p-6">
								<h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
								<CRMActivityTimeline
									activities={transformedActivities.slice(0, 10)}
								/>
							</div>
						</div>

						{/* Sidebar */}
						<div className="space-y-6">
							{/* Details */}
							<div className="bg-card rounded-lg border p-6">
								<h2 className="text-lg font-semibold mb-4">Details</h2>
								<div className="space-y-3">
									{customer.industry && (
										<div>
											<div className="text-sm text-muted-foreground">
												Industry
											</div>
											<div className="font-medium">{customer.industry}</div>
										</div>
									)}
									{customer.website && (
										<div>
											<div className="text-sm text-muted-foreground">
												Website
											</div>
											<a
												href={customer.website}
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary hover:underline"
											>
												{customer.website}
											</a>
										</div>
									)}
									{customer.billingEmail && (
										<div>
											<div className="text-sm text-muted-foreground">
												Billing Email
											</div>
											<div className="font-medium">{customer.billingEmail}</div>
										</div>
									)}
									{customer.billingAddress && (
										<div>
											<div className="text-sm text-muted-foreground">
												Billing Address
											</div>
											<div className="font-medium whitespace-pre-wrap">
												{customer.billingAddress}
											</div>
										</div>
									)}
									{customer.tags.length > 0 && (
										<div>
											<div className="text-sm text-muted-foreground mb-2">
												Tags
											</div>
											<div className="flex flex-wrap gap-2">
												{customer.tags.map((tag) => (
													<span
														key={tag}
														className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
													>
														{tag}
													</span>
												))}
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{activeTab === "contacts" && (
					<div className="bg-card rounded-lg border">
						<div className="p-6 border-b flex items-center justify-between">
							<h2 className="text-lg font-semibold">Contacts</h2>
							<Button size="sm">
								<Plus className="h-4 w-4 mr-2" />
								Add Contact
							</Button>
						</div>
						<CRMContactsList
							contacts={contacts.map((c) => ({
								...c,
								customer: {
									id: customer.id,
									name: customer.name,
									slug: customer.slug,
									industry: customer.industry,
								},
								updatedAt: c.createdAt,
							}))}
							selectedIds={selectedContactIds}
							onSelectionChange={setSelectedContactIds}
							showCustomer={false}
						/>
					</div>
				)}

				{activeTab === "invoices" && (
					<div className="bg-card rounded-lg border">
						<div className="p-6 border-b">
							<h2 className="text-lg font-semibold">Invoice History</h2>
						</div>
						<OrganizationInvoiceHistory
							invoices={invoices}
							onInvoiceUpdated={fetchOrganization}
						/>
					</div>
				)}

				{activeTab === "deals" && (
					<div className="bg-card rounded-lg border">
						<div className="p-6 border-b flex items-center justify-between">
							<h2 className="text-lg font-semibold">Deals</h2>
							<Button size="sm">
								<Plus className="h-4 w-4 mr-2" />
								Create Deal
							</Button>
						</div>
						<div className="p-6">
							{deals.length === 0 ? (
								<div className="text-center text-muted-foreground py-8">
									No deals found for this organization
								</div>
							) : (
								<div className="space-y-4">
									{deals.map((deal) => (
										<div key={deal.id} className="border rounded-lg p-4">
											<div className="flex items-center justify-between mb-2">
												<h3 className="font-semibold">{deal.name}</h3>
												<div className="text-lg font-bold">
													${(deal.value / 100).toFixed(2)}
												</div>
											</div>
											<div className="flex items-center gap-4 text-sm text-muted-foreground">
												<span
													className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium`}
													style={{
														backgroundColor: `${deal.stageColor}20`,
														color: deal.stageColor,
													}}
												>
													{deal.stageName}
												</span>
												{deal.badges.map((badge) => (
													<span
														key={badge}
														className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
													>
														{badge}
													</span>
												))}
											</div>
											{deal.nextTask && (
												<div className="mt-2 text-sm">
													<span className="text-muted-foreground">Next: </span>
													{deal.nextTask}
												</div>
											)}
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}

				{activeTab === "quotes" && (
					<div className="bg-card rounded-lg border">
						<div className="p-6 border-b flex items-center justify-between">
							<h2 className="text-lg font-semibold">Quotes</h2>
							<Button
								size="sm"
								onClick={() => setIsCreateQuoteDialogOpen(true)}
							>
								<Plus className="h-4 w-4 mr-2" />
								Create Quote
							</Button>
						</div>
						<div className="p-6 space-y-4">
							{/* Status Filter Buttons */}
							<div className="flex items-center gap-2 overflow-x-auto pb-2">
								{statusFilters.map((filter) => {
									const Icon = filter.icon;
									const count =
										filter.value === "all"
											? quotes.length
											: quotes.filter((q) => q.status === filter.value).length;
									const isActive = quoteStatusFilter === filter.value;

									return (
										<button
											type="button"
											key={filter.value}
											onClick={() => setQuoteStatusFilter(filter.value)}
											className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
												isActive
													? "bg-indigo-500 text-white"
													: "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
											}`}
										>
											<Icon size={16} />
											{filter.label}
											{count > 0 && (
												<span
													className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
														isActive ? "bg-white/20" : "bg-gray-100"
													}`}
												>
													{count}
												</span>
											)}
										</button>
									);
								})}
							</div>

							{/* Quote List */}
							<QuoteList
								quotes={filteredQuotes}
								onViewQuote={handleViewQuote}
								onSendQuote={handleSendQuote}
								onDownloadPDF={handleDownloadQuotePDF}
							/>
						</div>
					</div>
				)}

				{activeTab === "activity" && (
					<div className="bg-card rounded-lg border">
						<div className="p-6 border-b">
							<h2 className="text-lg font-semibold">Activity Timeline</h2>
						</div>
						<div className="p-6">
							<CRMActivityTimeline activities={transformedActivities} />
						</div>
					</div>
				)}

				{activeTab === "properties" && (
					<div className="bg-card rounded-lg border">
						<div className="p-6 border-b">
							<h2 className="text-lg font-semibold">Custom Properties</h2>
						</div>
						<OrganizationCustomProperties
							metadata={customer.metadata}
							onUpdate={handleMetadataUpdate}
						/>
					</div>
				)}

				{activeTab === "subscriptions" && (
					<div className="bg-card rounded-lg border">
						<div className="p-6 border-b">
							<h2 className="text-lg font-semibold">Product Subscriptions</h2>
						</div>
						<div className="p-6">
							<ProductSubscriptionsCard subscriptions={subscriptions} />
						</div>
					</div>
				)}
			</div>

			{/* Edit Customer Dialog */}
			<CreateCustomerDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				onCustomerCreated={fetchOrganization}
				customerId={customerId}
			/>

			{/* Add Contact Dialog */}
			<CreateContactDialog
				open={isAddContactDialogOpen}
				onOpenChange={setIsAddContactDialogOpen}
				onContactCreated={fetchOrganization}
				customerId={customerId}
				customerName={customer.name}
			/>

			{/* Create Standalone Invoice Dialog */}
			<CreateStandaloneInvoiceDialog
				open={isCreateInvoiceDialogOpen}
				onOpenChange={setIsCreateInvoiceDialogOpen}
				onInvoiceCreated={fetchOrganization}
				customerId={customerId}
				customerName={customer.name}
			/>

			{/* Create Quote Dialog */}
			<CreateQuoteDialog
				open={isCreateQuoteDialogOpen}
				onOpenChange={setIsCreateQuoteDialogOpen}
				onQuoteCreated={fetchOrganization}
				preSelectedCompanyId={customerId}
				preSelectedCompanyName={customer.name}
			/>

			{/* Quote Detail Dialog */}
			<QuoteDetailDialog
				open={isQuoteDetailDialogOpen}
				onOpenChange={setIsQuoteDetailDialogOpen}
				quote={selectedQuote}
				onSendQuote={handleSendQuote}
				onAcceptQuote={handleAcceptQuote}
				onRejectQuote={handleRejectQuote}
				onDownloadPDF={handleDownloadQuotePDF}
			/>
		</div>
	);
}
