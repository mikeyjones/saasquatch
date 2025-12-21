import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SalesHeader } from "./SalesHeader";

describe("SalesHeader", () => {
	describe("Render Behavior", () => {
		it("should render search input", () => {
			render(<SalesHeader />);

			expect(
				screen.getByPlaceholderText(/search deals, people/i),
			).toBeInTheDocument();
		});

		it("should render notification bell button", () => {
			render(<SalesHeader />);

			const buttons = screen.getAllByRole("button");
			expect(buttons.length).toBeGreaterThanOrEqual(1);
		});

		it("should render New Deal button", () => {
			render(<SalesHeader />);

			expect(
				screen.getByRole("button", { name: /new deal/i }),
			).toBeInTheDocument();
		});

		it("should render notification indicator", () => {
			const { container } = render(<SalesHeader />);

			const indicator = container.querySelector(".bg-red-500.rounded-full");
			expect(indicator).toBeInTheDocument();
		});
	});

	describe("Layout", () => {
		it("should render header element", () => {
			const { container } = render(<SalesHeader />);

			const header = container.querySelector("header");
			expect(header).toBeInTheDocument();
		});

		it("should have search input with correct styling", () => {
			render(<SalesHeader />);

			const searchInput = screen.getByPlaceholderText(/search deals, people/i);
			expect(searchInput).toHaveClass("pl-10");
		});
	});
});
