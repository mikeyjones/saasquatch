import { DndContext } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type Deal, DealCard } from "./DealCard";

// Mock useSortable
vi.mock("@dnd-kit/sortable", () => ({
	useSortable: vi.fn(() => ({
		attributes: {},
		listeners: {},
		setNodeRef: vi.fn(),
		transform: null,
		transition: null,
		isDragging: false,
	})),
}));

describe("DealCard", () => {
	const mockDeal: Deal = {
		id: "deal-1",
		name: "Enterprise Deal",
		company: "Acme Corp",
		value: 5000000, // $50,000
		stageId: "stage-1",
		stage: {
			id: "stage-1",
			name: "Negotiation",
			order: 3,
			color: "blue",
		},
		assignedTo: {
			id: "user-1",
			name: "John Doe",
		},
		lastUpdated: "2 days ago",
		badges: ["Hot", "Enterprise"],
	};

	describe("Render Behavior", () => {
		it("should render deal name", () => {
			render(
				<DndContext>
					<DealCard deal={mockDeal} />
				</DndContext>,
			);

			expect(screen.getByText("Enterprise Deal")).toBeInTheDocument();
		});

		it("should render company name", () => {
			render(
				<DndContext>
					<DealCard deal={mockDeal} />
				</DndContext>,
			);

			expect(screen.getByText("Acme Corp")).toBeInTheDocument();
		});

		it("should render deal value", () => {
			render(
				<DndContext>
					<DealCard deal={mockDeal} />
				</DndContext>,
			);

			// Value is $50,000 (5000000 cents) = 50K (formatted without $)
			// formatAmount: 50000 / 100 = 50000 dollars, Math.floor(50000/1000) = 50, returns "$50K"
			// After .replace('$', '') = "50K" (displayed in span next to DollarSign icon)
			// The value might be in a separate span, so check for text containing "50" and "K"
			expect(screen.getByText(/50K/i)).toBeInTheDocument();
		});

		it("should render assigned user", () => {
			render(
				<DndContext>
					<DealCard deal={mockDeal} />
				</DndContext>,
			);

			expect(screen.getByText("John Doe")).toBeInTheDocument();
		});

		it("should render badges", () => {
			render(
				<DndContext>
					<DealCard deal={mockDeal} />
				</DndContext>,
			);

			expect(screen.getByText("Hot")).toBeInTheDocument();
			expect(screen.getByText("Enterprise")).toBeInTheDocument();
		});

		it("should show unassigned when no assigned user", () => {
			const unassignedDeal = { ...mockDeal, assignedTo: null };
			render(
				<DndContext>
					<DealCard deal={unassignedDeal} />
				</DndContext>,
			);

			expect(screen.getByText("Unassigned")).toBeInTheDocument();
		});

		it("should format large amounts correctly", () => {
			const largeDeal = { ...mockDeal, value: 500000000 }; // $5M = 5.0M (without $)
			render(
				<DndContext>
					<DealCard deal={largeDeal} />
				</DndContext>,
			);

			// Value is displayed without $ sign
			expect(screen.getByText(/5\.0M/i)).toBeInTheDocument();
		});

		it("should format medium amounts correctly", () => {
			const mediumDeal = { ...mockDeal, value: 50000000 }; // $500K = 500K (without $)
			render(
				<DndContext>
					<DealCard deal={mediumDeal} />
				</DndContext>,
			);

			// Value is displayed without $ sign
			// formatAmount: Math.floor(500000 / 1000) = 500, toLocaleString() = "500", returns "$500K"
			// After replace = "500K"
			expect(screen.getByText(/500K/i)).toBeInTheDocument();
		});

		it("should display user avatar when provided", () => {
			const dealWithAvatar = {
				...mockDeal,
				assignedTo: {
					id: "user-1",
					name: "John Doe",
					avatar: "https://example.com/avatar.jpg",
				},
			};

			render(
				<DndContext>
					<DealCard deal={dealWithAvatar} />
				</DndContext>,
			);

			const avatar = screen.getByAltText("John Doe");
			expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
		});

		it("should display initials when no avatar", () => {
			render(
				<DndContext>
					<DealCard deal={mockDeal} />
				</DndContext>,
			);

			// Should show "JD" for "John Doe"
			expect(screen.getByText("JD")).toBeInTheDocument();
		});
	});
});
