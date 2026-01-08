import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect, useId } from "react";
import { ArrowLeft, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberHeader } from "@/components/MemberHeader";
import { Input } from "@/components/ui/input";
import { AuditLog } from "@/components/AuditLog";

export const Route = createFileRoute("/$tenant/app/support/members/$memberId")({
	component: MemberDetailPage,
});

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
	notes: string | null;
	createdAt: string;
	updatedAt: string;
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

interface MemberData {
	member: Member;
	organization: Organization;
}

interface AuditLogEntry {
	id: string;
	performedByUserId: string | null;
	performedByName: string;
	action: string;
	fieldName: string | null;
	oldValue: string | null;
	newValue: string | null;
	metadata: string | null;
	createdAt: string;
}

function MemberDetailPage() {
	const { tenant, memberId } = useParams({
		from: "/$tenant/app/support/members/$memberId",
	});
	const nameId = useId();
	const emailId = useId();
	const phoneId = useId();
	const titleId = useId();
	const roleId = useId();

	const [data, setData] = useState<MemberData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"overview" | "activity" | "notes">(
		"overview",
	);

	// Edit mode state
	const [isEditing, setIsEditing] = useState(false);
	const [editedMember, setEditedMember] = useState<Partial<Member>>({});
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	// Audit log state
	const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
	const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);

	// Fetch member data
	useEffect(() => {
		const fetchMember = async () => {
			if (!tenant || !memberId) {
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				const url = `/api/tenant/${tenant}/members/${memberId}`;
				const response = await fetch(url);
				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.error || "Failed to fetch member data");
				}

				setData(result);
			} catch (err) {
				console.error("Error fetching member:", err);
				setError(err instanceof Error ? err.message : "Failed to load member");
			} finally {
				setIsLoading(false);
			}
		};

		fetchMember();
	}, [tenant, memberId]);

	// Fetch audit logs when activity tab is selected
	useEffect(() => {
		const fetchAuditLogs = async () => {
			if (activeTab !== "activity" || !tenant || !memberId) {
				return;
			}

			setIsLoadingAuditLogs(true);
			try {
				const url = `/api/tenant/${tenant}/members/${memberId}/audit-logs`;
				const response = await fetch(url);
				const result = await response.json();

				if (response.ok) {
					setAuditLogs(result.logs || []);
				}
			} catch (err) {
				console.error("Error fetching audit logs:", err);
			} finally {
				setIsLoadingAuditLogs(false);
			}
		};

		fetchAuditLogs();
	}, [activeTab, tenant, memberId]);

	const handleEdit = () => {
		if (data) {
			setEditedMember({
				name: data.member.name,
				email: data.member.email,
				phone: data.member.phone,
				title: data.member.title,
				role: data.member.role,
				notes: data.member.notes,
			});
			setIsEditing(true);
		}
	};

	const handleCancelEdit = () => {
		setIsEditing(false);
		setEditedMember({});
		setSaveError(null);
	};

	const handleSaveEdit = async () => {
		if (!tenant || !memberId || !data) return;

		// Check if role is changing
		const roleChanged =
			editedMember.role && editedMember.role !== data.member.role;

		// Confirm role changes, especially for owner role
		if (roleChanged) {
			const isChangingFromOwner =
				data.member.isOwner || data.member.role === "owner";
			const isChangingToOwner = editedMember.role === "owner";

			let confirmMessage = "";
			if (isChangingFromOwner) {
				confirmMessage = `Are you sure you want to change this member's role from Owner to ${editedMember.role}? This will remove their owner privileges.`;
			} else if (isChangingToOwner) {
				confirmMessage = `Are you sure you want to promote this member to Owner? They will have full administrative access.`;
			} else {
				confirmMessage = `Are you sure you want to change this member's role from ${data.member.role} to ${editedMember.role}?`;
			}

			if (!confirm(confirmMessage)) {
				return;
			}
		}

		setIsSaving(true);
		setSaveError(null);
		try {
			const response = await fetch(
				`/api/tenant/${tenant}/members/${memberId}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(editedMember),
				},
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Failed to update member");
			}

			// Update local data
			setData({
				...data,
				member: { ...data.member, ...result.member },
			});
			setIsEditing(false);
			setEditedMember({});
			setSaveError(null);

			// Refresh audit logs if we're on activity tab
			if (activeTab === "activity") {
				const auditResponse = await fetch(
					`/api/tenant/${tenant}/members/${memberId}/audit-logs`,
				);
				const auditResult = await auditResponse.json();
				if (auditResponse.ok) {
					setAuditLogs(auditResult.logs || []);
				}
			}
		} catch (err) {
			console.error("Error updating member:", err);
			const errorMessage =
				err instanceof Error ? err.message : "Failed to update member";
			setSaveError(errorMessage);
		} finally {
			setIsSaving(false);
		}
	};

	const handleToggleStatus = async () => {
		if (!data || !tenant || !memberId) return;

		const newStatus =
			data.member.status === "suspended" ? "active" : "suspended";

		const confirmed = confirm(
			`Are you sure you want to ${newStatus === "suspended" ? "suspend" : "activate"} this member?`,
		);

		if (!confirmed) return;

		try {
			const response = await fetch(
				`/api/tenant/${tenant}/members/${memberId}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status: newStatus }),
				},
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Failed to update member status");
			}

			// Update local data
			setData({
				...data,
				member: { ...data.member, ...result.member },
			});
		} catch (err) {
			console.error("Error updating member status:", err);
			alert(
				err instanceof Error ? err.message : "Failed to update member status",
			);
		}
	};

	const handleResetPassword = async () => {
		if (!data) return;

		const confirmed = confirm(
			`Send a password reset email to ${data.member.email}?`,
		);

		if (!confirmed) return;

		// TODO: Implement password reset API call
		alert(
			"Password reset functionality will be implemented with Better Auth integration",
		);
	};

	if (isLoading) {
		return (
			<main className="flex-1 overflow-auto p-6">
				<div className="container mx-auto">
					<div className="flex items-center gap-2 mb-6">
						<Link to="/$tenant/app/support/members" params={{ tenant }}>
							<Button variant="ghost" size="sm">
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back to Members
							</Button>
						</Link>
					</div>
					<div className="flex items-center justify-center h-64">
						<div className="text-muted-foreground">Loading member...</div>
					</div>
				</div>
			</main>
		);
	}

	if (error || !data) {
		return (
			<main className="flex-1 overflow-auto p-6">
				<div className="container mx-auto">
					<div className="flex items-center gap-2 mb-6">
						<Link to="/$tenant/app/support/members" params={{ tenant }}>
							<Button variant="ghost" size="sm">
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back to Members
							</Button>
						</Link>
					</div>
					<div className="flex items-center justify-center h-64">
						<div className="text-destructive">
							{error || "Member not found"}
						</div>
					</div>
				</div>
			</main>
		);
	}

	const { member, organization } = data;

	return (
		<main className="flex-1 overflow-auto p-6">
			<div className="container mx-auto space-y-6">
				{/* Breadcrumb Navigation */}
				<div className="flex items-center gap-2">
					<Link to="/$tenant/app/support/members" params={{ tenant }}>
						<Button variant="ghost" size="sm">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Members
						</Button>
					</Link>
				</div>

				{/* Member Header */}
				<MemberHeader
					member={member}
					organization={organization}
					tenant={tenant}
					onEdit={handleEdit}
					onToggleStatus={handleToggleStatus}
					onResetPassword={handleResetPassword}
				/>

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
							onClick={() => setActiveTab("notes")}
							className={`py-4 px-1 border-b-2 font-medium text-sm ${
								activeTab === "notes"
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
							}`}
						>
							Notes
						</button>
					</nav>
				</div>

				{/* Tab Content */}
				<div className="space-y-6">
					{activeTab === "overview" && (
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Main content column */}
							<div className="lg:col-span-2 space-y-6">
								{/* Contact Information */}
								<div className="bg-card rounded-lg border p-6">
									<div className="flex items-center justify-between mb-4">
										<h2 className="text-lg font-semibold">
											Contact Information
										</h2>
										{!isEditing && (
											<Button onClick={handleEdit} variant="outline" size="sm">
												<Edit2 className="h-4 w-4 mr-2" />
												Edit
											</Button>
										)}
										{isEditing && (
											<div className="flex gap-2">
												<Button
													onClick={handleCancelEdit}
													variant="outline"
													size="sm"
													disabled={isSaving}
												>
													<X className="h-4 w-4 mr-2" />
													Cancel
												</Button>
												<Button
													onClick={handleSaveEdit}
													size="sm"
													disabled={isSaving}
												>
													<Save className="h-4 w-4 mr-2" />
													{isSaving ? "Saving..." : "Save"}
												</Button>
											</div>
										)}
									</div>

									{saveError && (
										<div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
											<p className="text-sm text-destructive">{saveError}</p>
										</div>
									)}

									<div className="grid grid-cols-2 gap-4">
										<div>
											<label
												htmlFor={nameId}
												className="text-sm font-medium text-muted-foreground"
											>
												Name
											</label>
											{isEditing ? (
												<Input
													id={nameId}
													value={editedMember.name || ""}
													onChange={(e) =>
														setEditedMember({
															...editedMember,
															name: e.target.value,
														})
													}
													className="mt-1"
												/>
											) : (
												<div id={nameId} className="mt-1 font-medium">
													{member.name}
												</div>
											)}
										</div>
										<div>
											<label
												htmlFor={emailId}
												className="text-sm font-medium text-muted-foreground"
											>
												Email
											</label>
											{isEditing ? (
												<Input
													id={emailId}
													type="email"
													value={editedMember.email || ""}
													onChange={(e) =>
														setEditedMember({
															...editedMember,
															email: e.target.value,
														})
													}
													className="mt-1"
												/>
											) : (
												<div id={emailId} className="mt-1 font-medium">
													{member.email}
												</div>
											)}
										</div>
										<div>
											<label
												htmlFor={phoneId}
												className="text-sm font-medium text-muted-foreground"
											>
												Phone
											</label>
											{isEditing ? (
												<Input
													id={phoneId}
													type="tel"
													value={editedMember.phone || ""}
													onChange={(e) =>
														setEditedMember({
															...editedMember,
															phone: e.target.value,
														})
													}
													className="mt-1"
													placeholder="Optional"
												/>
											) : (
												<div id={phoneId} className="mt-1 font-medium">
													{member.phone || (
														<span className="text-muted-foreground italic">
															Not provided
														</span>
													)}
												</div>
											)}
										</div>
										<div>
											<label
												htmlFor={titleId}
												className="text-sm font-medium text-muted-foreground"
											>
												Title
											</label>
											{isEditing ? (
												<Input
													id={titleId}
													value={editedMember.title || ""}
													onChange={(e) =>
														setEditedMember({
															...editedMember,
															title: e.target.value,
														})
													}
													className="mt-1"
													placeholder="Optional"
												/>
											) : (
												<div id={titleId} className="mt-1 font-medium">
													{member.title || (
														<span className="text-muted-foreground italic">
															Not provided
														</span>
													)}
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Role & Permissions */}
								<div className="bg-card rounded-lg border p-6">
									<h2 className="text-lg font-semibold mb-4">
										Role & Permissions
									</h2>
									<div className="space-y-3">
										<div>
											<label
												htmlFor={roleId}
												className="text-sm font-medium text-muted-foreground"
											>
												Role
											</label>
											{isEditing ? (
												<select
													id={roleId}
													value={editedMember.role || member.role}
													onChange={(e) =>
														setEditedMember({
															...editedMember,
															role: e.target.value,
														})
													}
													className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
													disabled={member.isOwner}
												>
													<option value="owner">Owner</option>
													<option value="admin">Admin</option>
													<option value="user">User</option>
													<option value="viewer">Viewer</option>
												</select>
											) : (
												<div id={roleId} className="mt-1">
													<span className="font-medium capitalize">
														{member.role}
													</span>
													{member.isOwner && (
														<span className="text-purple-600 text-sm ml-2">
															(Owner)
														</span>
													)}
												</div>
											)}
											{member.isOwner && isEditing && (
												<p className="text-xs text-muted-foreground mt-1">
													Owner role cannot be changed
												</p>
											)}
										</div>
									</div>
								</div>
							</div>

							{/* Sidebar */}
							<div className="space-y-6">
								{/* Organization Details */}
								<div className="bg-card rounded-lg border p-6">
									<h2 className="text-lg font-semibold mb-4">Organization</h2>
									<div className="space-y-3">
										<div>
											<div className="text-sm text-muted-foreground">Name</div>
											<Link
												to="/$tenant/app/support/organizations/$organizationId"
												params={{ tenant, organizationId: organization.id }}
												className="font-medium text-primary hover:underline"
											>
												{organization.name}
											</Link>
										</div>
										{organization.industry && (
											<div>
												<div className="text-sm text-muted-foreground">
													Industry
												</div>
												<div className="font-medium">
													{organization.industry}
												</div>
											</div>
										)}
										{organization.subscriptionPlan && (
											<div>
												<div className="text-sm text-muted-foreground">
													Plan
												</div>
												<div className="font-medium">
													{organization.subscriptionPlan}
												</div>
											</div>
										)}
										{organization.subscriptionStatus && (
											<div>
												<div className="text-sm text-muted-foreground">
													Status
												</div>
												<div className="font-medium capitalize">
													{organization.subscriptionStatus}
												</div>
											</div>
										)}
									</div>
								</div>

								{/* Account Info */}
								<div className="bg-card rounded-lg border p-6">
									<h2 className="text-lg font-semibold mb-4">Account Info</h2>
									<div className="space-y-3">
										<div>
											<div className="text-sm text-muted-foreground">
												Member Since
											</div>
											<div className="font-medium">
												{new Date(member.createdAt).toLocaleDateString(
													"en-US",
													{
														year: "numeric",
														month: "long",
														day: "numeric",
													},
												)}
											</div>
										</div>
										{member.lastActivityAt && (
											<div>
												<div className="text-sm text-muted-foreground">
													Last Active
												</div>
												<div className="font-medium">
													{new Date(member.lastActivityAt).toLocaleDateString(
														"en-US",
														{
															year: "numeric",
															month: "long",
															day: "numeric",
														},
													)}
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					)}

					{activeTab === "activity" && (
						<div className="bg-card rounded-lg border p-6">
							<h2 className="text-lg font-semibold mb-4">Activity Timeline</h2>
							<AuditLog logs={auditLogs} isLoading={isLoadingAuditLogs} />
						</div>
					)}

					{activeTab === "notes" && (
						<div className="bg-card rounded-lg border p-6">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-lg font-semibold">Internal Notes</h2>
								{!isEditing && (
									<Button onClick={handleEdit} variant="outline" size="sm">
										<Edit2 className="h-4 w-4 mr-2" />
										Edit
									</Button>
								)}
								{isEditing && (
									<div className="flex gap-2">
										<Button
											onClick={handleCancelEdit}
											variant="outline"
											size="sm"
											disabled={isSaving}
										>
											<X className="h-4 w-4 mr-2" />
											Cancel
										</Button>
										<Button
											onClick={handleSaveEdit}
											size="sm"
											disabled={isSaving}
										>
											<Save className="h-4 w-4 mr-2" />
											{isSaving ? "Saving..." : "Save"}
										</Button>
									</div>
								)}
							</div>
							{isEditing ? (
								<textarea
									value={editedMember.notes || ""}
									onChange={(e) =>
										setEditedMember({ ...editedMember, notes: e.target.value })
									}
									className="w-full px-3 py-2 border rounded-md min-h-[200px]"
									placeholder="Add internal notes about this member..."
								/>
							) : (
								<div className="whitespace-pre-wrap text-sm">
									{member.notes || (
										<span className="text-muted-foreground italic">
											No notes added
										</span>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
