import { Building, Mail, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Organization {
	id: string;
	name: string;
	logo: string | null;
	industry: string | null;
	website: string | null;
	subscriptionPlan: string | null;
	subscriptionStatus: string | null;
	tags: string[];
}

export function OrganizationSupportHeader({
	organization,
	onCreateTicket,
	onContactCustomer,
	onAddNote,
}: {
	organization: Organization;
	onCreateTicket?: () => void;
	onContactCustomer?: () => void;
	onAddNote?: () => void;
}) {
	const statusStyles = {
		active: "bg-green-100 text-green-700 border-green-200",
		trialing: "bg-blue-100 text-blue-700 border-blue-200",
		canceled: "bg-red-100 text-red-700 border-red-200",
		past_due: "bg-orange-100 text-orange-700 border-orange-200",
	};

	const statusBadge = organization.subscriptionStatus
		? statusStyles[
				organization.subscriptionStatus as keyof typeof statusStyles
			] || "bg-gray-100 text-gray-700 border-gray-200"
		: "bg-gray-100 text-gray-700 border-gray-200";

	return (
		<div className="bg-white rounded-lg border border-gray-200 p-6">
			<div className="flex items-start justify-between">
				{/* Left side - Organization info */}
				<div className="flex items-start gap-4">
					{/* Logo */}
					<div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
						{organization.logo ? (
							<img
								src={organization.logo}
								alt={organization.name}
								className="w-full h-full object-cover rounded-lg"
							/>
						) : (
							<Building className="w-8 h-8 text-white" />
						)}
					</div>

					{/* Organization details */}
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							<h1 className="text-2xl font-semibold text-gray-900">
								{organization.name}
							</h1>
							{organization.subscriptionStatus && (
								<span
									className={`px-3 py-1 text-xs font-medium rounded-md border capitalize ${statusBadge}`}
								>
									{organization.subscriptionStatus.replace("_", " ")}
								</span>
							)}
						</div>

						{/* Quick info */}
						<div className="flex items-center gap-4 text-sm text-gray-500">
							{organization.industry && (
								<div className="flex items-center gap-1">
									<Building size={14} />
									<span>{organization.industry}</span>
								</div>
							)}
							{organization.website && (
								<a
									href={organization.website}
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-blue-600 hover:underline"
								>
									{organization.website}
								</a>
							)}
							{organization.subscriptionPlan && (
								<div className="flex items-center gap-1">
									<span className="font-medium">Plan:</span>
									<span className="capitalize">
										{organization.subscriptionPlan}
									</span>
								</div>
							)}
						</div>

						{/* Tags */}
						{organization.tags && organization.tags.length > 0 && (
							<div className="flex items-center gap-2 flex-wrap">
								{organization.tags.map((tag, index) => (
									<span
										key={index}
										className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
									>
										{tag}
									</span>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Right side - Actions */}
				<div className="flex items-center gap-3">
					{onCreateTicket && (
						<Button
							onClick={onCreateTicket}
							size="sm"
							className="bg-blue-500 hover:bg-blue-600 text-white"
						>
							<Plus size={14} className="mr-1" />
							Create Ticket
						</Button>
					)}
					{onContactCustomer && (
						<Button onClick={onContactCustomer} variant="outline" size="sm">
							<Mail size={14} className="mr-1" />
							Contact Customer
						</Button>
					)}
					{onAddNote && (
						<Button onClick={onAddNote} variant="outline" size="sm">
							<FileText size={14} className="mr-1" />
							Add Note
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
