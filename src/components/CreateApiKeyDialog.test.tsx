import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateApiKeyDialog } from "./CreateApiKeyDialog";
import { mockFetchSuccess, mockFetchError } from "@/test/setup";

// Mock router
vi.mock("@tanstack/react-router", () => ({
	useParams: vi.fn(() => ({ tenant: "acme" })),
}));

describe("CreateApiKeyDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
	});

	describe("Render Behavior", () => {
		it("should render dialog when open", () => {
			render(
				<CreateApiKeyDialog
					open={true}
					onOpenChange={() => {}}
					onKeyCreated={() => {}}
				/>,
			);

			expect(screen.getByText("Create API Key")).toBeInTheDocument();
		});

		it("should not render dialog when closed", () => {
			render(
				<CreateApiKeyDialog
					open={false}
					onOpenChange={() => {}}
					onKeyCreated={() => {}}
				/>,
			);

			expect(screen.queryByText("Create API Key")).not.toBeInTheDocument();
		});

		it("should show name input field", () => {
			render(
				<CreateApiKeyDialog
					open={true}
					onOpenChange={() => {}}
					onKeyCreated={() => {}}
				/>,
			);

			expect(
				screen.getByPlaceholderText(/Production API Key/i),
			).toBeInTheDocument();
		});

		it("should show permissions select field", () => {
			render(
				<CreateApiKeyDialog
					open={true}
					onOpenChange={() => {}}
					onKeyCreated={() => {}}
				/>,
			);

			expect(screen.getByText("Permissions")).toBeInTheDocument();
		});
	});

	describe("Form Validation", () => {
		it("should disable submit button when name is empty", () => {
			render(
				<CreateApiKeyDialog
					open={true}
					onOpenChange={() => {}}
					onKeyCreated={() => {}}
				/>,
			);

			const submitButton = screen.getByRole("button", { name: /Create Key/i });
			expect(submitButton).toBeDisabled();
		});

		it("should enable submit button when name is provided", async () => {
			const user = userEvent.setup();
			render(
				<CreateApiKeyDialog
					open={true}
					onOpenChange={() => {}}
					onKeyCreated={() => {}}
				/>,
			);

			const nameInput = screen.getByPlaceholderText(/Production API Key/i);
			await user.type(nameInput, "My API Key");

			const submitButton = screen.getByRole("button", { name: /Create Key/i });
			expect(submitButton).not.toBeDisabled();
		});
	});

	describe("API Integration", () => {
		it("should call API when form is submitted", async () => {
			const user = userEvent.setup();
			const mockResponse = {
				id: "key-123",
				apiKeyId: "ba-key-123",
				name: "My API Key",
				key: "sk_live_abc123xyz456",
				prefix: "sk_live_",
				start: "sk_live_abc...",
				role: "read-only",
				enabled: true,
				createdAt: new Date().toISOString(),
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess(mockResponse, 201),
			);

			const onKeyCreated = vi.fn();
			render(
				<CreateApiKeyDialog
					open={true}
					onOpenChange={() => {}}
					onKeyCreated={onKeyCreated}
				/>,
			);

			// Fill in the form
			const nameInput = screen.getByPlaceholderText(/Production API Key/i);
			await user.type(nameInput, "My API Key");

			// Submit the form
			const submitButton = screen.getByRole("button", { name: /Create Key/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					"/acme/api/settings/api-keys",
					expect.objectContaining({
						method: "POST",
						headers: { "Content-Type": "application/json" },
					}),
				);
			});
		});

		it("should call onKeyCreated callback after successful creation", async () => {
			const user = userEvent.setup();
			const mockResponse = {
				id: "key-123",
				apiKeyId: "ba-key-123",
				name: "My API Key",
				key: "sk_live_abc123xyz456",
				prefix: "sk_live_",
				start: "sk_live_abc...",
				role: "read-only",
				enabled: true,
				createdAt: new Date().toISOString(),
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess(mockResponse, 201),
			);

			const onKeyCreated = vi.fn();
			render(
				<CreateApiKeyDialog
					open={true}
					onOpenChange={() => {}}
					onKeyCreated={onKeyCreated}
				/>,
			);

			const nameInput = screen.getByPlaceholderText(/Production API Key/i);
			await user.type(nameInput, "My API Key");

			const submitButton = screen.getByRole("button", { name: /Create Key/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(onKeyCreated).toHaveBeenCalled();
			});
		});
	});

	describe("Success State", () => {
		it("should show full key after successful creation", async () => {
			const user = userEvent.setup();
			const mockKey = "sk_live_abc123xyz456789";
			const mockResponse = {
				id: "key-123",
				apiKeyId: "ba-key-123",
				name: "My API Key",
				key: mockKey,
				prefix: "sk_live_",
				start: "sk_live_abc...",
				role: "read-only",
				enabled: true,
				createdAt: new Date().toISOString(),
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess(mockResponse, 201),
			);

			render(
				<CreateApiKeyDialog
					open={true}
					onOpenChange={() => {}}
					onKeyCreated={() => {}}
				/>,
			);

			const nameInput = screen.getByPlaceholderText(/Production API Key/i);
			await user.type(nameInput, "My API Key");

			const submitButton = screen.getByRole("button", { name: /Create Key/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText("API Key Created")).toBeInTheDocument();
			});

			expect(screen.getByText(mockKey)).toBeInTheDocument();
		});

		it("should show warning about key only being shown once", async () => {
			const user = userEvent.setup();
			const mockResponse = {
				id: "key-123",
				apiKeyId: "ba-key-123",
				name: "My API Key",
				key: "sk_live_abc123xyz456789",
				prefix: "sk_live_",
				start: "sk_live_abc...",
				role: "read-only",
				enabled: true,
				createdAt: new Date().toISOString(),
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchSuccess(mockResponse, 201),
			);

			render(
				<CreateApiKeyDialog
					open={true}
					onOpenChange={() => {}}
					onKeyCreated={() => {}}
				/>,
			);

			const nameInput = screen.getByPlaceholderText(/Production API Key/i);
			await user.type(nameInput, "My API Key");

			const submitButton = screen.getByRole("button", { name: /Create Key/i });
			await user.click(submitButton);

			await waitFor(() => {
				// Check for the warning text in the success state
				expect(
					screen.getByText(/Make sure to copy your API key now/i),
				).toBeInTheDocument();
			});
		});
	});

	describe("Error Handling", () => {
		it("should show error message on API failure", async () => {
			const user = userEvent.setup();
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				mockFetchError("Failed to create API key", 500),
			);

			render(
				<CreateApiKeyDialog
					open={true}
					onOpenChange={() => {}}
					onKeyCreated={() => {}}
				/>,
			);

			const nameInput = screen.getByPlaceholderText(/Production API Key/i);
			await user.type(nameInput, "My API Key");

			const submitButton = screen.getByRole("button", { name: /Create Key/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(
					screen.getByText(/Failed to create API key/i),
				).toBeInTheDocument();
			});
		});
	});
});
