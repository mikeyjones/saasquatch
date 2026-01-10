import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateProductDialog } from "./CreateProductDialog";

// Mock router hooks
vi.mock("@tanstack/react-router", () => ({
	useParams: vi.fn(() => ({ tenant: "acme" })),
}));

describe("CreateProductDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset fetch mock
		global.fetch = vi.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify({ error: "Not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				}),
			),
		) as typeof fetch;
	});

	describe("Render Behavior", () => {
		it("should render dialog when open", () => {
			render(<CreateProductDialog open={true} onOpenChange={() => {}} />);
			expect(screen.getByText("Create New Product")).toBeInTheDocument();
		});

		it("should not render when closed", () => {
			render(<CreateProductDialog open={false} onOpenChange={() => {}} />);
			expect(screen.queryByText("Create New Product")).not.toBeInTheDocument();
		});

		it("should show Edit title when product is provided", () => {
			const product = {
				id: "prod-1",
				name: "Test Product",
				description: "Test description",
				status: "active" as const,
				plans: [],
			};
			render(
				<CreateProductDialog
					open={true}
					onOpenChange={() => {}}
					product={product}
				/>,
			);
			expect(screen.getByText("Edit Product")).toBeInTheDocument();
		});
	});

	describe("Form Fields", () => {
		it("should have name field", () => {
			render(<CreateProductDialog open={true} onOpenChange={() => {}} />);
			expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
		});

		it("should have description field", () => {
			render(<CreateProductDialog open={true} onOpenChange={() => {}} />);
			expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
		});

		it("should have status selector", () => {
			render(<CreateProductDialog open={true} onOpenChange={() => {}} />);
			// Radix Select renders as a combobox button, not a standard form control
			expect(screen.getByText("Status")).toBeInTheDocument();
			expect(screen.getByRole("combobox")).toBeInTheDocument();
		});
	});

	describe("Pre-populated Values", () => {
		it("should populate form with product data in edit mode", () => {
			const product = {
				id: "prod-1",
				name: "Existing Product",
				description: "Existing description",
				status: "active" as const,
				plans: [],
			};
			render(
				<CreateProductDialog
					open={true}
					onOpenChange={() => {}}
					product={product}
				/>,
			);
			expect(screen.getByDisplayValue("Existing Product")).toBeInTheDocument();
			expect(
				screen.getByDisplayValue("Existing description"),
			).toBeInTheDocument();
		});
	});

	describe("Submit Behavior", () => {
		it("should call API on submit", async () => {
			const user = userEvent.setup();
			const mockResponse = {
				success: true,
				product: { id: "new-id", name: "New Product" },
			};
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				new Response(JSON.stringify(mockResponse), {
					status: 201,
					headers: { "Content-Type": "application/json" },
				}),
			);

			const onSaved = vi.fn();
			render(
				<CreateProductDialog
					open={true}
					onOpenChange={() => {}}
					onSaved={onSaved}
				/>,
			);

			await user.type(screen.getByLabelText(/product name/i), "New Product");
			await user.click(screen.getByRole("button", { name: /create product/i }));

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining("/acme/api/product-catalog/products"),
					expect.objectContaining({ method: "POST" }),
				);
			});
		});
	});

	describe("Cancel Behavior", () => {
		it("should call onOpenChange(false) when Cancel is clicked", async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn();
			render(<CreateProductDialog open={true} onOpenChange={onOpenChange} />);

			await user.click(screen.getByRole("button", { name: /cancel/i }));

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});
});
