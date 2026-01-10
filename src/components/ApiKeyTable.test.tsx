import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApiKeyTable, type ApiKey } from "./ApiKeyTable";

describe("ApiKeyTable", () => {
	const mockKeys: ApiKey[] = [
		{
			id: "key-1",
			apiKeyId: "ba-key-1",
			name: "Production Key",
			start: "sk_live_abc...",
			role: "full-access",
			enabled: true,
			createdAt: "2026-01-10T12:00:00.000Z",
			createdByName: "John Doe",
		},
		{
			id: "key-2",
			apiKeyId: "ba-key-2",
			name: "Read Only Key",
			start: "sk_live_xyz...",
			role: "read-only",
			enabled: true,
			createdAt: "2026-01-09T12:00:00.000Z",
			createdByName: "Jane Smith",
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Render Behavior", () => {
		it("should render table with header columns", () => {
			render(<ApiKeyTable keys={mockKeys} onDelete={() => {}} />);

			expect(screen.getByText("Name")).toBeInTheDocument();
			expect(screen.getByText("Key")).toBeInTheDocument();
			expect(screen.getByText("Permissions")).toBeInTheDocument();
			expect(screen.getByText("Created")).toBeInTheDocument();
			expect(screen.getByText("Created By")).toBeInTheDocument();
			expect(screen.getByText("Actions")).toBeInTheDocument();
		});

		it("should render API key rows", () => {
			render(<ApiKeyTable keys={mockKeys} onDelete={() => {}} />);

			expect(screen.getByText("Production Key")).toBeInTheDocument();
			expect(screen.getByText("Read Only Key")).toBeInTheDocument();
		});

		it("should show masked key prefixes", () => {
			render(<ApiKeyTable keys={mockKeys} onDelete={() => {}} />);

			expect(screen.getByText("sk_live_abc...")).toBeInTheDocument();
			expect(screen.getByText("sk_live_xyz...")).toBeInTheDocument();
		});

		it("should show role badges", () => {
			render(<ApiKeyTable keys={mockKeys} onDelete={() => {}} />);

			expect(screen.getByText("Full Access")).toBeInTheDocument();
			expect(screen.getByText("Read Only")).toBeInTheDocument();
		});

		it("should show creator names", () => {
			render(<ApiKeyTable keys={mockKeys} onDelete={() => {}} />);

			expect(screen.getByText("John Doe")).toBeInTheDocument();
			expect(screen.getByText("Jane Smith")).toBeInTheDocument();
		});

		it("should format dates correctly", () => {
			render(<ApiKeyTable keys={mockKeys} onDelete={() => {}} />);

			expect(screen.getByText("Jan 10, 2026")).toBeInTheDocument();
			expect(screen.getByText("Jan 9, 2026")).toBeInTheDocument();
		});
	});

	describe("Empty State", () => {
		it("should render empty table body with no keys", () => {
			render(<ApiKeyTable keys={[]} onDelete={() => {}} />);

			// Table should still have headers
			expect(screen.getByText("Name")).toBeInTheDocument();
			// But no key rows
			expect(screen.queryByText("Production Key")).not.toBeInTheDocument();
		});
	});

	describe("User Interactions", () => {
		it("should have action buttons for each key", () => {
			render(<ApiKeyTable keys={mockKeys} onDelete={() => {}} />);

			// Find all action buttons (one per row)
			const actionButtons = screen.getAllByRole("button");
			// Should have at least one button per key (the action menu trigger)
			expect(actionButtons.length).toBeGreaterThanOrEqual(mockKeys.length);
		});

		it("should have copy buttons for keys", () => {
			render(<ApiKeyTable keys={mockKeys} onDelete={() => {}} />);

			// Each row should have a copy button next to the key
			const copyButtons = screen.getAllByTitle("Copy key prefix");
			expect(copyButtons.length).toBe(mockKeys.length);
		});

		it("should pass onDelete prop correctly", () => {
			const onDelete = vi.fn();
			render(<ApiKeyTable keys={mockKeys} onDelete={onDelete} />);

			// The component should accept the onDelete prop
			expect(onDelete).not.toHaveBeenCalled();
		});
	});

	describe("Date Formatting", () => {
		it("should handle null dates gracefully", () => {
			const keysWithNullDate: ApiKey[] = [
				{
					...mockKeys[0],
					createdAt: null,
				},
			];

			render(<ApiKeyTable keys={keysWithNullDate} onDelete={() => {}} />);

			expect(screen.getByText("Unknown")).toBeInTheDocument();
		});

		it("should handle invalid dates gracefully", () => {
			const keysWithInvalidDate: ApiKey[] = [
				{
					...mockKeys[0],
					createdAt: "invalid-date",
				},
			];

			render(<ApiKeyTable keys={keysWithInvalidDate} onDelete={() => {}} />);

			// Invalid dates should show "Unknown"
			expect(screen.getByText("Unknown")).toBeInTheDocument();
		});
	});
});
