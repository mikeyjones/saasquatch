import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemberHeader } from "./MemberHeader";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		params,
	}: {
		children: React.ReactNode;
		to: string;
		params?: Record<string, string>;
	}) => {
		// Resolve params in the route template
		let href = to;
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				href = href.replace(`$${key}`, value);
			}
		}
		return <a href={href}>{children}</a>;
	},
}));

const mockMember = {
	id: "member-1",
	name: "John Doe",
	email: "john@example.com",
	phone: "+1-555-123-4567",
	avatarUrl: null,
	title: "Software Engineer",
	role: "admin",
	isOwner: false,
	status: "active",
	lastActivityAt: "2024-01-15T10:00:00Z",
	createdAt: "2023-06-01T08:00:00Z",
};

const mockOrganization = {
	id: "org-1",
	name: "Acme Corp",
	slug: "acme",
	logo: null,
	industry: "Technology",
	website: "https://acme.com",
	subscriptionStatus: "active",
	subscriptionPlan: "Pro",
};

describe("MemberHeader", () => {
	const mockOnEdit = vi.fn();
	const mockOnToggleStatus = vi.fn();
	const mockOnResetPassword = vi.fn();

	const defaultProps = {
		member: mockMember,
		organization: mockOrganization,
		tenant: "acme",
		onEdit: mockOnEdit,
		onToggleStatus: mockOnToggleStatus,
		onResetPassword: mockOnResetPassword,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Render Behavior", () => {
		it("should render member name", () => {
			render(<MemberHeader {...defaultProps} />);

			expect(screen.getByText("John Doe")).toBeInTheDocument();
		});

		it("should render member email with mailto link", () => {
			render(<MemberHeader {...defaultProps} />);

			const emailLink = screen.getByText("john@example.com");
			expect(emailLink).toBeInTheDocument();
			expect(emailLink.closest("a")).toHaveAttribute(
				"href",
				"mailto:john@example.com",
			);
		});

		it("should render member phone with tel link", () => {
			render(<MemberHeader {...defaultProps} />);

			const phoneLink = screen.getByText("+1-555-123-4567");
			expect(phoneLink).toBeInTheDocument();
			expect(phoneLink.closest("a")).toHaveAttribute(
				"href",
				"tel:+1-555-123-4567",
			);
		});

		it("should render member title", () => {
			render(<MemberHeader {...defaultProps} />);

			expect(screen.getByText("Software Engineer")).toBeInTheDocument();
		});

		it("should render organization name with link", () => {
			render(<MemberHeader {...defaultProps} />);

			const orgLink = screen.getByText("Acme Corp");
			expect(orgLink).toBeInTheDocument();
			expect(orgLink.closest("a")).toHaveAttribute(
				"href",
				"/acme/app/sales/crm/org-1",
			);
		});

		it("should render organization subscription status", () => {
			render(<MemberHeader {...defaultProps} />);

			expect(screen.getByText("(active)")).toBeInTheDocument();
		});

		it("should render member initials when no avatar", () => {
			render(<MemberHeader {...defaultProps} />);

			expect(screen.getByText("JD")).toBeInTheDocument();
		});

		it("should render avatar when provided", () => {
			const memberWithAvatar = {
				...mockMember,
				avatarUrl: "https://example.com/avatar.jpg",
			};

			render(<MemberHeader {...defaultProps} member={memberWithAvatar} />);

			const avatar = screen.getByAltText("John Doe");
			expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
		});

		it("should not render phone when null", () => {
			const memberNoPhone = { ...mockMember, phone: null };

			render(<MemberHeader {...defaultProps} member={memberNoPhone} />);

			expect(screen.queryByText("+1-555-123-4567")).not.toBeInTheDocument();
		});

		it("should not render title when null", () => {
			const memberNoTitle = { ...mockMember, title: null };

			render(<MemberHeader {...defaultProps} member={memberNoTitle} />);

			expect(screen.queryByText("Software Engineer")).not.toBeInTheDocument();
		});
	});

	describe("Status Badge", () => {
		it("should render Active status badge", () => {
			render(<MemberHeader {...defaultProps} />);

			expect(screen.getByText("Active")).toBeInTheDocument();
		});

		it("should render Suspended status badge", () => {
			const suspendedMember = { ...mockMember, status: "suspended" };

			render(<MemberHeader {...defaultProps} member={suspendedMember} />);

			expect(screen.getByText("Suspended")).toBeInTheDocument();
		});

		it("should render Invited status badge", () => {
			const invitedMember = { ...mockMember, status: "invited" };

			render(<MemberHeader {...defaultProps} member={invitedMember} />);

			expect(screen.getByText("Invited")).toBeInTheDocument();
		});

		it("should render unknown status as-is", () => {
			const customStatusMember = { ...mockMember, status: "custom" };

			render(<MemberHeader {...defaultProps} member={customStatusMember} />);

			expect(screen.getByText("custom")).toBeInTheDocument();
		});
	});

	describe("Role Badge", () => {
		it("should render Admin role badge", () => {
			render(<MemberHeader {...defaultProps} />);

			expect(screen.getByText("Admin")).toBeInTheDocument();
		});

		it("should render Owner badge when isOwner is true", () => {
			const ownerMember = { ...mockMember, isOwner: true };

			render(<MemberHeader {...defaultProps} member={ownerMember} />);

			expect(screen.getByText("Owner")).toBeInTheDocument();
		});

		it("should render User role badge", () => {
			const userMember = { ...mockMember, role: "user" };

			render(<MemberHeader {...defaultProps} member={userMember} />);

			expect(screen.getByText("User")).toBeInTheDocument();
		});

		it("should render Viewer role badge", () => {
			const viewerMember = { ...mockMember, role: "viewer" };

			render(<MemberHeader {...defaultProps} member={viewerMember} />);

			expect(screen.getByText("Viewer")).toBeInTheDocument();
		});

		it("should render unknown role as-is", () => {
			const customRoleMember = { ...mockMember, role: "custom_role" };

			render(<MemberHeader {...defaultProps} member={customRoleMember} />);

			expect(screen.getByText("custom_role")).toBeInTheDocument();
		});
	});

	describe("Metadata", () => {
		it("should display member since date", () => {
			render(<MemberHeader {...defaultProps} />);

			expect(screen.getByText(/Member since June 1, 2023/)).toBeInTheDocument();
		});

		it("should display last activity date", () => {
			render(<MemberHeader {...defaultProps} />);

			expect(
				screen.getByText(/Last active January 15, 2024/),
			).toBeInTheDocument();
		});

		it("should not display last activity when null", () => {
			const memberNoActivity = { ...mockMember, lastActivityAt: null };

			render(<MemberHeader {...defaultProps} member={memberNoActivity} />);

			expect(screen.queryByText(/Last active/)).not.toBeInTheDocument();
		});
	});

	describe("Action Buttons", () => {
		it("should render Edit button", () => {
			render(<MemberHeader {...defaultProps} />);

			expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
		});

		it("should call onEdit when Edit button is clicked", async () => {
			const user = userEvent.setup();
			render(<MemberHeader {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /edit/i }));

			expect(mockOnEdit).toHaveBeenCalled();
		});

		it("should render Suspend button for active member", () => {
			render(<MemberHeader {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /suspend/i }),
			).toBeInTheDocument();
		});

		it("should render Activate button for suspended member", () => {
			const suspendedMember = { ...mockMember, status: "suspended" };

			render(<MemberHeader {...defaultProps} member={suspendedMember} />);

			expect(
				screen.getByRole("button", { name: /activate/i }),
			).toBeInTheDocument();
		});

		it("should call onToggleStatus when Suspend button is clicked", async () => {
			const user = userEvent.setup();
			render(<MemberHeader {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /suspend/i }));

			expect(mockOnToggleStatus).toHaveBeenCalled();
		});

		it("should call onToggleStatus when Activate button is clicked", async () => {
			const user = userEvent.setup();
			const suspendedMember = { ...mockMember, status: "suspended" };

			render(<MemberHeader {...defaultProps} member={suspendedMember} />);

			await user.click(screen.getByRole("button", { name: /activate/i }));

			expect(mockOnToggleStatus).toHaveBeenCalled();
		});

		it("should render Reset Password button", () => {
			render(<MemberHeader {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /reset password/i }),
			).toBeInTheDocument();
		});

		it("should call onResetPassword when Reset Password button is clicked", async () => {
			const user = userEvent.setup();
			render(<MemberHeader {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /reset password/i }));

			expect(mockOnResetPassword).toHaveBeenCalled();
		});
	});

	describe("Initials Calculation", () => {
		it("should calculate initials correctly for two-word name", () => {
			render(<MemberHeader {...defaultProps} />);

			expect(screen.getByText("JD")).toBeInTheDocument();
		});

		it("should calculate initials correctly for single-word name", () => {
			const singleNameMember = { ...mockMember, name: "John" };

			render(<MemberHeader {...defaultProps} member={singleNameMember} />);

			expect(screen.getByText("J")).toBeInTheDocument();
		});

		it("should limit initials to two characters", () => {
			const longNameMember = { ...mockMember, name: "John Michael Doe Smith" };

			render(<MemberHeader {...defaultProps} member={longNameMember} />);

			// Should only show first two initials
			expect(screen.getByText("JM")).toBeInTheDocument();
		});
	});
});
