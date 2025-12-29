import * as router from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as productsData from "@/data/products";
import { ProductPlanDialog } from "./ProductPlanDialog";

vi.mock("@tanstack/react-router", () => ({
	useParams: vi.fn(() => ({ tenant: "acme" })),
}));

vi.mock("@/data/products", () => ({
	createPlan: vi.fn(),
	updatePlan: vi.fn(),
	fetchAddOns: vi.fn(() => Promise.resolve([])),
}));

const mockUseParams = router.useParams as ReturnType<typeof vi.fn>;

describe("ProductPlanDialog", () => {
	const mockOnOpenChange = vi.fn();
	const mockOnSaved = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseParams.mockReturnValue({ tenant: "acme" });
	});

	describe("Render Behavior", () => {
		it("should render dialog when open", async () => {
			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(
				screen.getByRole("heading", { name: /create new plan/i }),
			).toBeInTheDocument();
		});

		it("should not render dialog when closed", () => {
			render(
				<ProductPlanDialog
					open={false}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(
				screen.queryByRole("heading", { name: /plan/i }),
			).not.toBeInTheDocument();
		});

		it("should show edit title in edit mode", async () => {
			const mockPlan = {
				id: "plan-1",
				name: "Test Plan",
				description: "Description",
				status: "active" as const,
				pricingModel: "flat" as const,
				basePrice: {
					amount: 99,
					currency: "USD",
					interval: "monthly" as const,
				},
				regionalPricing: [],
				features: [],
				boltOns: [],
			};

			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
					plan={mockPlan}
				/>,
			);

			expect(
				screen.getByRole("heading", { name: /edit plan/i }),
			).toBeInTheDocument();
		});

		it("should show dialog description in create mode", async () => {
			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(
				screen.getByText(/create a new subscription plan/i),
			).toBeInTheDocument();
		});
	});

	describe("Form Fields", () => {
		it("should render name field", async () => {
			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(screen.getByLabelText(/plan name/i)).toBeInTheDocument();
		});

		it("should render description field", async () => {
			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
		});

		it("should render base pricing section", async () => {
			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(screen.getByText(/base pricing/i)).toBeInTheDocument();
			expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
		});

		it("should render features section", async () => {
			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(screen.getAllByText(/features/i).length).toBeGreaterThan(0);
			expect(screen.getByPlaceholderText(/add a feature/i)).toBeInTheDocument();
		});

		it("should render bolt-ons section", async () => {
			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(screen.getByText(/bolt-ons/i)).toBeInTheDocument();
		});
	});

	describe("Features Management", () => {
		it("should add a feature when Add button is clicked", async () => {
			const user = userEvent.setup();
			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			const featureInput = screen.getByPlaceholderText(/add a feature/i);
			await user.type(featureInput, "Unlimited users");
			await user.click(screen.getByRole("button", { name: /^add$/i }));

			expect(screen.getByText("Unlimited users")).toBeInTheDocument();
		});

		it("should add a feature when Enter is pressed", async () => {
			const user = userEvent.setup();
			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			const featureInput = screen.getByPlaceholderText(/add a feature/i);
			await user.type(featureInput, "Priority support{enter}");

			expect(screen.getByText("Priority support")).toBeInTheDocument();
		});

		it("should remove a feature when X is clicked", async () => {
			const user = userEvent.setup();
			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			// Add a feature first
			const featureInput = screen.getByPlaceholderText(/add a feature/i);
			await user.type(featureInput, "Test feature{enter}");

			expect(screen.getByText("Test feature")).toBeInTheDocument();

			// Remove it - find the X button next to the feature
			const featureItem = screen.getByText("Test feature").closest("div");
			const removeButton = featureItem?.querySelector("button");
			if (removeButton) {
				await user.click(removeButton);
			}

			await waitFor(() => {
				expect(screen.queryByText("Test feature")).not.toBeInTheDocument();
			});
		});
	});

	describe("Regional Pricing", () => {
		it("should add regional pricing row when Add Region is clicked", async () => {
			const user = userEvent.setup();
			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /add region/i }));

			expect(screen.getByText(/select region/i)).toBeInTheDocument();
		});

		it("should show helper text when no regional pricing", async () => {
			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(
				screen.getByText(/add region-specific pricing/i),
			).toBeInTheDocument();
		});
	});

	describe("Form Submission", () => {
		it("should call createPlan when form is submitted in create mode", async () => {
			const user = userEvent.setup();
			vi.mocked(productsData.createPlan).mockResolvedValueOnce({
				success: true,
				plan: {
					id: "plan-1",
					name: "New Plan",
					description: "",
					status: "draft",
					pricingModel: "flat",
					basePrice: { amount: 99, currency: "USD", interval: "monthly" },
					regionalPricing: [],
					features: [],
					boltOns: [],
				},
			});

			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			await user.type(screen.getByLabelText(/plan name/i), "New Plan");
			await user.clear(screen.getByPlaceholderText("0.00"));
			await user.type(screen.getByPlaceholderText("0.00"), "99");

			const submitButton = screen.getByRole("button", { name: /create plan/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(productsData.createPlan).toHaveBeenCalledWith(
					"acme",
					expect.objectContaining({
						name: "New Plan",
					}),
				);
			});
		});

		it("should call updatePlan when form is submitted in edit mode", async () => {
			const user = userEvent.setup();
			const mockPlan = {
				id: "plan-1",
				name: "Test Plan",
				description: "Description",
				status: "active" as const,
				pricingModel: "flat" as const,
				basePrice: {
					amount: 99,
					currency: "USD",
					interval: "monthly" as const,
				},
				regionalPricing: [],
				features: [],
				boltOns: [],
			};

			vi.mocked(productsData.updatePlan).mockResolvedValueOnce({
				success: true,
			});

			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
					plan={mockPlan}
				/>,
			);

			const submitButton = screen.getByRole("button", {
				name: /save changes/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(productsData.updatePlan).toHaveBeenCalledWith(
					"acme",
					expect.objectContaining({
						id: "plan-1",
					}),
				);
			});
		});

		it("should call onSaved callback after successful submission", async () => {
			const user = userEvent.setup();
			vi.mocked(productsData.createPlan).mockResolvedValueOnce({
				success: true,
				plan: {
					id: "plan-1",
					name: "New Plan",
					description: "",
					status: "draft",
					pricingModel: "flat",
					basePrice: { amount: 99, currency: "USD", interval: "monthly" },
					regionalPricing: [],
					features: [],
					boltOns: [],
				},
			});

			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			await user.type(screen.getByLabelText(/plan name/i), "New Plan");
			await user.clear(screen.getByPlaceholderText("0.00"));
			await user.type(screen.getByPlaceholderText("0.00"), "99");

			const submitButton = screen.getByRole("button", { name: /create plan/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockOnSaved).toHaveBeenCalled();
			});
		});

		it("should show error message when submission fails", async () => {
			const user = userEvent.setup();
			vi.mocked(productsData.createPlan).mockResolvedValueOnce({
				success: false,
				error: "Failed to create plan",
			});

			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			await user.type(screen.getByLabelText(/plan name/i), "New Plan");
			await user.clear(screen.getByPlaceholderText("0.00"));
			await user.type(screen.getByPlaceholderText("0.00"), "99");

			const submitButton = screen.getByRole("button", { name: /create plan/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/failed to create plan/i)).toBeInTheDocument();
			});
		});
	});

	describe("Cancel Button", () => {
		it("should call onOpenChange(false) when Cancel clicked", async () => {
			const user = userEvent.setup();

			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			const cancelButton = screen.getByRole("button", { name: /cancel/i });
			await user.click(cancelButton);

			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});
	});

	describe("Bolt-Ons Integration", () => {
		it("should fetch add-ons when dialog opens", async () => {
			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			await waitFor(() => {
				expect(productsData.fetchAddOns).toHaveBeenCalledWith("acme", {
					status: "active",
				});
			});
		});

		it("should show add-on selector when add-ons are available", async () => {
			vi.mocked(productsData.fetchAddOns).mockResolvedValueOnce([
				{
					id: "addon-1",
					name: "Extra Storage",
					basePrice: { amount: 10, currency: "USD", interval: "monthly" },
					pricingModel: "flat" as const,
					status: "active" as const,
				},
			]);

			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByText(/select add-on to include/i),
				).toBeInTheDocument();
			});
		});

		it("should show empty state when no add-ons available", async () => {
			vi.mocked(productsData.fetchAddOns).mockResolvedValueOnce([]);

			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			await waitFor(() => {
				expect(screen.getByText(/no add-ons available/i)).toBeInTheDocument();
			});
		});
	});

	describe("Edit Mode Population", () => {
		it("should populate form with plan data in edit mode", async () => {
			const mockPlan = {
				id: "plan-1",
				name: "Enterprise Plan",
				description: "For large teams",
				status: "active" as const,
				pricingModel: "seat" as const,
				basePrice: {
					amount: 199,
					currency: "USD",
					interval: "monthly" as const,
				},
				regionalPricing: [{ region: "GB", currency: "GBP", amount: 159 }],
				features: ["Unlimited users", "24/7 Support"],
				boltOns: [],
			};

			render(
				<ProductPlanDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
					plan={mockPlan}
				/>,
			);

			expect(screen.getByLabelText(/plan name/i)).toHaveValue(
				"Enterprise Plan",
			);
			expect(screen.getByLabelText(/description/i)).toHaveValue(
				"For large teams",
			);
			expect(screen.getByText("Unlimited users")).toBeInTheDocument();
			expect(screen.getByText("24/7 Support")).toBeInTheDocument();
		});
	});
});
