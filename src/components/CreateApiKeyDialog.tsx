import { useState, useId } from "react";
import { useParams } from "@tanstack/react-router";
import { Key, Copy, Check, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

/**
 * Props for the CreateApiKeyDialog component.
 */
interface CreateApiKeyDialogProps {
	/** Whether the dialog is open */
	open: boolean;
	/** Callback when dialog open state changes */
	onOpenChange: (open: boolean) => void;
	/** Callback fired after successful key creation */
	onKeyCreated?: () => void;
}

/**
 * Response from the create API key endpoint.
 */
interface CreateApiKeyResponse {
	id: string;
	apiKeyId: string;
	name: string;
	key: string; // Full key - shown only once!
	prefix: string;
	start: string;
	role: string;
	enabled: boolean;
	createdAt: string;
}

/**
 * Dialog component for creating a new API key.
 *
 * Features:
 * - Form for name and role selection
 * - Shows the full key only once after creation
 * - Copy to clipboard functionality
 * - Security warnings
 *
 * @param props - Component props
 */
export function CreateApiKeyDialog({
	open,
	onOpenChange,
	onKeyCreated,
}: CreateApiKeyDialogProps) {
	const params = useParams({ strict: false }) as { tenant?: string };
	const tenant = params.tenant || "";

	// Generate unique IDs for form fields
	const nameId = useId();
	const roleId = useId();

	// Form state
	const [name, setName] = useState("");
	const [role, setRole] = useState<"read-only" | "full-access">("read-only");

	// Submission state
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Success state - shows the created key
	const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(
		null,
	);
	const [copied, setCopied] = useState(false);

	/**
	 * Reset form to initial state.
	 */
	const resetForm = () => {
		setName("");
		setRole("read-only");
		setError(null);
		setCreatedKey(null);
		setCopied(false);
	};

	/**
	 * Handle dialog close.
	 */
	const handleDialogClose = (isOpen: boolean) => {
		if (!isOpen) {
			resetForm();
		}
		onOpenChange(isOpen);
	};

	/**
	 * Handle form submission.
	 */
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!tenant) {
			setError("Tenant not found");
			return;
		}

		if (!name.trim()) {
			setError("Name is required");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch(`/${tenant}/api/settings/api-keys`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					role,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to create API key");
			}

			const data: CreateApiKeyResponse = await response.json();
			setCreatedKey(data);
			onKeyCreated?.();
		} catch (err) {
			console.error("Error creating API key:", err);
			setError(err instanceof Error ? err.message : "Failed to create API key");
		} finally {
			setIsSubmitting(false);
		}
	};

	/**
	 * Copy API key to clipboard.
	 */
	const handleCopyKey = async () => {
		if (!createdKey?.key) return;

		try {
			await navigator.clipboard.writeText(createdKey.key);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy to clipboard:", err);
		}
	};

	/**
	 * Handle done after key creation - close dialog.
	 */
	const handleDone = () => {
		handleDialogClose(false);
	};

	// Show success state if key was created
	if (createdKey) {
		return (
			<Dialog open={open} onOpenChange={handleDialogClose}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle className="text-xl flex items-center gap-2">
							<div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
								<Check className="w-5 h-5 text-green-600" />
							</div>
							API Key Created
						</DialogTitle>
						<DialogDescription>
							Your new API key has been created. Copy it now - you won't be able
							to see it again!
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						{/* Key display */}
						<div className="space-y-2">
							<Label className="text-sm font-medium">Your API Key</Label>
							<div className="flex gap-2">
								<div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 font-mono text-sm break-all">
									{createdKey.key}
								</div>
								<Button
									type="button"
									variant="outline"
									size="icon"
									onClick={handleCopyKey}
									className="flex-shrink-0"
								>
									{copied ? (
										<Check className="w-4 h-4 text-green-600" />
									) : (
										<Copy className="w-4 h-4" />
									)}
								</Button>
							</div>
						</div>

						{/* Key details */}
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span className="text-gray-500">Name:</span>
								<span className="ml-2 font-medium">{createdKey.name}</span>
							</div>
							<div>
								<span className="text-gray-500">Permissions:</span>
								<span className="ml-2 font-medium capitalize">
									{createdKey.role.replace("-", " ")}
								</span>
							</div>
						</div>

						{/* Usage example */}
						<div className="bg-gray-50 rounded-lg p-4 space-y-2">
							<p className="text-sm font-medium text-gray-700">
								Use this key in the x-api-key header:
							</p>
							<pre className="text-xs bg-gray-100 rounded p-2 overflow-x-auto">
								{`curl -H "x-api-key: ${createdKey.key}" \\
     https://your-app.com/${tenant}/api/...`}
							</pre>
						</div>

						{/* Warning */}
						<div className="flex items-start gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
							<AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
							<p className="text-sm">
								Make sure to copy your API key now. You won't be able to see it
								again after closing this dialog.
							</p>
						</div>
					</div>

					<DialogFooter>
						<Button
							onClick={handleDone}
							className="bg-indigo-600 hover:bg-indigo-700"
						>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	// Show creation form
	return (
		<Dialog open={open} onOpenChange={handleDialogClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="text-xl flex items-center gap-2">
						<Key className="w-5 h-5 text-indigo-500" />
						Create API Key
					</DialogTitle>
					<DialogDescription>
						Create a new API key for server-to-server authentication. Choose a
						descriptive name and set the appropriate permission level.
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
						<AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
						<span>{error}</span>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-5">
					{/* Name field */}
					<div className="space-y-2">
						<Label htmlFor={nameId}>
							Name <span className="text-red-500">*</span>
						</Label>
						<Input
							id={nameId}
							placeholder="e.g., Production API Key"
							value={name}
							onChange={(e) => setName(e.target.value)}
							disabled={isSubmitting}
						/>
						<p className="text-xs text-gray-500">
							A friendly name to identify this key
						</p>
					</div>

					{/* Role field */}
					<div className="space-y-2">
						<Label htmlFor={roleId}>
							Permissions <span className="text-red-500">*</span>
						</Label>
						<Select
							value={role}
							onValueChange={(value) =>
								setRole(value as "read-only" | "full-access")
							}
							disabled={isSubmitting}
						>
							<SelectTrigger id={roleId}>
								<SelectValue placeholder="Select permissions" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="read-only">
									<div className="flex flex-col items-start">
										<span className="font-medium">Read Only</span>
										<span className="text-xs text-gray-500">
											Can only read data (GET requests)
										</span>
									</div>
								</SelectItem>
								<SelectItem value="full-access">
									<div className="flex flex-col items-start">
										<span className="font-medium">Full Access</span>
										<span className="text-xs text-gray-500">
											Can read and write data (all requests)
										</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<DialogFooter className="pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => handleDialogClose(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							className="bg-indigo-600 hover:bg-indigo-700"
							disabled={isSubmitting || !name.trim()}
						>
							{isSubmitting ? "Creating..." : "Create Key"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
