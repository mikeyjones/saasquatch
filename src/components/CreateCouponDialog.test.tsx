import * as router from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockFetchSuccess } from "@/test/setup";
import { CreateCouponDialog } from "./CreateCouponDialog";

vi.mock("@tanstack/react-router", () => ({
	useParams: vi.fn(() => ({ tenant: "acme" })),
}));

const mockUseParams = router.useParams as ReturnType<typeof vi.fn>;

function mockFetch() {
	return global.fetch as ReturnType<typeof vi.fn>;
}

describe("CreateCouponDialog", () => {
	const mockOnOpenChange = vi.fn();
	const mockOnCouponCreated = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseParams.mockReturnValue({ tenant: "acme" });
		global.fetch = vi.fn(() => {
			return Promise.resolve(
				new Response(JSON.stringify({}), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);
		}) as typeof fetch;
	});

	describe("Render Behavior", () => {
		it("should render dialog when open", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ plans: [] }));

			render(
				<CreateCouponDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCouponCreated={mockOnCouponCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByRole("heading", { name: /coupon/i }),
				).toBeInTheDocument();
			});
		});

		it("should show create title in create mode", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ plans: [] }));

			render(
				<CreateCouponDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCouponCreated={mockOnCouponCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByRole("heading", { name: /create coupon/i }),
				).toBeInTheDocument();
			});
		});
	});

	describe("Fetch on Open", () => {
		it("should fetch plans when dialog opens", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ plans: [] }));

			render(
				<CreateCouponDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCouponCreated={mockOnCouponCreated}
				/>,
			);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining("/acme/api/product-catalog/plans"),
				);
			});
		});
	});

	describe("Form Fields", () => {
		it("should render coupon code field", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ plans: [] }));

			render(
				<CreateCouponDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCouponCreated={mockOnCouponCreated}
				/>,
			);

			await waitFor(() => {
				expect(screen.getByLabelText(/coupon code/i)).toBeInTheDocument();
			});
		});
	});

	describe("Form Submission", () => {
		it("should call API to create coupon", async () => {
			const user = userEvent.setup();

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))
				.mockResolvedValueOnce(
					mockFetchSuccess({ coupon: { id: "coupon-1" } }),
				);

			render(
				<CreateCouponDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCouponCreated={mockOnCouponCreated}
				/>,
			);

			await waitFor(() => {
				expect(screen.getByLabelText(/coupon code/i)).toBeInTheDocument();
			});

			// Fill required fields
			await user.type(screen.getByLabelText(/coupon code/i), "TESTCODE");

			// Fill discount value (required field - must be > 0)
			const discountValueInput = screen.getByLabelText(/discount value/i);
			await user.type(discountValueInput, "10");

			const submitButton = screen.getByRole("button", { name: /create/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining("/acme/api/coupons"),
					expect.objectContaining({
						method: "POST",
					}),
				);
			});
		});

		it("should call onCouponCreated callback after successful submission", async () => {
			const user = userEvent.setup();

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))
				.mockResolvedValueOnce(
					mockFetchSuccess({ coupon: { id: "coupon-1" } }),
				);

			render(
				<CreateCouponDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCouponCreated={mockOnCouponCreated}
				/>,
			);

			await waitFor(() => {
				expect(screen.getByLabelText(/coupon code/i)).toBeInTheDocument();
			});

			// Fill required fields
			await user.type(screen.getByLabelText(/coupon code/i), "TESTCODE");

			// Fill discount value (required field)
			const discountValueInput = screen.getByLabelText(/discount value/i);
			await user.type(discountValueInput, "10");

			const submitButton = screen.getByRole("button", { name: /create/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockOnCouponCreated).toHaveBeenCalled();
			});
		});
	});

	describe("Cancel Button", () => {
		it("should call onOpenChange(false) when Cancel clicked", async () => {
			const user = userEvent.setup();
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ plans: [] }));

			render(
				<CreateCouponDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCouponCreated={mockOnCouponCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /cancel/i }),
				).toBeInTheDocument();
			});

			const cancelButton = screen.getByRole("button", { name: /cancel/i });
			await user.click(cancelButton);

			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});
	});
});
