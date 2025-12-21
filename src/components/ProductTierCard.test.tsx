import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type ProductTier, ProductTierCard } from "./ProductTierCard";

const mockTier: ProductTier = {
	id: "tier-1",
	name: "Pro Plan",
	description: "For growing teams",
	basePrice: {
		amount: 49,
		currency: "USD",
		interval: "monthly",
	},
	regionalPricing: [
		{ region: "EU", currency: "EUR", amount: 45 },
		{ region: "UK", currency: "GBP", amount: 39 },
	],
	features: [
		"Unlimited users",
		"24/7 Support",
		"API Access",
		"Custom integrations",
	],
};

describe("ProductTierCard", () => {
	const mockOnEdit = vi.fn();
	const mockOnDelete = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Render Behavior", () => {
		it("should render tier name", () => {
			render(<ProductTierCard tier={mockTier} />);

			expect(screen.getByText("Pro Plan")).toBeInTheDocument();
		});

		it("should render tier description", () => {
			render(<ProductTierCard tier={mockTier} />);

			expect(screen.getByText("For growing teams")).toBeInTheDocument();
		});

		it("should render price with currency symbol", () => {
			render(<ProductTierCard tier={mockTier} />);

			expect(screen.getByText("$49")).toBeInTheDocument();
		});

		it("should render interval label", () => {
			render(<ProductTierCard tier={mockTier} />);

			expect(screen.getByText("MONTHLY")).toBeInTheDocument();
			expect(screen.getByText("/ mo")).toBeInTheDocument();
		});

		it("should render yearly interval label", () => {
			const yearlyTier: ProductTier = {
				...mockTier,
				basePrice: { ...mockTier.basePrice, interval: "yearly" },
			};
			render(<ProductTierCard tier={yearlyTier} />);

			expect(screen.getByText("YEARLY")).toBeInTheDocument();
			expect(screen.getByText("/ yr")).toBeInTheDocument();
		});

		it("should render all features", () => {
			render(<ProductTierCard tier={mockTier} />);

			expect(screen.getByText("Unlimited users")).toBeInTheDocument();
			expect(screen.getByText("24/7 Support")).toBeInTheDocument();
			expect(screen.getByText("API Access")).toBeInTheDocument();
			expect(screen.getByText("Custom integrations")).toBeInTheDocument();
		});
	});

	describe("Regional Pricing", () => {
		it("should render regional pricing badges", () => {
			render(<ProductTierCard tier={mockTier} />);

			expect(screen.getByText(/EU: 45 EUR/)).toBeInTheDocument();
			expect(screen.getByText(/UK: 39 GBP/)).toBeInTheDocument();
		});

		it("should not render regional pricing when empty", () => {
			const tierNoRegional: ProductTier = {
				...mockTier,
				regionalPricing: [],
			};
			render(<ProductTierCard tier={tierNoRegional} />);

			expect(screen.queryByText(/EU:/)).not.toBeInTheDocument();
		});
	});

	describe("Currency Formatting", () => {
		it("should format USD with dollar sign", () => {
			render(<ProductTierCard tier={mockTier} />);

			expect(screen.getByText("$49")).toBeInTheDocument();
		});

		it("should format JPY without symbol", () => {
			const jpyTier: ProductTier = {
				...mockTier,
				basePrice: { amount: 5000, currency: "JPY", interval: "monthly" },
			};
			render(<ProductTierCard tier={jpyTier} />);

			expect(screen.getByText("5,000")).toBeInTheDocument();
		});

		it("should format other currencies as plain number", () => {
			const eurTier: ProductTier = {
				...mockTier,
				basePrice: { amount: 45, currency: "EUR", interval: "monthly" },
			};
			render(<ProductTierCard tier={eurTier} />);

			expect(screen.getByText("45")).toBeInTheDocument();
		});
	});

	describe("Action Buttons", () => {
		it("should render Edit button", () => {
			render(<ProductTierCard tier={mockTier} onEdit={mockOnEdit} />);

			expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
		});

		it("should call onEdit when Edit is clicked", async () => {
			const user = userEvent.setup();
			render(<ProductTierCard tier={mockTier} onEdit={mockOnEdit} />);

			await user.click(screen.getByRole("button", { name: /edit/i }));

			expect(mockOnEdit).toHaveBeenCalledWith(mockTier);
		});

		it("should render Delete button", () => {
			const { container } = render(
				<ProductTierCard tier={mockTier} onDelete={mockOnDelete} />,
			);

			// Delete button is icon-only
			const deleteButton = container.querySelector(
				'button[class*="hover:text-red-500"]',
			);
			expect(deleteButton).toBeInTheDocument();
		});

		it("should call onDelete when Delete is clicked", async () => {
			const user = userEvent.setup();
			const { container } = render(
				<ProductTierCard tier={mockTier} onDelete={mockOnDelete} />,
			);

			const deleteButton = container.querySelector(
				'button[class*="hover:text-red-500"]',
			);
			if (deleteButton) {
				await user.click(deleteButton);
			}

			expect(mockOnDelete).toHaveBeenCalledWith(mockTier);
		});
	});

	describe("Empty Features", () => {
		it("should render without features", () => {
			const tierNoFeatures: ProductTier = {
				...mockTier,
				features: [],
			};
			render(<ProductTierCard tier={tierNoFeatures} />);

			expect(screen.getByText("Pro Plan")).toBeInTheDocument();
		});
	});
});
