import {
	Building2,
	Mail,
	Phone,
	Briefcase,
	Shield,
	Ban,
	CheckCircle,
	Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

interface Member {
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
	createdAt: string;
}

interface Organization {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	industry: string | null;
	website: string | null;
	subscriptionStatus: string | null;
	subscriptionPlan: string | null;
}

interface MemberHeaderProps {
	member: Member;
	organization: Organization;
	tenant: string;
	onEdit: () => void;
	onToggleStatus: () => void;
	onResetPassword: () => void;
}

export function MemberHeader({
	member,
	organization,
	tenant,
	onEdit,
	onToggleStatus,
	onResetPassword,
}: MemberHeaderProps) {
	const getStatusBadge = (status: string) => {
		switch (status.toLowerCase()) {
			case "active":
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
						<CheckCircle className="h-3 w-3" />
						Active
					</span>
				);
			case "suspended":
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
						<Ban className="h-3 w-3" />
						Suspended
					</span>
				);
			case "invited":
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
						<Mail className="h-3 w-3" />
						Invited
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
						{status}
					</span>
				);
		}
	};

	const getRoleBadge = (role: string, isOwner: boolean) => {
		if (isOwner) {
			return (
				<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
					<Shield className="h-3 w-3" />
					Owner
				</span>
			);
		}

		switch (role.toLowerCase()) {
			case "admin":
				return (
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
						<Shield className="h-3 w-3" />
						Admin
					</span>
				);
			case "user":
				return (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
						User
					</span>
				);
			case "viewer":
				return (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
						Viewer
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
						{role}
					</span>
				);
		}
	};

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.substring(0, 2);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	return (
		<div className="bg-card rounded-lg border p-6">
			<div className="flex items-start justify-between">
				<div className="flex items-start gap-4 flex-1">
					{/* Avatar */}
					<div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0">
						{member.avatarUrl ? (
							<img
								src={member.avatarUrl}
								alt={member.name}
								className="w-full h-full rounded-full object-cover"
							/>
						) : (
							<span className="text-white text-2xl font-medium">
								{getInitials(member.name)}
							</span>
						)}
					</div>

					{/* Member Info */}
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-3 mb-2">
							<h2 className="text-2xl font-semibold text-gray-900">
								{member.name}
							</h2>
							{getStatusBadge(member.status)}
							{getRoleBadge(member.role, member.isOwner)}
						</div>

						{/* Contact Info */}
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-gray-600">
								<Mail className="h-4 w-4" />
								<a
									href={`mailto:${member.email}`}
									className="text-sm hover:text-primary"
								>
									{member.email}
								</a>
							</div>

							{member.phone && (
								<div className="flex items-center gap-2 text-gray-600">
									<Phone className="h-4 w-4" />
									<a
										href={`tel:${member.phone}`}
										className="text-sm hover:text-primary"
									>
										{member.phone}
									</a>
								</div>
							)}

							{member.title && (
								<div className="flex items-center gap-2 text-gray-600">
									<Briefcase className="h-4 w-4" />
									<span className="text-sm">{member.title}</span>
								</div>
							)}

							{/* Organization Link */}
							<div className="flex items-center gap-2 text-gray-600">
								<Building2 className="h-4 w-4" />
								<Link
									to="/$tenant/app/sales/crm/$customerId"
									params={{ tenant, customerId: organization.id }}
									className="text-sm hover:text-primary font-medium"
								>
									{organization.name}
								</Link>
								{organization.subscriptionStatus && (
									<span className="text-xs text-gray-500">
										({organization.subscriptionStatus})
									</span>
								)}
							</div>
						</div>

						{/* Metadata */}
						<div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
							<span>Member since {formatDate(member.createdAt)}</span>
							{member.lastActivityAt && (
								<span>Last active {formatDate(member.lastActivityAt)}</span>
							)}
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center gap-2 flex-shrink-0">
					<Button onClick={onEdit} variant="outline" size="sm">
						Edit
					</Button>
					<Button
						onClick={onToggleStatus}
						variant="outline"
						size="sm"
						className={
							member.status === "suspended"
								? "text-green-600 hover:text-green-700"
								: "text-red-600 hover:text-red-700"
						}
					>
						{member.status === "suspended" ? (
							<>
								<CheckCircle className="h-4 w-4 mr-2" />
								Activate
							</>
						) : (
							<>
								<Ban className="h-4 w-4 mr-2" />
								Suspend
							</>
						)}
					</Button>
					<Button onClick={onResetPassword} variant="outline" size="sm">
						<Key className="h-4 w-4 mr-2" />
						Reset Password
					</Button>
				</div>
			</div>
		</div>
	);
}
