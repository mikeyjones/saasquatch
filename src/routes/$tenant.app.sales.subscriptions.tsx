import {
	createFileRoute,
	useParams,
	Link,
	useNavigate,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw, Plus, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	SubscriptionCard,
	type Subscription,
} from "@/components/SubscriptionCard";
import { CreateSubscriptionDialog } from "@/components/CreateSubscriptionDialog";

export const Route = createFileRoute("/$tenant/app/sales/subscriptions")({
	component: SubscriptionsPage,
});

interface SubscriptionsResponse {
	subscriptions: Subscription[];
	error?: string;
}

function SubscriptionsPage() {
	const { tenant } = useParams({ from: "/$tenant/app/sales/subscriptions" });
	const navigate = useNavigate();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	const { data, isLoading, error, refetch } = useQuery<SubscriptionsResponse>({
		queryKey: ["subscriptions", tenant],
		queryFn: async () => {
			const response = await fetch(`/api/tenant/${tenant}/subscriptions`);
			if (!response.ok) {
				throw new Error("Failed to fetch subscriptions");
			}
			return response.json();
		},
	});

	const subscriptions = data?.subscriptions || [];

	// Count draft subscriptions
	const draftCount = subscriptions.filter((s) => s.status === "draft").length;

	const handleViewUsage = (subscription: Subscription) => {
		console.log("View usage for:", subscription.companyName);
	};

	const handleModifyPlan = (subscription: Subscription) => {
		console.log("Modify plan for:", subscription.companyName);
	};

	const handleViewInvoice = (_subscription: Subscription) => {
		// Navigate to invoices page
		navigate({
			to: "/$tenant/app/sales/invoices",
			params: { tenant },
		});
	};

	const handleSyncMeters = () => {
		refetch();
	};

	const handleNewSubscription = () => {
		setIsCreateDialogOpen(true);
	};

	if (isLoading) {
		return (
			<main className="flex-1 overflow-auto p-6">
				<div className="flex items-center justify-center h-64">
					<Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
				</div>
			</main>
		);
	}

	if (error) {
		return (
			<main className="flex-1 overflow-auto p-6">
				<div className="flex flex-col items-center justify-center h-64">
					<p className="text-red-500 mb-4">Failed to load subscriptions</p>
					<Button variant="outline" onClick={() => refetch()}>
						Try Again
					</Button>
				</div>
			</main>
		);
	}

	return (
		<main className="flex-1 overflow-auto p-6">
			{/* Create Subscription Dialog */}
			<CreateSubscriptionDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				onSubscriptionCreated={() => {
					setIsCreateDialogOpen(false);
					refetch();
				}}
			/>

			{/* Page Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">
						Subscriptions & Usage
					</h1>
					{draftCount > 0 && (
						<p className="text-sm text-amber-600 mt-1">
							{draftCount} subscription{draftCount > 1 ? "s" : ""} pending
							invoice payment
						</p>
					)}
				</div>
				<div className="flex items-center gap-3">
					<Link to="/$tenant/app/sales/invoices" params={{ tenant }}>
						<Button variant="outline">
							<FileText size={18} className="mr-1" />
							View Invoices
						</Button>
					</Link>
					<Button variant="outline" onClick={handleSyncMeters}>
						<RefreshCw size={18} className="mr-1" />
						Sync Meters
					</Button>
					<Button
						className="bg-indigo-500 hover:bg-indigo-600 text-white"
						onClick={handleNewSubscription}
					>
						<Plus size={18} className="mr-1" />
						New Subscription
					</Button>
				</div>
			</div>

			{/* Subscription Cards Grid */}
			{subscriptions.length === 0 ? (
				<div className="flex flex-col items-center justify-center h-64 text-gray-500">
					<p className="mb-4">No subscriptions found</p>
					<Button
						className="bg-indigo-500 hover:bg-indigo-600 text-white"
						onClick={handleNewSubscription}
					>
						<Plus size={18} className="mr-1" />
						Create First Subscription
					</Button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{subscriptions.map((subscription) => (
						<SubscriptionCard
							key={subscription.id}
							subscription={subscription}
							onViewUsage={handleViewUsage}
							onModifyPlan={handleModifyPlan}
							onViewInvoice={handleViewInvoice}
						/>
					))}
				</div>
			)}
		</main>
	);
}
