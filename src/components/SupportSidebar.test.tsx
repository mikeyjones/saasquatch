import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupportSidebar } from "./SupportSidebar";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		...props
	}: {
		children: React.ReactNode;
		to: string;
		[key: string]: unknown;
	}) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
	useLocation: vi.fn(() => ({ pathname: "/acme/app/support" })),
	useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock("@/hooks/use-tenant", () => ({
	useTenantSlug: vi.fn(() => "acme"),
	useTenant: vi.fn(() => ({ id: "org-1", name: "Acme Corp" })),
}));

vi.mock("@/lib/auth-client", () => ({
	useSession: vi.fn(() => ({
		data: {
			user: { id: "user-1", name: "Test User", email: "test@acme.com" },
		},
	})),
	signOut: vi.fn(),
}));

describe("SupportSidebar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render sidebar with navigation items", () => {
		render(<SupportSidebar />);

		expect(screen.getByText("Overview")).toBeInTheDocument();
		expect(screen.getByText("Tickets")).toBeInTheDocument();
		expect(screen.getByText("Knowledge & Playbooks")).toBeInTheDocument();
	});

	it("should render department selector", () => {
		render(<SupportSidebar />);

		// The trigger button should be visible
		expect(screen.getByText("Support Dept")).toBeInTheDocument();
	});

	it("should show department links when dropdown is opened", async () => {
		const user = userEvent.setup();
		render(<SupportSidebar />);

		// Find the trigger button - use getAllByText to handle potential duplicates
		const supportDeptTexts = screen.getAllByText("Support Dept");
		const triggerButton = supportDeptTexts[0].closest("button");
		if (triggerButton) {
			await user.click(triggerButton);
		}

		// Wait for dropdown content to appear
		await waitFor(() => {
			expect(screen.getByText("Sales Department")).toBeInTheDocument();
			expect(screen.getByText("Marketing Dept")).toBeInTheDocument();
			expect(screen.getByText("Customer Support")).toBeInTheDocument();
		});
	});
});
