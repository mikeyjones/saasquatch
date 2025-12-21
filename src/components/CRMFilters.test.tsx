import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CRMFilters } from "./CRMFilters";

describe("CRMFilters", () => {
	const mockOnFiltersChange = vi.fn();
	const defaultFilters = {
		search: "",
		industry: "all",
		status: "all",
		importance: "all",
	};
	const mockIndustries = ["Technology", "Healthcare", "Finance"];

	describe("Render Behavior", () => {
		it("should render search input", () => {
			render(
				<CRMFilters
					filters={defaultFilters}
					onFiltersChange={mockOnFiltersChange}
					industries={mockIndustries}
				/>,
			);

			expect(
				screen.getByPlaceholderText(/search companies/i),
			).toBeInTheDocument();
		});

		it("should render industry filter", () => {
			render(
				<CRMFilters
					filters={defaultFilters}
					onFiltersChange={mockOnFiltersChange}
					industries={mockIndustries}
				/>,
			);

			expect(screen.getByText(/all industries/i)).toBeInTheDocument();
		});

		it("should render status filter", () => {
			render(
				<CRMFilters
					filters={defaultFilters}
					onFiltersChange={mockOnFiltersChange}
					industries={mockIndustries}
				/>,
			);

			expect(screen.getByText(/all statuses/i)).toBeInTheDocument();
		});

		it("should render importance filter", () => {
			render(
				<CRMFilters
					filters={defaultFilters}
					onFiltersChange={mockOnFiltersChange}
					industries={mockIndustries}
				/>,
			);

			expect(screen.getByText(/all importance/i)).toBeInTheDocument();
		});
	});

	describe("User Interactions", () => {
		it("should call onFiltersChange when search input changes", async () => {
			const user = userEvent.setup();
			render(
				<CRMFilters
					filters={defaultFilters}
					onFiltersChange={mockOnFiltersChange}
					industries={mockIndustries}
				/>,
			);

			const searchInput = screen.getByPlaceholderText(/search companies/i);
			await user.type(searchInput, "test");

			expect(mockOnFiltersChange).toHaveBeenCalled();
		});

		it("should show clear button when filters are active", () => {
			const filtersWithSearch = {
				...defaultFilters,
				search: "test",
			};

			render(
				<CRMFilters
					filters={filtersWithSearch}
					onFiltersChange={mockOnFiltersChange}
					industries={mockIndustries}
				/>,
			);

			expect(
				screen.getByRole("button", { name: /clear/i }),
			).toBeInTheDocument();
		});

		it("should not show clear button when no filters are active", () => {
			render(
				<CRMFilters
					filters={defaultFilters}
					onFiltersChange={mockOnFiltersChange}
					industries={mockIndustries}
				/>,
			);

			expect(
				screen.queryByRole("button", { name: /clear/i }),
			).not.toBeInTheDocument();
		});

		it("should clear all filters when clear button is clicked", async () => {
			const user = userEvent.setup();
			const filtersWithSearch = {
				...defaultFilters,
				search: "test",
				industry: "Technology",
			};

			render(
				<CRMFilters
					filters={filtersWithSearch}
					onFiltersChange={mockOnFiltersChange}
					industries={mockIndustries}
				/>,
			);

			const clearButton = screen.getByRole("button", { name: /clear/i });
			await user.click(clearButton);

			expect(mockOnFiltersChange).toHaveBeenCalledWith({
				search: "",
				industry: "all",
				status: "all",
				importance: "all",
			});
		});
	});

	describe("Filter States", () => {
		it("should render industry filter with placeholder", () => {
			render(
				<CRMFilters
					filters={defaultFilters}
					onFiltersChange={mockOnFiltersChange}
					industries={mockIndustries}
				/>,
			);

			// The select should be rendered (we can't easily test the dropdown without more complex setup)
			expect(screen.getByText(/all industries/i)).toBeInTheDocument();
		});

		it("should render status filter with placeholder", () => {
			render(
				<CRMFilters
					filters={defaultFilters}
					onFiltersChange={mockOnFiltersChange}
					industries={mockIndustries}
				/>,
			);

			// The select should be rendered
			expect(screen.getByText(/all statuses/i)).toBeInTheDocument();
		});
	});
});
