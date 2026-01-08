import { describe, it, expect, vi, beforeEach } from "vitest";
import { members, getInitials, fetchMembers, type Member } from "./members";
import { mockFetchSuccess, mockFetchError } from "@/test/setup";

// Helper to mock fetch
function mockFetch() {
	return global.fetch as ReturnType<typeof vi.fn>;
}

describe("members data", () => {
	it("should have 4 members", () => {
		expect(members).toHaveLength(4);
	});

	it("should have correct member structure", () => {
		const member = members[0];
		expect(member).toHaveProperty("id");
		expect(member).toHaveProperty("name");
		expect(member).toHaveProperty("email");
		expect(member).toHaveProperty("organization");
		expect(member).toHaveProperty("role");
		expect(member).toHaveProperty("status");
	});

	it("should include John Doe from Acme Corp", () => {
		const john = members.find((m) => m.name === "John Doe");
		expect(john).toBeDefined();
		expect(john?.organization).toBe("Acme Corp");
		expect(john?.role).toBe("Admin");
	});
});

describe("getInitials", () => {
	it("should generate initials from full name", () => {
		expect(getInitials("John Doe")).toBe("JD");
	});

	it("should handle single name", () => {
		expect(getInitials("John")).toBe("J");
	});

	it("should handle multiple words", () => {
		expect(getInitials("John Michael Doe")).toBe("JM");
	});

	it("should uppercase initials", () => {
		expect(getInitials("john doe")).toBe("JD");
	});

	it("should handle empty string", () => {
		expect(getInitials("")).toBe("");
	});

	it("should limit to 2 characters", () => {
		expect(getInitials("John Michael David Smith")).toBe("JM");
	});
});

describe("fetchMembers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
		// Mock window.location.origin for URL construction
		Object.defineProperty(window, "location", {
			value: { origin: "http://localhost:3000" },
			writable: true,
			configurable: true,
		});
	});

	it("should fetch members without search query", async () => {
		const mockMembers: Member[] = [
			{
				id: "member-1",
				name: "John Doe",
				email: "john@acme.com",
				initials: "JD",
				organization: "Acme Corp",
				role: "Admin",
				status: "Active",
				lastLogin: "2h ago",
			},
		];

		mockFetch()
			.mockResolvedValueOnce(mockFetchSuccess({ users: mockMembers }))
			.mockResolvedValueOnce(mockFetchSuccess({ tickets: [] }));

		const result = await fetchMembers("acme");

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining("/api/tenant/acme/users"),
			expect.objectContaining({
				credentials: "include",
			}),
		);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("John Doe");
	});

	it("should include search query in URL when provided", async () => {
		mockFetch().mockResolvedValueOnce(mockFetchSuccess({ users: [] }));

		await fetchMembers("acme", "john");

		const callUrl = mockFetch().mock.calls[0][0] as string;
		expect(callUrl).toContain("search=john");
	});

	it("should fetch open tickets count for each member", async () => {
		const mockMembers: Member[] = [
			{
				id: "member-1",
				name: "John Doe",
				email: "john@acme.com",
				initials: "JD",
				organization: "Acme Corp",
				role: "Admin",
				status: "Active",
				lastLogin: "2h ago",
			},
			{
				id: "member-2",
				name: "Jane Smith",
				email: "jane@acme.com",
				initials: "JS",
				organization: "Acme Corp",
				role: "User",
				status: "Active",
				lastLogin: "1d ago",
			},
		];

		mockFetch()
			.mockResolvedValueOnce(mockFetchSuccess({ users: mockMembers }))
			.mockResolvedValueOnce(
				mockFetchSuccess({ tickets: [{ id: "ticket-1" }] }),
			) // member-1 has 1 ticket
			.mockResolvedValueOnce(
				mockFetchSuccess({ tickets: [{ id: "ticket-2" }, { id: "ticket-3" }] }),
			); // member-2 has 2 tickets

		const result = await fetchMembers("acme");

		expect(result[0].openTicketsCount).toBe(1);
		expect(result[1].openTicketsCount).toBe(2);
	});

	it("should set openTicketsCount to 0 when tickets fetch fails", async () => {
		const mockMembers: Member[] = [
			{
				id: "member-1",
				name: "John Doe",
				email: "john@acme.com",
				initials: "JD",
				organization: "Acme Corp",
				role: "Admin",
				status: "Active",
				lastLogin: "2h ago",
			},
		];

		mockFetch()
			.mockResolvedValueOnce(mockFetchSuccess({ users: mockMembers }))
			.mockResolvedValueOnce(mockFetchError("Not found", 404));

		const result = await fetchMembers("acme");

		expect(result[0].openTicketsCount).toBe(0);
	});

	it("should set openTicketsCount to 0 when tickets fetch throws error", async () => {
		const mockMembers: Member[] = [
			{
				id: "member-1",
				name: "John Doe",
				email: "john@acme.com",
				initials: "JD",
				organization: "Acme Corp",
				role: "Admin",
				status: "Active",
				lastLogin: "2h ago",
			},
		];

		mockFetch()
			.mockResolvedValueOnce(mockFetchSuccess({ users: mockMembers }))
			.mockRejectedValueOnce(new Error("Network error"));

		const result = await fetchMembers("acme");

		expect(result[0].openTicketsCount).toBe(0);
	});

	it("should fetch tickets with correct query params", async () => {
		const mockMembers: Member[] = [
			{
				id: "member-1",
				name: "John Doe",
				email: "john@acme.com",
				initials: "JD",
				organization: "Acme Corp",
				role: "Admin",
				status: "Active",
				lastLogin: "2h ago",
			},
		];

		mockFetch()
			.mockResolvedValueOnce(mockFetchSuccess({ users: mockMembers }))
			.mockResolvedValueOnce(mockFetchSuccess({ tickets: [] }));

		await fetchMembers("acme");

		// Check second call (tickets fetch)
		const ticketsCallUrl = mockFetch().mock.calls[1][0] as string;
		expect(ticketsCallUrl).toContain("/api/tenant/acme/tickets");
		expect(ticketsCallUrl).toContain("customerId=member-1");
		expect(ticketsCallUrl).toContain("status=open");
	});

	it("should return empty array on API error", async () => {
		mockFetch().mockResolvedValueOnce(mockFetchError("Not found", 404));

		const result = await fetchMembers("acme");

		expect(result).toEqual([]);
	});

	it("should return empty array on network error", async () => {
		mockFetch().mockRejectedValueOnce(new Error("Network error"));

		const result = await fetchMembers("acme");

		expect(result).toEqual([]);
	});

	it("should handle empty users array", async () => {
		mockFetch().mockResolvedValueOnce(mockFetchSuccess({ users: [] }));

		const result = await fetchMembers("acme");

		expect(result).toEqual([]);
		expect(fetch).toHaveBeenCalledTimes(1); // Only one call, no ticket fetches
	});
});
