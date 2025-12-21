import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuditLog } from "./AuditLog";

describe("AuditLog", () => {
	describe("Loading State", () => {
		it("should show loading message when isLoading is true", () => {
			render(<AuditLog logs={[]} isLoading={true} />);

			expect(screen.getByText(/loading activity history/i)).toBeInTheDocument();
		});
	});

	describe("Empty State", () => {
		it("should show empty message when no logs", () => {
			render(<AuditLog logs={[]} isLoading={false} />);

			expect(screen.getByText(/no activity history yet/i)).toBeInTheDocument();
		});
	});

	describe("Log Display", () => {
		it("should render audit log entries", () => {
			const logs = [
				{
					id: "log-1",
					performedByUserId: "user-1",
					performedByName: "John Doe",
					action: "created",
					fieldName: null,
					oldValue: null,
					newValue: null,
					metadata: null,
					createdAt: "2024-01-01T10:00:00Z",
				},
			];

			render(<AuditLog logs={logs} isLoading={false} />);

			expect(screen.getByText("John Doe")).toBeInTheDocument();
			expect(screen.getByText(/created this member/i)).toBeInTheDocument();
		});

		it("should display field changes", () => {
			const logs = [
				{
					id: "log-1",
					performedByUserId: "user-1",
					performedByName: "John Doe",
					action: "role_changed",
					fieldName: "role",
					oldValue: "user",
					newValue: "admin",
					metadata: null,
					createdAt: "2024-01-01T10:00:00Z",
				},
			];

			render(<AuditLog logs={logs} isLoading={false} />);

			expect(screen.getByText("John Doe")).toBeInTheDocument();
			expect(screen.getByText(/changed role/i)).toBeInTheDocument();
		});

		it("should format field names correctly", () => {
			const logs = [
				{
					id: "log-1",
					performedByUserId: "user-1",
					performedByName: "John Doe",
					action: "status_changed",
					fieldName: "subscription_status",
					oldValue: "active",
					newValue: "canceled",
					metadata: null,
					createdAt: "2024-01-01T10:00:00Z",
				},
			];

			render(<AuditLog logs={logs} isLoading={false} />);

			expect(
				screen.getByText(/changed subscription status/i),
			).toBeInTheDocument();
		});

		it("should format boolean values", () => {
			const logs = [
				{
					id: "log-1",
					performedByUserId: "user-1",
					performedByName: "John Doe",
					action: "field_changed",
					fieldName: "is_active",
					oldValue: "true",
					newValue: "false",
					metadata: null,
					createdAt: "2024-01-01T10:00:00Z",
				},
			];

			render(<AuditLog logs={logs} isLoading={false} />);

			// The formatted values appear in the action description
			// Field name 'is_active' is formatted to 'Is Active'
			// Check that the action description contains the formatted boolean values
			const actionText = screen.getByText(/changed.*Is Active/i).textContent;
			expect(actionText).toContain("Yes");
			expect(actionText).toContain("No");
		});
	});
});
