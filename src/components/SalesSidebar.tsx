import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
	LayoutGrid,
	GitBranch,
	Package,
	Puzzle,
	Users,
	CreditCard,
	Bot,
	ChevronDown,
	ChevronUp,
	LogOut,
	Settings,
	User,
	Megaphone,
	Headphones,
	Briefcase,
	FileText,
	UserCircle,
	Tag,
	Receipt,
} from "lucide-react";
import { useTenantSlug, useTenant } from "@/hooks/use-tenant";
import { useSession, signOut } from "@/lib/auth-client";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getNavItems = (tenant: string) => [
	{
		id: "dashboard",
		label: "Dashboard",
		icon: LayoutGrid,
		path: `/${tenant}/app/sales`,
	},
	{
		id: "pipeline",
		label: "Pipeline",
		icon: GitBranch,
		path: `/${tenant}/app/sales/pipeline`,
	},
	{
		id: "product-catalog",
		label: "Product Catalog",
		icon: Package,
		path: `/${tenant}/app/sales/product-catalog`,
	},
	{
		id: "add-ons",
		label: "Add-Ons",
		icon: Puzzle,
		path: `/${tenant}/app/sales/add-ons`,
	},
	{
		id: "promotions",
		label: "Promotions",
		icon: Tag,
		path: `/${tenant}/app/sales/promotions`,
	},
	{ id: "crm", label: "CRM", icon: Users, path: `/${tenant}/app/sales/crm` },
	{
		id: "contacts",
		label: "Contacts",
		icon: UserCircle,
		path: `/${tenant}/app/sales/crm/contacts`,
	},
	{
		id: "subscriptions",
		label: "Subscriptions",
		icon: CreditCard,
		path: `/${tenant}/app/sales/subscriptions`,
	},
	{
		id: "invoices",
		label: "Invoices",
		icon: FileText,
		path: `/${tenant}/app/sales/invoices`,
	},
	{
		id: "quotes",
		label: "Quotes",
		icon: Receipt,
		path: `/${tenant}/app/sales/quotes`,
	},
	{ id: "agent", label: "Agent Apollo", icon: Bot, path: "#" },
];

const departments = [
	{
		id: "sales",
		label: "Sales Department",
		icon: Briefcase,
		path: "/app/sales",
		color: "bg-indigo-500",
	},
	{
		id: "marketing",
		label: "Marketing Dept",
		icon: Megaphone,
		path: "/app/marketing",
		color: "bg-pink-500",
	},
	{
		id: "support",
		label: "Customer Support",
		icon: Headphones,
		path: "/app/support",
		color: "bg-amber-500",
	},
];

export function SalesSidebar() {
	const location = useLocation();
	const navigate = useNavigate();
	const currentPath = location.pathname;
	const tenantSlug = useTenantSlug();
	const tenant = useTenant();
	const { data: session } = useSession();

	const navItems = getNavItems(tenantSlug);

	const handleLogout = async () => {
		await signOut();
		navigate({ to: "/$tenant/app/login", params: { tenant: tenantSlug } });
	};

	const handleDepartmentChange = (departmentPath: string) => {
		navigate({ to: `/${tenantSlug}${departmentPath}` });
	};

	// Get user initials for avatar fallback
	const getUserInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const isActive = (path: string) => {
		if (path === `/${tenantSlug}/app/sales`) {
			return (
				currentPath === `/${tenantSlug}/app/sales` ||
				currentPath === `/${tenantSlug}/app/sales/`
			);
		}
		// For CRM, don't highlight when on contacts page
		if (path === `/${tenantSlug}/app/sales/crm`) {
			return (
				currentPath === `/${tenantSlug}/app/sales/crm` ||
				currentPath === `/${tenantSlug}/app/sales/crm/`
			);
		}
		return currentPath.startsWith(path);
	};

	return (
		<aside className="w-56 h-full bg-slate-800 flex flex-col">
			{/* Logo */}
			<div className="p-4">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
						<span className="text-white font-bold text-sm">
							{tenant?.name?.charAt(0).toUpperCase() ?? "S"}
						</span>
					</div>
					<span className="text-white font-semibold truncate">
						{tenant?.name ?? "SaaSquatch"}
					</span>
				</div>
			</div>

			{/* Department Selector */}
			<div className="px-3 mb-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="w-full flex items-center justify-between px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm transition-colors"
						>
							<div className="flex items-center gap-2">
								<div className="w-5 h-5 bg-indigo-400 rounded flex items-center justify-center">
									<Briefcase size={12} />
								</div>
								<span>Sales Dept</span>
							</div>
							<ChevronDown size={16} />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-52">
						<DropdownMenuLabel>Switch Department</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{departments.map((dept) => {
							const Icon = dept.icon;
							return (
								<DropdownMenuItem
									key={dept.id}
									onClick={() => handleDepartmentChange(dept.path)}
									className="cursor-pointer"
								>
									<div
										className={`w-5 h-5 ${dept.color} rounded flex items-center justify-center mr-2`}
									>
										<Icon size={12} className="text-white" />
									</div>
									{dept.label}
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-3 py-2">
				{navItems.map((item) => {
					const Icon = item.icon;
					const active = isActive(item.path);

					if (item.path === "#") {
						return (
							<button
								type="button"
								key={item.id}
								className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors text-left text-slate-300 hover:bg-slate-700 hover:text-white"
							>
								<Icon size={18} className="flex-shrink-0" />
								<span className="truncate">{item.label}</span>
							</button>
						);
					}

					return (
						<Link
							key={item.id}
							to={item.path}
							className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors text-left ${
								active
									? "bg-indigo-600 text-white"
									: "text-slate-300 hover:bg-slate-700 hover:text-white"
							}`}
						>
							<Icon size={18} className="flex-shrink-0" />
							<span className="truncate">{item.label}</span>
						</Link>
					);
				})}
			</nav>

			{/* User Profile */}
			<div className="p-4 border-t border-slate-700">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="w-full flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-slate-700 transition-colors"
						>
							<div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center overflow-hidden">
								{session?.user?.image ? (
									<img
										src={session.user.image}
										alt={session.user.name || "User"}
										className="w-full h-full object-cover"
										onError={(e) => {
											e.currentTarget.style.display = "none";
										}}
									/>
								) : (
									<span className="text-white text-sm font-medium">
										{session?.user?.name
											? getUserInitials(session.user.name)
											: "U"}
									</span>
								)}
							</div>
							<div className="flex-1 text-left">
								<p className="text-white text-sm font-medium truncate">
									{session?.user?.name || "User"}
								</p>
								<p className="text-slate-400 text-xs truncate">
									{session?.user?.email || ""}
								</p>
							</div>
							<ChevronUp size={16} className="text-slate-400" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="start" className="w-56 mb-2">
						<DropdownMenuLabel>My Account</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<User size={16} />
							Profile
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								navigate({ to: `/${tenantSlug}/app/settings/developers` })
							}
						>
							<Settings size={16} />
							Settings
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleLogout} variant="destructive">
							<LogOut size={16} />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</aside>
	);
}
