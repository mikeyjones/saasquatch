import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { useTenantSlug } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { CreateApiKeyDialog } from "@/components/CreateApiKeyDialog";
import { ApiKeyTable, type ApiKey } from "@/components/ApiKeyTable";

/**
 * Developers settings page.
 *
 * Allows users to manage API keys for server-to-server authentication.
 * Features:
 * - View all API keys for the organization
 * - Create new API keys with role-based permissions
 * - Revoke (delete) API keys
 */
export const Route = createFileRoute("/$tenant/app/settings/developers")({
	component: DevelopersPage,
});

/**
 * Developers settings page component.
 */
function DevelopersPage() {
	const tenant = useTenantSlug();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [keys, setKeys] = useState<ApiKey[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	/**
	 * Fetch API keys from the server.
	 */
	const fetchKeys = useCallback(async () => {
		if (!tenant) return;

		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch(`/${tenant}/api/settings/api-keys`);
			if (!response.ok) {
				throw new Error("Failed to fetch API keys");
			}
			const data = await response.json();
			setKeys(data.keys || []);
		} catch (err) {
			console.error("Error fetching API keys:", err);
			setError("Failed to load API keys");
		} finally {
			setIsLoading(false);
		}
	}, [tenant]);

	// Fetch keys on mount
	useEffect(() => {
		fetchKeys();
	}, [fetchKeys]);

	/**
	 * Handle successful key creation.
	 */
	const handleKeyCreated = () => {
		fetchKeys();
	};

	/**
	 * Handle key deletion (revocation).
	 */
	const handleDeleteKey = async (keyId: string) => {
		if (!tenant) return;

		try {
			const response = await fetch(`/${tenant}/api/settings/api-keys`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ keyId }),
			});

			if (!response.ok) {
				throw new Error("Failed to delete API key");
			}

			// Refresh the list
			fetchKeys();
		} catch (err) {
			console.error("Error deleting API key:", err);
			setError("Failed to delete API key");
		}
	};

	return (
		<div className="p-8 max-w-5xl">
			{/* Page Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">Developers</h1>
					<p className="text-gray-500 mt-1">
						Manage API keys for server-to-server authentication
					</p>
				</div>
				<Button
					onClick={() => setIsCreateDialogOpen(true)}
					className="bg-indigo-600 hover:bg-indigo-700"
				>
					<Plus size={16} className="mr-2" />
					Create API Key
				</Button>
			</div>

			{/* Error Alert */}
			{error && (
				<div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
					<AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
					<div>
						<p className="text-red-800 font-medium">Error</p>
						<p className="text-red-700 text-sm">{error}</p>
					</div>
				</div>
			)}

			{/* API Keys Section */}
			<section className="bg-white rounded-lg border border-gray-200 shadow-sm">
				<div className="p-6 border-b border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
					<p className="text-sm text-gray-500 mt-1">
						Use API keys to authenticate server-to-server requests. Keys can
						have read-only or full access permissions.
					</p>
				</div>

				{/* Keys Table */}
				<div className="p-6">
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<div className="text-gray-500">Loading API keys...</div>
						</div>
					) : keys.length === 0 ? (
						<div className="text-center py-12">
							<div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<Plus className="w-6 h-6 text-gray-400" />
							</div>
							<h3 className="text-gray-900 font-medium mb-1">
								No API keys yet
							</h3>
							<p className="text-gray-500 text-sm mb-4">
								Create an API key to enable server-to-server authentication
							</p>
							<Button
								onClick={() => setIsCreateDialogOpen(true)}
								variant="outline"
							>
								Create your first API key
							</Button>
						</div>
					) : (
						<ApiKeyTable keys={keys} onDelete={handleDeleteKey} />
					)}
				</div>

				{/* Security Warning */}
				<div className="px-6 py-4 bg-amber-50 border-t border-amber-100 rounded-b-lg">
					<div className="flex items-start gap-3">
						<AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
						<div>
							<p className="text-amber-800 font-medium text-sm">
								Keep your API keys secure
							</p>
							<p className="text-amber-700 text-sm">
								Do not share API keys in public repositories, client-side code,
								or anywhere they could be exposed. If a key is compromised,
								revoke it immediately and create a new one.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Create Dialog */}
			<CreateApiKeyDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				onKeyCreated={handleKeyCreated}
			/>
		</div>
	);
}
