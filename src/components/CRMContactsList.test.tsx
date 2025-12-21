import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type Contact, CRMContactsList } from "./CRMContactsList";

describe("CRMContactsList", () => {
	const mockOnSelectionChange = vi.fn();
	const mockOnEdit = vi.fn();
	const mockOnDelete = vi.fn();
	const mockOnViewCustomer = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Render Behavior", () => {
		it("should render table with contacts", () => {
			const contacts: Contact[] = [
				{
					id: "contact-1",
					name: "John Doe",
					email: "john@acme.com",
					phone: "555-1234",
					role: "admin",
					isOwner: false,
					status: "active",
					createdAt: "2024-01-01",
					updatedAt: "2024-01-01",
				},
			];

			render(
				<CRMContactsList
					contacts={contacts}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
					onEdit={mockOnEdit}
					onDelete={mockOnDelete}
					onViewCustomer={mockOnViewCustomer}
				/>,
			);

			expect(screen.getByText("John Doe")).toBeInTheDocument();
			expect(screen.getByText("john@acme.com")).toBeInTheDocument();
		});

		it("should render empty state when no contacts", () => {
			render(
				<CRMContactsList
					contacts={[]}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
					onEdit={mockOnEdit}
					onDelete={mockOnDelete}
					onViewCustomer={mockOnViewCustomer}
				/>,
			);

			expect(screen.getByText(/no contacts/i)).toBeInTheDocument();
		});
	});

	describe("Contact Display", () => {
		it("should display contact name and email", () => {
			const contacts: Contact[] = [
				{
					id: "contact-1",
					name: "Jane Smith",
					email: "jane@acme.com",
					role: "user",
					isOwner: false,
					status: "active",
					createdAt: "2024-01-01",
					updatedAt: "2024-01-01",
				},
			];

			render(
				<CRMContactsList
					contacts={contacts}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
					onEdit={mockOnEdit}
					onDelete={mockOnDelete}
					onViewCustomer={mockOnViewCustomer}
				/>,
			);

			expect(screen.getByText("Jane Smith")).toBeInTheDocument();
			expect(screen.getByText("jane@acme.com")).toBeInTheDocument();
		});

		it("should display customer name when showCustomer is true", () => {
			const contacts: Contact[] = [
				{
					id: "contact-1",
					name: "John Doe",
					email: "john@acme.com",
					role: "admin",
					isOwner: false,
					status: "active",
					createdAt: "2024-01-01",
					updatedAt: "2024-01-01",
					customer: {
						id: "customer-1",
						name: "Acme Corp",
					},
				},
			];

			render(
				<CRMContactsList
					contacts={contacts}
					selectedIds={[]}
					onSelectionChange={mockOnSelectionChange}
					onEdit={mockOnEdit}
					onDelete={mockOnDelete}
					onViewCustomer={mockOnViewCustomer}
					showCustomer={true}
				/>,
			);

			expect(screen.getByText("Acme Corp")).toBeInTheDocument();
		});
	});
});
