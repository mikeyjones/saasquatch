import {
	createFileRoute,
	Outlet,
	Link,
	useLocation,
} from "@tanstack/react-router";
import { Settings, Code, ArrowLeft } from "lucide-react";
import { useTenantSlug, useTenant } from "@/hooks/use-tenant";

/**
 * Settings layout page.
 *
 * Provides a sidebar navigation for settings sections and renders
 * child routes via Outlet.
 */
export const Route = createFileRoute("/$tenant/app/settings")({
	component: SettingsLayout,
});

/**
 * Navigation items for the settings sidebar.
 */
const getSettingsNavItems = (tenant: string) => [
	{
		id: "developers",
		label: "Developers",
		description: "API keys and integrations",
		icon: Code,
		path: `/${tenant}/app/settings/developers`,
	},
];

/**
 * Settings layout component.
 *
 * Renders a settings page with sidebar navigation and content area.
 */
function SettingsLayout() {
	const location = useLocation();
	const currentPath = location.pathname;
	const tenantSlug = useTenantSlug();
	const tenant = useTenant();

	const navItems = getSettingsNavItems(tenantSlug);

	const isActive = (path: string) => {
		return currentPath.startsWith(path);
	};

	return (
		<div className="flex h-screen bg-gray-50">
			{/* Settings Sidebar */}
			<aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
				{/* Header */}
				<div className="p-4 border-b border-gray-200">
					<Link
						to={`/${tenantSlug}/app/sales`}
						className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3"
					>
						<ArrowLeft size={16} />
						<span>Back to {tenant?.name || "App"}</span>
					</Link>
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
							<Settings size={18} className="text-gray-600" />
						</div>
						<span className="font-semibold text-gray-900">Settings</span>
					</div>
				</div>

				{/* Navigation */}
				<nav className="flex-1 p-3">
					{navItems.map((item) => {
						const Icon = item.icon;
						const active = isActive(item.path);

						return (
							<Link
								key={item.id}
								to={item.path}
								className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${
									active
										? "bg-indigo-50 text-indigo-700"
										: "text-gray-700 hover:bg-gray-100"
								}`}
							>
								<Icon
									size={18}
									className={`flex-shrink-0 mt-0.5 ${active ? "text-indigo-600" : "text-gray-500"}`}
								/>
								<div>
									<span className="font-medium block">{item.label}</span>
									<span
										className={`text-xs ${active ? "text-indigo-600" : "text-gray-500"}`}
									>
										{item.description}
									</span>
								</div>
							</Link>
						);
					})}
				</nav>
			</aside>

			{/* Main Content */}
			<main className="flex-1 overflow-auto">
				<Outlet />
			</main>
		</div>
	);
}
