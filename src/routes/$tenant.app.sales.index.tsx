import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense } from "react";
import {
	DollarSign,
	TrendingUp,
	TrendingDown,
	Users,
	BarChart3,
	Sparkles,
	RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const RevenueGrowthChart = lazy(() =>
	import("@/components/RevenueGrowthChart").then((mod) => ({
		default: mod.RevenueGrowthChart,
	})),
);

export const Route = createFileRoute("/$tenant/app/sales/")({
	component: SalesDashboard,
});

// Mock data for KPI cards
const kpiData = [
	{
		id: "total-revenue",
		title: "Total Revenue (ARR)",
		value: "$1.2M",
		change: "+12%",
		trend: "up" as const,
		icon: DollarSign,
		iconColor: "text-indigo-500",
		iconBg: "bg-indigo-50",
	},
	{
		id: "pipeline-value",
		title: "Pipeline Value",
		value: "$450K",
		change: "+5%",
		trend: "up" as const,
		icon: TrendingUp,
		iconColor: "text-indigo-500",
		iconBg: "bg-indigo-50",
	},
	{
		id: "active-trials",
		title: "Active Trials",
		value: "142",
		change: "+18%",
		trend: "up" as const,
		icon: Users,
		iconColor: "text-indigo-500",
		iconBg: "bg-indigo-50",
	},
	{
		id: "churn-rate",
		title: "Churn Rate",
		value: "2.1%",
		change: "-0.5%",
		trend: "down" as const,
		icon: BarChart3,
		iconColor: "text-indigo-500",
		iconBg: "bg-indigo-50",
	},
];

// Mock data for revenue chart
const revenueChartData = [
	{ day: "Mon", revenue: 2400 },
	{ day: "Tue", revenue: 2100 },
	{ day: "Wed", revenue: 2800 },
	{ day: "Thu", revenue: 2600 },
	{ day: "Fri", revenue: 3200 },
	{ day: "Sat", revenue: 3800 },
	{ day: "Sun", revenue: 3500 },
];

// Mock data for recent deals
const recentDeals = [
	{
		id: "1",
		company: "Acme Corp",
		description: "Enterprise License - 500 Seats",
		amount: "$120,000",
		status: "NEGOTIATION" as const,
	},
	{
		id: "2",
		company: "StartUp Inc",
		description: "Starter Plan - Annual",
		amount: "$5,000",
		status: "LEAD" as const,
	},
	{
		id: "3",
		company: "TechFlow",
		description: "Pro Plan Upgrade",
		amount: "$25,000",
		status: "MEETING" as const,
	},
	{
		id: "4",
		company: "Global Logistics",
		description: "Custom Integration",
		amount: "$85,000",
		status: "CLOSED WON" as const,
	},
	{
		id: "5",
		company: "DataMinds",
		description: "API Access Tier 3",
		amount: "$45,000",
		status: "NEGOTIATION" as const,
	},
];

const statusStyles = {
	NEGOTIATION: "bg-amber-100 text-amber-700",
	LEAD: "bg-gray-100 text-gray-600",
	MEETING: "bg-blue-100 text-blue-700",
	"CLOSED WON": "bg-emerald-100 text-emerald-700",
};

function SalesDashboard() {
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	return (
		<main className="flex-1 overflow-auto p-6">
			{/* Page Header */}
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-semibold text-gray-900">Sales Overview</h1>
				<p className="text-gray-500 text-sm">Last updated: Just now</p>
			</div>

			{/* Apollo's Executive Brief */}
			<Card className="mb-6 bg-white border-gray-200 overflow-hidden">
				<CardContent className="p-0">
					<div className="flex items-start gap-4 p-5">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-2">
								<Sparkles size={20} className="text-indigo-500" />
								<h2 className="text-lg font-semibold text-gray-900">
									Apollo's Executive Brief
								</h2>
							</div>
							<p className="text-gray-500 text-sm">
								AI Service Unavailable for Brief Generation.
							</p>
							<button
								type="button"
								className="mt-3 flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium transition-colors"
							>
								<RefreshCw size={14} />
								REFRESH ANALYSIS
							</button>
						</div>
						<div className="hidden lg:block opacity-20">
							<Sparkles size={120} className="text-indigo-300" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				{kpiData.map((kpi) => {
					const Icon = kpi.icon;
					const isPositive =
						kpi.id === "churn-rate" ? kpi.trend === "down" : kpi.trend === "up";
					return (
						<Card key={kpi.id} className="bg-white border-gray-200 py-0">
							<CardContent className="p-4">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div className={`p-2 rounded-lg ${kpi.iconBg}`}>
											<Icon
												size={20}
												className={kpi.iconColor}
												strokeWidth={1.5}
											/>
										</div>
										<div
											className={`flex items-center gap-1 text-sm font-medium ${
												isPositive ? "text-emerald-500" : "text-red-500"
											}`}
										>
											{isPositive ? (
												<TrendingUp size={14} />
											) : (
												<TrendingDown size={14} />
											)}
											<span>{kpi.change}</span>
										</div>
									</div>
								</div>
								<div className="mt-3">
									<p className="text-gray-500 text-xs font-medium">
										{kpi.title}
									</p>
									<p className="text-2xl font-semibold text-gray-900 mt-1">
										{kpi.value}
									</p>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Chart and Recent Deals Row */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Revenue Growth Chart */}
				<Card className="lg:col-span-2 bg-white border-gray-200 py-0">
					<CardContent className="p-5">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold text-gray-900">
								Revenue Growth (ARR)
							</h2>
						</div>
						<div className="h-72">
							{isClient ? (
								<Suspense
									fallback={
										<div className="w-full h-full flex items-center justify-center text-gray-400">
											Loading chart...
										</div>
									}
								>
									<RevenueGrowthChart data={revenueChartData} />
								</Suspense>
							) : (
								<div className="w-full h-full flex items-center justify-center text-gray-400">
									Loading chart...
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Recent Deals */}
				<Card className="bg-white border-gray-200 py-0">
					<CardContent className="p-5">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold text-gray-900">
								Recent Deals
							</h2>
							<button
								type="button"
								className="text-indigo-500 hover:text-indigo-600 text-sm font-medium transition-colors"
							>
								View All
							</button>
						</div>
						<div className="space-y-4">
							{recentDeals.map((deal) => (
								<div
									key={deal.id}
									className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0"
								>
									<div className="flex-1 min-w-0">
										<h3 className="font-medium text-gray-900 text-sm">
											{deal.company}
										</h3>
										<p className="text-gray-500 text-xs mt-0.5 truncate">
											{deal.description}
										</p>
									</div>
									<div className="text-right ml-4">
										<p className="font-semibold text-gray-900 text-sm">
											{deal.amount}
										</p>
										<span
											className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${
												statusStyles[deal.status]
											}`}
										>
											{deal.status}
										</span>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
