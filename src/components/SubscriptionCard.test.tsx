import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { type Subscription, SubscriptionCard } from "./SubscriptionCard";

describe("SubscriptionCard", () => {
	const mockOnViewUsage = vi.fn();
	const mockOnModifyPlan = vi.fn();
	const mockOnViewInvoice = vi.fn();

	const mockSubscription: Subscription = {
		id: "sub-1",
		subscriptionId: "SUB-001",
		companyName: "Acme Corp",
		status: "active",
		plan: "Enterprise",
		mrr: 100, // $100 (MRR is in dollars, not cents)
		renewsAt: "2024-02-01",
	};

	describe("Render Behavior", () => {
		it("should render company name", () => {
			render(<SubscriptionCard subscription={mockSubscription} />);

			expect(screen.getByText("Acme Corp")).toBeInTheDocument();
		});

		it("should render subscription ID", () => {
			render(<SubscriptionCard subscription={mockSubscription} />);

			expect(screen.getByText(/SUB-001/i)).toBeInTheDocument();
		});

		it("should render plan name", () => {
			render(<SubscriptionCard subscription={mockSubscription} />);

			expect(screen.getByText("Enterprise")).toBeInTheDocument();
		});

		it("should render MRR", () => {
			render(<SubscriptionCard subscription={mockSubscription} />);

			expect(screen.getByText(/\$100/i)).toBeInTheDocument();
		});

		it("should display active status", () => {
			render(<SubscriptionCard subscription={mockSubscription} />);

			expect(screen.getByText("ACTIVE")).toBeInTheDocument();
		});

		it("should display draft status with banner", () => {
			const draftSubscription = {
				...mockSubscription,
				status: "draft" as const,
			};
			render(<SubscriptionCard subscription={draftSubscription} />);

			expect(screen.getByText("DRAFT")).toBeInTheDocument();
			expect(screen.getByText(/pending invoice payment/i)).toBeInTheDocument();
		});

		it("should display different statuses", () => {
			const trialSubscription = {
				...mockSubscription,
				status: "trial" as const,
			};
			render(<SubscriptionCard subscription={trialSubscription} />);

			expect(screen.getByText("TRIAL")).toBeInTheDocument();
		});
	});

	describe("User Interactions", () => {
		it("should call onViewUsage when view usage button is clicked", async () => {
			const user = userEvent.setup();
			render(
				<SubscriptionCard
					subscription={mockSubscription}
					onViewUsage={mockOnViewUsage}
				/>,
			);

			const viewUsageButton = screen.getByRole("button", {
				name: /view usage/i,
			});
			await user.click(viewUsageButton);

			expect(mockOnViewUsage).toHaveBeenCalledWith(mockSubscription);
		});

		it("should call onModifyPlan when modify plan button is clicked", async () => {
			const user = userEvent.setup();
			render(
				<SubscriptionCard
					subscription={mockSubscription}
					onModifyPlan={mockOnModifyPlan}
				/>,
			);

			const modifyPlanButton = screen.getByRole("button", {
				name: /modify plan/i,
			});
			await user.click(modifyPlanButton);

			expect(mockOnModifyPlan).toHaveBeenCalledWith(mockSubscription);
		});

		it("should call onViewInvoice for draft subscriptions", async () => {
			const user = userEvent.setup();
			const draftSubscription = {
				...mockSubscription,
				status: "draft" as const,
			};

			render(
				<SubscriptionCard
					subscription={draftSubscription}
					onViewInvoice={mockOnViewInvoice}
				/>,
			);

			const viewInvoiceButton = screen.getByRole("button", {
				name: /view invoice/i,
			});
			await user.click(viewInvoiceButton);

			expect(mockOnViewInvoice).toHaveBeenCalledWith(draftSubscription);
		});
	});

	describe("Status Display", () => {
		it("should show correct status for past_due", () => {
			const pastDueSubscription = {
				...mockSubscription,
				status: "past_due" as const,
			};
			render(<SubscriptionCard subscription={pastDueSubscription} />);

			expect(screen.getByText("PAST DUE")).toBeInTheDocument();
		});

		it("should show correct status for canceled", () => {
			const canceledSubscription = {
				...mockSubscription,
				status: "canceled" as const,
			};
			render(<SubscriptionCard subscription={canceledSubscription} />);

			expect(screen.getByText("CANCELED")).toBeInTheDocument();
		});

		it("should show correct status for paused", () => {
			const pausedSubscription = {
				...mockSubscription,
				status: "paused" as const,
			};
			render(<SubscriptionCard subscription={pausedSubscription} />);

			expect(screen.getByText("PAUSED")).toBeInTheDocument();
		});
	});
});
