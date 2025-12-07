import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
	Search,
	Building,
	Settings,
	MoreVertical,
	RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { fetchMembers, type Member } from "@/data/members";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/$tenant/app/support/members/")({
	component: MembersPage,
});

/**
 * Fuzzy match score - returns a score based on how well the query matches the text
 * Higher score = better match
 * Returns 0 if no match
 */
function fuzzyScore(text: string, query: string): number {
	const textLower = text.toLowerCase();
	const queryLower = query.toLowerCase();

	// Exact match gets highest score
	if (textLower === queryLower) return 100;

	// Starts with query gets high score
	if (textLower.startsWith(queryLower)) return 90;

	// Contains exact query gets good score
	if (textLower.includes(queryLower)) return 80;

	// Word boundary match (e.g., "jd" matches "John Doe")
	const words = textLower.split(/\s+/);
	const initials = words.map((w) => w[0]).join("");
	if (initials.includes(queryLower)) return 75;

	// Fuzzy character matching
	let queryIndex = 0;
	let score = 0;
	let consecutiveBonus = 0;
	let lastMatchIndex = -2;

	for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
		if (textLower[i] === queryLower[queryIndex]) {
			// Bonus for consecutive matches
			if (i === lastMatchIndex + 1) {
				consecutiveBonus += 5;
			}
			// Bonus for matching at word boundaries
			if (
				i === 0 ||
				textLower[i - 1] === " " ||
				textLower[i - 1] === "@" ||
				textLower[i - 1] === "."
			) {
				score += 10;
			} else {
				score += 5;
			}
			lastMatchIndex = i;
			queryIndex++;
		}
	}

	// All query characters must be found
	if (queryIndex < queryLower.length) return 0;

	// Add consecutive bonus and normalize
	score += consecutiveBonus;

	// Penalize longer texts slightly (prefer shorter, more relevant matches)
	score = score * (1 - (textLower.length - queryLower.length) / 100);

	return Math.max(0, Math.min(70, score)); // Cap at 70 for fuzzy matches
}

/**
 * Calculate the best fuzzy match score for a member across all searchable fields
 */
function getMemberScore(member: Member, query: string): number {
	if (!query) return 100; // No query = show all with equal score

	const scores = [
		fuzzyScore(member.name, query),
		fuzzyScore(member.email, query),
		fuzzyScore(member.organization, query),
	];

	return Math.max(...scores);
}

/**
 * Highlight matching parts of text
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
	if (!query) return <>{text}</>;

	const textLower = text.toLowerCase();
	const queryLower = query.toLowerCase();

	// Try exact substring match first
	const index = textLower.indexOf(queryLower);
	if (index !== -1) {
		return (
			<>
				{text.slice(0, index)}
				<mark className="bg-yellow-200 text-inherit rounded px-0.5">
					{text.slice(index, index + query.length)}
				</mark>
				{text.slice(index + query.length)}
			</>
		);
	}

	// Fuzzy highlight - highlight matching characters
	const result: React.ReactNode[] = [];
	let queryIndex = 0;

	for (let i = 0; i < text.length; i++) {
		if (
			queryIndex < queryLower.length &&
			textLower[i] === queryLower[queryIndex]
		) {
			result.push(
				<mark key={i} className="bg-yellow-200 text-inherit rounded-sm">
					{text[i]}
				</mark>,
			);
			queryIndex++;
		} else {
			result.push(text[i]);
		}
	}

	return <>{result}</>;
}

function MembersPage() {
	const { tenant } = useParams({ from: "/$tenant/app/support/members" });
	const [searchQuery, setSearchQuery] = useState("");
	const [allMembers, setAllMembers] = useState<Member[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch all members on mount
	useEffect(() => {
		const loadMembers = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const data = await fetchMembers(tenant);
				setAllMembers(data);
			} catch (err) {
				setError("Failed to load members");
				console.error(err);
			} finally {
				setIsLoading(false);
			}
		};

		loadMembers();
	}, [tenant]);

	// Fuzzy filter and sort members based on search query
	const filteredMembers = useMemo(() => {
		if (!searchQuery.trim()) return allMembers;

		const query = searchQuery.trim();
		const scored = allMembers
			.map((member) => ({
				member,
				score: getMemberScore(member, query),
			}))
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score);

		return scored.map((item) => item.member);
	}, [allMembers, searchQuery]);

	const handleRefresh = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await fetchMembers(tenant);
			setAllMembers(data);
		} catch (err) {
			setError("Failed to refresh members");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main className="flex-1 overflow-auto p-6">
			{/* Page Header */}
			<div className="flex items-start justify-between mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">
						Members & Organizations
					</h1>
					<p className="text-gray-500 text-sm mt-1">
						Manage customer accounts, access, and organization settings.
					</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={handleRefresh}
						disabled={isLoading}
						className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
						title="Refresh members"
					>
						<RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
					</button>
					<div className="w-72">
						<div className="relative">
							<Search
								className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
								size={16}
							/>
							<Input
								type="text"
								placeholder="Fuzzy search name, email, or org..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9 h-9 text-sm bg-gray-50 border-gray-200"
							/>
							{searchQuery && (
								<button
									onClick={() => setSearchQuery("")}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
								>
									✕
								</button>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Error State */}
			{error && (
				<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
					{error}
				</div>
			)}

			{/* Members Table */}
			<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
				<table className="w-full">
					<thead>
						<tr className="border-b border-gray-100">
							<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								User
							</th>
							<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								Organization
							</th>
							<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								Role
							</th>
							<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								Open Tickets
							</th>
							<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								Last Activity
							</th>
							<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td
									colSpan={7}
									className="px-6 py-12 text-center text-gray-500"
								>
									<RefreshCw size={24} className="animate-spin mx-auto mb-2" />
									Loading members...
								</td>
							</tr>
						) : filteredMembers.length === 0 ? (
							<tr>
								<td
									colSpan={7}
									className="px-6 py-12 text-center text-gray-500"
								>
									{searchQuery ? (
										<div>
											<p>No members found matching "{searchQuery}"</p>
											<p className="text-xs mt-1 text-gray-400">
												Try a different search term or check spelling
											</p>
										</div>
									) : (
										"No members found."
									)}
								</td>
							</tr>
						) : (
							filteredMembers.map((member) => (
								<MemberRow
									key={member.id}
									member={member}
									searchQuery={searchQuery}
									tenant={tenant}
								/>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Footer Info */}
			{!isLoading && (
				<div className="mt-4 text-sm text-gray-500">
					{searchQuery ? (
						<>
							Showing {filteredMembers.length} of {allMembers.length} members
						</>
					) : (
						<>
							Showing {allMembers.length} member
							{allMembers.length !== 1 ? "s" : ""}
						</>
					)}
				</div>
			)}
		</main>
	);
}

