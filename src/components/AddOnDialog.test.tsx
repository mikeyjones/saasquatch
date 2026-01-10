import * as router from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockFetchSuccess } from "@/test/setup";
import { AddOnDialog } from "./AddOnDialog";

vi.mock("@tanstack/react-router", () => ({
	useParams: vi.fn(() => ({ tenant: "acme" })),
}));

const mockUseParams = router.useParams as ReturnType<typeof vi.fn>;

function mockFetch() {
	return global.fetch as ReturnType<typeof vi.fn>;
}

describe("AddOnDialog", () => {
	const mockOnOpenChange = vi.fn();
	const mockOnSaved = vi.fn();

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
		it("should render dialog when open", () => {
			render(
				<AddOnDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(
				screen.getByRole("heading", { name: /add-on/i }),
			).toBeInTheDocument();
		});

		it("should show create title in create mode", () => {
			render(
				<AddOnDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(
				screen.getByRole("heading", { name: /create new add-on/i }),
			).toBeInTheDocument();
		});

		it("should show edit title in edit mode", () => {
			const mockAddOn = {
				id: "addon-1",
				name: "Test Add-On",
				description: "Test description",
				status: "active" as const,
				pricingModel: "flat" as const,
				basePrice: {
					amount: 1000,
					currency: "USD",
					interval: "monthly" as const,
				},
			};

			render(
				<AddOnDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
					addOn={mockAddOn}
				/>,
			);

			expect(
				screen.getByRole("heading", { name: /edit add-on/i }),
			).toBeInTheDocument();
		});
	});

	describe("Form Fields", () => {
		it("should render name field", () => {
			render(
				<AddOnDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
		});

		it("should render description field", () => {
			render(
				<AddOnDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
		});

		it("should render status select", () => {
			render(
				<AddOnDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			// Status field uses Select component which may not have label association
			expect(screen.getByText("Status")).toBeInTheDocument();
			// Select has default value 'draft', so it will show "Draft" instead of placeholder
			const draftTexts = screen.getAllByText("Draft");
			expect(draftTexts.length).toBeGreaterThan(0);
		});

		it("should render pricing model select", () => {
			render(
				<AddOnDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			// Pricing model field uses Select component which may not have label association
			expect(screen.getByText("Pricing Model")).toBeInTheDocument();
			// Select has default value 'flat', verify it's rendered (check for multiple "Flat Rate" texts)
			const flatRateTexts = screen.getAllByText("Flat Rate");
			expect(flatRateTexts.length).toBeGreaterThan(0);
		});
	});

	describe("Edit Mode", () => {
		it("should pre-fill form with add-on data", () => {
			const mockAddOn = {
				id: "addon-1",
				name: "Test Add-On",
				description: "Test description",
				status: "active" as const,
				pricingModel: "flat" as const,
				basePrice: {
					amount: 1000,
					currency: "USD",
					interval: "monthly" as const,
				},
			};

			render(
				<AddOnDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
					addOn={mockAddOn}
				/>,
			);

			const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
			expect(nameInput.value).toBe("Test Add-On");
		});
	});

	describe("Form Submission", () => {
		it("should call API to create add-on", async () => {
			const user = userEvent.setup();

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ addOn: { id: "addon-1" } }),
			);

			render(
				<AddOnDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			await user.type(screen.getByLabelText(/name/i), "New Add-On");
			await user.type(screen.getByLabelText(/description/i), "Description");

			const submitButton = screen.getByRole("button", { name: /create/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining("/acme/api/product-catalog/add-ons"),
					expect.objectContaining({
						method: "POST",
					}),
				);
			});
		});

		it("should call onSaved callback after successful submission", async () => {
			const user = userEvent.setup();

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ addOn: { id: "addon-1" } }),
			);

			render(
				<AddOnDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			await user.type(screen.getByLabelText(/name/i), "New Add-On");
			await user.type(screen.getByLabelText(/description/i), "Description");

			const submitButton = screen.getByRole("button", { name: /create/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockOnSaved).toHaveBeenCalled();
			});
		});
	});

	describe("Cancel Button", () => {
		it("should call onOpenChange(false) when Cancel clicked", async () => {
			const user = userEvent.setup();

			render(
				<AddOnDialog
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
});
