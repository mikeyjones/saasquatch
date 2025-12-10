import { Ticket, Clock, AlertCircle, Users } from "lucide-react";

interface SupportMetrics {
	totalTickets: number;
	openTickets: number;
	closedTickets: number;
	urgentTickets: number;
	ticketsThisMonth: number;
	avgResponseTime: string | null;
	contactCount: number;
}

export function OrganizationSupportMetrics({
	metrics,
}: {
	metrics: SupportMetrics;
}) {
	const metricCards = [
		{
			label: "Total Tickets",
			value: metrics.totalTickets.toString(),
			icon: Ticket,
			color: "text-blue-600",
			bgColor: "bg-blue-50",
		},
		{
			label: "Open Tickets",
			value: metrics.openTickets.toString(),
			icon: AlertCircle,
			color: "text-orange-600",
			bgColor: "bg-orange-50",
		},
		{
			label: "Tickets This Month",
			value: metrics.ticketsThisMonth.toString(),
			icon: Clock,
			color: "text-purple-600",
			bgColor: "bg-purple-50",
		},
		{
			label: "Urgent Tickets",
			value: metrics.urgentTickets.toString(),
			icon: AlertCircle,
			color: "text-red-600",
			bgColor: "bg-red-50",
		},
		{
			label: "Team Members",
			value: metrics.contactCount.toString(),
			icon: Users,
			color: "text-emerald-600",
			bgColor: "bg-emerald-50",
		},
	];

	return (
		<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
			{metricCards.map((metric) => {
				const Icon = metric.icon;
				return (
					<div
						key={metric.label}
						className="bg-white rounded-lg border border-gray-200 p-4"
					>
						<div className="flex items-center justify-between mb-3">
							<div className={`p-2 rounded-lg ${metric.bgColor}`}>
								<Icon className={`h-5 w-5 ${metric.color}`} />
							</div>
						</div>
						<div className="space-y-1">
							<p className="text-2xl font-semibold text-gray-900">
								{metric.value}
							</p>
							<p className="text-sm text-gray-500">{metric.label}</p>
						</div>
					</div>
				);
			})}
		</div>
	);
}
