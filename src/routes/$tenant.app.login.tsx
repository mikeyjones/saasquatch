import { createFileRoute, useSearch, useParams } from "@tanstack/react-router";
import { useState, useEffect, useId } from "react";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/hooks/use-tenant";

type LoginSearch = {
	returnTo?: string;
	error?: string;
};

export const Route = createFileRoute("/$tenant/app/login")({
	validateSearch: (search: Record<string, unknown>): LoginSearch => {
		return {
			returnTo:
				typeof search.returnTo === "string" ? search.returnTo : undefined,
			error: typeof search.error === "string" ? search.error : undefined,
		};
	},
	component: TenantLoginPage,
});

async function checkTenantMembership(
	tenantSlug: string,
): Promise<{ isMember: boolean; role?: string; error?: string }> {
	try {
		const response = await fetch(`/api/tenant/${tenantSlug}/membership`, {
			method: "GET",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (response.ok) {
			const data = await response.json();
			return { isMember: data.isMember, role: data.role };
		}

		if (response.status === 403) {
			return {
				isMember: false,
				error: "You are not a member of this organization",
			};
		}

		if (response.status === 401) {
			return { isMember: false, error: "Not authenticated" };
		}

		return { isMember: false, error: "Failed to check membership" };
	} catch {
		return { isMember: false, error: "Failed to check membership" };
	}
}

function TenantLoginPage() {
	const { tenant: tenantSlug } = useParams({ from: "/$tenant/app/login" });
	const { returnTo, error: urlError } = useSearch({
		from: "/$tenant/app/login",
	});
	const tenant = useTenant();

	const emailId = useId();
	const passwordId = useId();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(urlError || "");
	const [loading, setLoading] = useState(false);
	const [checkingSession, setCheckingSession] = useState(true);

	// Check if user is already logged in and is a member
	useEffect(() => {
		const checkExistingSession = async () => {
			try {
				const session = await authClient.getSession();
				if (session && "session" in session && session.session) {
					// User is logged in, check if they're a member of this tenant
					const membershipResult = await checkTenantMembership(tenantSlug);
					if (membershipResult.isMember) {
						// Already authenticated and a member, redirect
						const destination = returnTo || `/${tenantSlug}/app/support`;
						window.location.replace(destination);
						return;
					} else {
						// Logged in but not a member
						setError(
							"You are not a member of this organization. Please sign in with an account that has access.",
						);
					}
				}
			} catch {
				// Not logged in, show login form
			}
			setCheckingSession(false);
		};

		checkExistingSession();
	}, [tenantSlug, returnTo]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const result = await authClient.signIn.email({
				email,
				password,
			});

			if (result.error) {
				setError(result.error.message || "Failed to sign in");
				setLoading(false);
				return;
			}

			// Wait for cookie to be set
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Check if user is a member of this tenant
			const membershipResult = await checkTenantMembership(tenantSlug);

			if (!membershipResult.isMember) {
				// Sign out since they're not a member of this tenant
				await authClient.signOut();
				setError(
					membershipResult.error || "You are not a member of this organization",
				);
				setLoading(false);
				return;
			}

			// Successfully authenticated and is a member
			const destination = returnTo || `/${tenantSlug}/app/support`;
			window.location.replace(destination);
		} catch (err) {
			console.error("Login error:", err);
			setError("An unexpected error occurred");
			setLoading(false);
		}
	};

	if (checkingSession) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-gray-500">Checking session...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					{tenant?.logo && (
						<img
							src={tenant.logo}
							alt={tenant.name || tenantSlug}
							className="h-12 mx-auto mb-4"
						/>
					)}
					<CardTitle className="text-2xl">
						Sign in to {tenant?.name || tenantSlug}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
								{error}
							</div>
						)}
						{returnTo && !error && (
							<div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-sm">
								Please sign in to continue
							</div>
						)}
						<div>
							<label
								htmlFor={emailId}
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Email
							</label>
							<Input
								id={emailId}
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								placeholder="you@example.com"
							/>
						</div>
						<div>
							<label
								htmlFor={passwordId}
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Password
							</label>
							<Input
								id={passwordId}
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								placeholder="••••••••"
							/>
						</div>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? "Signing in..." : "Sign In"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
