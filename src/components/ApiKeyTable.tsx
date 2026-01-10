import { useState } from "react";
import { MoreHorizontal, Copy, Check, Trash2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

/**
 * API key data structure.
 */
export interface ApiKey {
	id: string;
	apiKeyId: string;
	name: string;
	start: string; // Masked key prefix (e.g., "sk_live_abc...")
	role: "read-only" | "full-access";
	enabled: boolean;
	createdAt: string | null;
	createdByName: string;
}

/**
 * Props for the ApiKeyTable component.
 */
interface ApiKeyTableProps {
	/** List of API keys to display */
	keys: ApiKey[];
	/** Callback when a key should be deleted */
	onDelete: (keyId: string) => void;
}

/**
 * Format a date string for display.
 *
 * @param dateString - ISO date string or null
 * @returns Formatted date string
 */
function formatDate(dateString: string | null): string {
	if (!dateString) return "Unknown";

	try {
		const date = new Date(dateString);
		// Check if date is valid
		if (Number.isNaN(date.getTime())) {
			return "Unknown";
		}
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	} catch {
		return "Unknown";
	}
}

/**
 * Table component for displaying and managing API keys.
 *
 * Features:
 * - Display key name, masked value, role, and creation date
 * - Copy key prefix to clipboard
 * - Delete (revoke) keys with confirmation
 *
 * @param props - Component props
 */
export function ApiKeyTable({ keys, onDelete }: ApiKeyTableProps) {
	const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
	const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

	/**
	 * Copy key prefix to clipboard.
	 */
	const handleCopyKeyPrefix = async (key: ApiKey) => {
		try {
			await navigator.clipboard.writeText(key.start);
			setCopiedKeyId(key.id);
			setTimeout(() => setCopiedKeyId(null), 2000);
		} catch (err) {
			console.error("Failed to copy to clipboard:", err);
		}
	};

	/**
	 * Confirm and delete a key.
	 */
	const handleConfirmDelete = () => {
		if (keyToDelete) {
			onDelete(keyToDelete.id);
			setKeyToDelete(null);
		}
	};

	return (
		<>
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-gray-200">
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Name
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Key
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Permissions
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Created
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Created By
							</th>
							<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200">
						{keys.map((key) => (
							<tr key={key.id} className="hover:bg-gray-50">
								{/* Name */}
								<td className="px-4 py-4 whitespace-nowrap">
									<div className="flex items-center gap-2">
										<div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
											<Key className="w-4 h-4 text-gray-500" />
										</div>
										<span className="font-medium text-gray-900">
											{key.name}
										</span>
									</div>
								</td>

								{/* Key (masked) */}
								<td className="px-4 py-4 whitespace-nowrap">
									<div className="flex items-center gap-2">
										<code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-700">
											{key.start}
										</code>
										<button
											type="button"
											onClick={() => handleCopyKeyPrefix(key)}
											className="text-gray-400 hover:text-gray-600 p-1"
											title="Copy key prefix"
										>
											{copiedKeyId === key.id ? (
												<Check className="w-4 h-4 text-green-600" />
											) : (
												<Copy className="w-4 h-4" />
											)}
										</button>
									</div>
								</td>

								{/* Permissions */}
								<td className="px-4 py-4 whitespace-nowrap">
									<Badge
										variant={
											key.role === "full-access" ? "default" : "secondary"
										}
										className={
											key.role === "full-access"
												? "bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
												: "bg-gray-100 text-gray-700 hover:bg-gray-100"
										}
									>
										{key.role === "full-access" ? "Full Access" : "Read Only"}
									</Badge>
								</td>

								{/* Created */}
								<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
									{formatDate(key.createdAt)}
								</td>

								{/* Created By */}
								<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
									{key.createdByName}
								</td>

								{/* Actions */}
								<td className="px-4 py-4 whitespace-nowrap text-right">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="icon">
												<MoreHorizontal className="w-4 h-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem
												onClick={() => handleCopyKeyPrefix(key)}
											>
												<Copy className="w-4 h-4 mr-2" />
												Copy Key Prefix
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												onClick={() => setKeyToDelete(key)}
												className="text-red-600 focus:text-red-600"
											>
												<Trash2 className="w-4 h-4 mr-2" />
												Revoke Key
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={!!keyToDelete}
				onOpenChange={(open: boolean) => !open && setKeyToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Revoke API Key</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to revoke the API key "{keyToDelete?.name}"?
							This action cannot be undone and the key will immediately stop
							working.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							className="bg-red-600 hover:bg-red-700"
						>
							Revoke Key
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
