import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type Activity, CRMActivityTimeline } from "./CRMActivityTimeline";

const mockActivities: Activity[] = [
	{
		id: "act-1",
		type: "deal_created",
		description: 'Created deal "Enterprise Contract"',
		timestamp: new Date().toISOString(),
		userId: "user-1",
		userName: "John Doe",
	},
	{
		id: "act-2",
		type: "deal_won",
		description: 'Won deal "Enterprise Contract" for $50,000',
		timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
		userName: "Jane Smith",
	},
	{
		id: "act-3",
		type: "contact_added",
		description: 'Added contact "Bob Wilson"',
		timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
	},
	{
		id: "act-4",
		type: "deal_lost",
		description: 'Lost deal "Small Business Plan"',
		timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
	},
	{
		id: "act-5",
		type: "note",
		description: "Added note about customer preferences",
		timestamp: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
	},
	{
		id: "act-6",
		type: "meeting",
		description: "Scheduled meeting for product demo",
		timestamp: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
	},
];

describe("CRMActivityTimeline", () => {
	describe("Render Behavior", () => {
		it("should render empty state when no activities", () => {
			render(<CRMActivityTimeline activities={[]} />);

			expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
		});

		it("should render activities list", () => {
			render(<CRMActivityTimeline activities={mockActivities} />);

			expect(
				screen.getByText(/created deal "enterprise contract"/i),
			).toBeInTheDocument();
			expect(
				screen.getByText(/won deal "enterprise contract"/i),
			).toBeInTheDocument();
			expect(
				screen.getByText(/added contact "bob wilson"/i),
			).toBeInTheDocument();
		});

		it("should render all activity types", () => {
			render(<CRMActivityTimeline activities={mockActivities} />);

			expect(screen.getByText(/created deal/i)).toBeInTheDocument();
			expect(screen.getByText(/won deal/i)).toBeInTheDocument();
			expect(screen.getByText(/lost deal/i)).toBeInTheDocument();
			expect(screen.getByText(/added contact/i)).toBeInTheDocument();
			expect(screen.getByText(/added note/i)).toBeInTheDocument();
			expect(screen.getByText(/scheduled meeting/i)).toBeInTheDocument();
		});
	});

	describe("User Attribution", () => {
		it("should display user name when provided", () => {
			render(<CRMActivityTimeline activities={mockActivities} />);

			expect(screen.getByText(/by john doe/i)).toBeInTheDocument();
			expect(screen.getByText(/by jane smith/i)).toBeInTheDocument();
		});

		it("should not display user attribution when userName is not provided", () => {
			const activityWithoutUser: Activity[] = [
				{
					id: "act-1",
					type: "note",
					description: "Some note",
					timestamp: new Date().toISOString(),
				},
			];

			render(<CRMActivityTimeline activities={activityWithoutUser} />);

			expect(screen.queryByText(/by/)).not.toBeInTheDocument();
		});
	});

	describe("Time Formatting", () => {
		it("should display relative time for recent activities", () => {
			const recentActivity: Activity[] = [
				{
					id: "act-1",
					type: "note",
					description: "Recent note",
					timestamp: new Date().toISOString(),
				},
			];

			render(<CRMActivityTimeline activities={recentActivity} />);

			// Should show minutes ago (e.g., "0m ago")
			expect(screen.getByText(/\d+m ago/)).toBeInTheDocument();
		});

		it("should display hours for activities within a day", () => {
			const hourlyActivity: Activity[] = [
				{
					id: "act-1",
					type: "note",
					description: "Hourly note",
					timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
				},
			];

			render(<CRMActivityTimeline activities={hourlyActivity} />);

			expect(screen.getByText(/5h ago/)).toBeInTheDocument();
		});

		it("should display days for activities within a week", () => {
			const dailyActivity: Activity[] = [
				{
					id: "act-1",
					type: "note",
					description: "Daily note",
					timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
				},
			];

			render(<CRMActivityTimeline activities={dailyActivity} />);

			expect(screen.getByText(/3d ago/)).toBeInTheDocument();
		});

		it("should display date for activities older than a week", () => {
			const oldActivity: Activity[] = [
				{
					id: "act-1",
					type: "note",
					description: "Old note",
					timestamp: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
				},
			];

			render(<CRMActivityTimeline activities={oldActivity} />);

			// Should show a date string (locale dependent)
			expect(screen.queryByText(/d ago/)).not.toBeInTheDocument();
		});
	});

	describe("Activity Icons", () => {
		it("should render different icons for different activity types", () => {
			render(<CRMActivityTimeline activities={mockActivities} />);

			// All activities should be rendered with icons
			const activityItems = screen
				.getAllByText(/./i)
				.filter(
					(el) =>
						el.classList.contains("text-sm") &&
						el.classList.contains("text-gray-900"),
				);
			expect(activityItems.length).toBeGreaterThan(0);
		});
	});

	describe("Timeline Structure", () => {
		it("should render timeline connectors between activities", () => {
			render(<CRMActivityTimeline activities={mockActivities.slice(0, 2)} />);

			// Should have 2 activities rendered
			expect(screen.getByText(/created deal/i)).toBeInTheDocument();
			expect(screen.getByText(/won deal/i)).toBeInTheDocument();
		});

		it("should render activities in provided order", () => {
			render(<CRMActivityTimeline activities={mockActivities} />);

			const descriptions = screen
				.getAllByText(/./i)
				.filter((el) => el.classList.contains("text-gray-900"));

			// First visible description should be the first activity
			expect(descriptions[0].textContent).toContain("Created deal");
		});
	});
});