function MemberRow({
	member,
	searchQuery,
	tenant,
}: {
	member: Member;
	searchQuery: string;
	tenant: string;
}) {
	const roleStyles = {
		Admin: "bg-blue-50 text-blue-700 border-blue-200",
		User: "bg-gray-100 text-gray-700 border-gray-200",
		Viewer: "bg-gray-100 text-gray-600 border-gray-200",
	};

	const statusStyles = {
		Active: "text-emerald-600",
		Suspended: "text-red-500",
	};

	return (
		<tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
			{/* User */}
			<td className="px-6 py-4">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0">
						<span className="text-white text-sm font-medium">
							{member.initials}
						</span>
					</div>
					<div>
						<Link to={`/${tenant}/app/support/members/${member.id}`}>
							<p className="font-medium text-gray-900 text-sm hover:text-indigo-600 cursor-pointer">
								<HighlightedText text={member.name} query={searchQuery} />
							</p>
						</Link>
						<p className="text-gray-500 text-xs">
							<HighlightedText text={member.email} query={searchQuery} />
						</p>
					</div>
				</div>
			</td>

			{/* Organization */}
			<td className="px-6 py-4">
				<div className="flex items-center gap-2">
					<Building size={16} className="text-gray-400" />
					<span className="text-gray-700 text-sm">
						<HighlightedText text={member.organization} query={searchQuery} />
					</span>
				</div>
			</td>

			{/* Role */}
			<td className="px-6 py-4">
				<span
					className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border ${roleStyles[member.role]}`}
				>
					{member.isOwner && <Settings size={12} />}
					{member.isOwner ? "Owner · " : ""}
					{member.role}
				</span>
			</td>

			{/* Status */}
			<td className="px-6 py-4">
				<span className={`text-sm font-medium ${statusStyles[member.status]}`}>
					{member.status}
				</span>
			</td>

			{/* Open Tickets */}
			<td className="px-6 py-4">
				<span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
					{member.openTicketsCount || 0}
				</span>
			</td>

			{/* Last Activity */}
			<td className="px-6 py-4">
				<span className="text-gray-500 text-sm">{member.lastLogin}</span>
			</td>

			{/* Actions */}
			<td className="px-6 py-4">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
							<MoreVertical size={18} className="text-gray-400" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem asChild>
							<Link to={`/${tenant}/app/support/members/${member.id}`}>
								View Details
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</td>
		</tr>
	);
}
