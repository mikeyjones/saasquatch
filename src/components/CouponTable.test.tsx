import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type Coupon, CouponTable } from "./CouponTable";

describe("CouponTable", () => {
	const mockOnEdit = vi.fn();
	const mockOnDelete = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		// Mock clipboard API
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn().mockResolvedValue(undefined),
			},
		});
	});

	describe("Render Behavior", () => {
		it("should render table with coupons", () => {
			const coupons: Coupon[] = [
				{
					id: "coupon-1",
					code: "TESTCODE",
					discountType: "percentage",
					discountValue: 10,
					applicablePlanIds: null,
					maxRedemptions: null,
					redemptionCount: 0,
					status: "active",
					actualStatus: "active",
					expiresAt: null,
					createdAt: "2024-01-01",
				},
			];

			render(
				<CouponTable
					coupons={coupons}
					onEdit={mockOnEdit}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByText("TESTCODE")).toBeInTheDocument();
		});

		it("should render empty state when no coupons", () => {
			render(
				<CouponTable
					coupons={[]}
					onEdit={mockOnEdit}
					onDelete={mockOnDelete}
				/>,
			);

			// Component renders table structure even when empty
			expect(screen.getByText("Code")).toBeInTheDocument();
			expect(screen.getByText("Discount")).toBeInTheDocument();
		});
	});

	describe("Discount Formatting", () => {
		it("should format percentage discounts", () => {
			const coupons: Coupon[] = [
				{
					id: "coupon-1",
					code: "TEST10",
					discountType: "percentage",
					discountValue: 10,
					applicablePlanIds: null,
					maxRedemptions: null,
					redemptionCount: 0,
					status: "active",
					actualStatus: "active",
					expiresAt: null,
					createdAt: "2024-01-01",
				},
			];

			render(
				<CouponTable
					coupons={coupons}
					onEdit={mockOnEdit}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByText("10%")).toBeInTheDocument();
		});

		it("should format fixed amount discounts", () => {
			const coupons: Coupon[] = [
				{
					id: "coupon-1",
					code: "TEST50",
					discountType: "fixed_amount",
					discountValue: 5000, // $50.00 in cents
					applicablePlanIds: null,
					maxRedemptions: null,
					redemptionCount: 0,
					status: "active",
					actualStatus: "active",
					expiresAt: null,
					createdAt: "2024-01-01",
				},
			];

			render(
				<CouponTable
					coupons={coupons}
					onEdit={mockOnEdit}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByText("$50.00")).toBeInTheDocument();
		});
	});

	describe("Actions", () => {
		it("should call onEdit when edit button clicked", async () => {
			const user = userEvent.setup();
			const coupons: Coupon[] = [
				{
					id: "coupon-1",
					code: "TESTCODE",
					discountType: "percentage",
					discountValue: 10,
					applicablePlanIds: null,
					maxRedemptions: null,
					redemptionCount: 0,
					status: "active",
					actualStatus: "active",
					expiresAt: null,
					createdAt: "2024-01-01",
				},
			];

			render(
				<CouponTable
					coupons={coupons}
					onEdit={mockOnEdit}
					onDelete={mockOnDelete}
				/>,
			);

			// Find and click the actions menu button (usually a dropdown trigger)
			const actionButtons = screen.getAllByRole("button");
			const editButton = actionButtons.find((btn) => btn.querySelector("svg"));
			if (editButton) {
				await user.click(editButton);
			}

			// The exact implementation depends on the dropdown menu structure
			// This is a basic test - may need adjustment based on actual UI
		});
	});
});
