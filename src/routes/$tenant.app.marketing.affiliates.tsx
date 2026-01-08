import { createFileRoute } from "@tanstack/react-router";
import {
	Download,
	Link2,
	Shield,
	Users,
	DollarSign,
	Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/$tenant/app/marketing/affiliates")({
	component: AffiliatesPage,
});

type ProgramStatus = "active" | "paused" | "draft";

interface AffiliateProgram {
	id: string;
	name: string;
	status: ProgramStatus;
	revenueGenerated: number;
	partners: number;
	commission: string;
}

// Mock affiliate programs data
const mockPrograms: AffiliateProgram[] = [
	{
		id: "prog-1",
		name: "Partner Reseller Program",
		status: "active",
		revenueGenerated: 125000,
		partners: 45,
		commission: "20%",
	},
	{
		id: "prog-2",
		name: "Customer Referral Bonus",
		status: "active",
		revenueGenerated: 45000,
		partners: 1200,
		commission: "$50 Credit",
	},
	{
		id: "prog-3",
		name: "Agency Partner Program",
		status: "active",
		revenueGenerated: 89000,
		partners: 28,
		commission: "25%",
	},
	{
		id: "prog-4",
		name: "Influencer Affiliate",
		status: "paused",
		revenueGenerated: 12500,
		partners: 15,
		commission: "15%",
	},
];

const statusStyles: Record<ProgramStatus, string> = {
	active: "bg-emerald-100 text-emerald-700",
	paused: "bg-gray-100 text-gray-600",
	draft: "bg-amber-100 text-amber-700",
};

function AffiliatesPage() {
	const handleManagePartners = (program: AffiliateProgram) => {
		console.log("Manage partners for:", program.name);
	};

	const handleSettings = (program: AffiliateProgram) => {
		console.log("Settings for:", program.name);
	};

	return (
		<main className="flex-1 overflow-auto p-6">
			{/* Page Header */}
			<div className="flex items-start justify-between mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">
						Affiliate Center
					</h1>
					<p className="text-gray-500 text-sm mt-1">
						Manage referral programs and partner payouts.
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Button variant="outline">
						<Download size={18} className="mr-1" />
						Export Payouts
					</Button>
					<Button className="bg-rose-500 hover:bg-rose-600 text-white">
						<Link2 size={18} className="mr-1" />
						New Program
					</Button>
				</div>
			</div>

			{/* Program Cards Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{mockPrograms.map((program) => (
					<ProgramCard
						key={program.id}
						program={program}
						onManagePartners={() => handleManagePartners(program)}
						onSettings={() => handleSettings(program)}
					/>
				))}
			</div>
		</main>
	);
}

interface ProgramCardProps {
	program: AffiliateProgram;
	onManagePartners: () => void;
	onSettings: () => void;
}

function ProgramCard({
	program,
	onManagePartners,
	onSettings,
}: ProgramCardProps) {
	const formatCurrency = (value: number): string => {
		return `$${value.toLocaleString()}`;
	};

	return (
		<div className="bg-white rounded-lg border border-gray-200 p-5">
			{/* Header */}
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-start gap-3">
					<div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
						<Shield size={20} className="text-rose-500" />
					</div>
					<div>
						<h3 className="font-semibold text-gray-900">{program.name}</h3>
						<span
							className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded uppercase ${
								statusStyles[program.status]
							}`}
						>
							{program.status}
						</span>
					</div>
				</div>
				<div className="text-right">
					<p className="text-2xl font-semibold text-gray-900">
						{formatCurrency(program.revenueGenerated)}
					</p>
					<p className="text-xs text-gray-500 uppercase tracking-wide">
						Revenue Generated
					</p>
				</div>
			</div>

			{/* Metrics */}
			<div className="grid grid-cols-2 gap-4 mb-4">
				<div className="bg-gray-50 rounded-lg p-3">
					<div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide mb-1">
						<Users size={14} />
						<span>Partners</span>
					</div>
					<p className="text-xl font-semibold text-gray-900">
						{program.partners}
					</p>
				</div>
				<div className="bg-gray-50 rounded-lg p-3">
					<div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide mb-1">
						<DollarSign size={14} />
						<span>Commission</span>
					</div>
					<p className="text-xl font-semibold text-gray-900">
						{program.commission}
					</p>
				</div>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-3">
				<Button
					variant="outline"
					size="sm"
					className="flex-1"
					onClick={onManagePartners}
				>
					Manage Partners
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="flex-1"
					onClick={onSettings}
				>
					<Settings size={14} className="mr-1.5" />
					Settings
				</Button>
			</div>
		</div>
	);
}
