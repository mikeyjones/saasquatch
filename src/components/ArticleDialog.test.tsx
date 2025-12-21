import * as router from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as knowledgeData from "@/data/knowledge";
import { ArticleDialog } from "./ArticleDialog";

vi.mock("@tanstack/react-router", () => ({
	useParams: vi.fn(() => ({ tenant: "acme" })),
}));

vi.mock("@/data/knowledge", () => ({
	createArticle: vi.fn(),
	updateArticle: vi.fn(),
	categoryOptions: [],
	articleStatusOptions: [],
}));

const mockUseParams = router.useParams as ReturnType<typeof vi.fn>;

describe("ArticleDialog", () => {
	const mockOnOpenChange = vi.fn();
	const mockOnSaved = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseParams.mockReturnValue({ tenant: "acme" });
	});

	describe("Render Behavior", () => {
		it("should render dialog when open", () => {
			render(
				<ArticleDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(
				screen.getByRole("heading", { name: /article/i }),
			).toBeInTheDocument();
		});

		it("should show create title in create mode", () => {
			render(
				<ArticleDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(
				screen.getByRole("heading", { name: /create new article/i }),
			).toBeInTheDocument();
		});

		it("should show edit title in edit mode", () => {
			const mockArticle = {
				id: "article-1",
				title: "Test Article",
				content: "Content",
				slug: "test-article",
				category: null,
				tags: [],
				status: "draft" as const,
				views: 0,
				publishedAt: null,
				createdAt: "2024-01-01",
				updatedAt: "2024-01-01",
				timeAgo: "1 day ago",
				createdBy: null,
				updatedBy: null,
			};

			render(
				<ArticleDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
					article={mockArticle}
				/>,
			);

			expect(
				screen.getByRole("heading", { name: /edit article/i }),
			).toBeInTheDocument();
		});
	});

	describe("Form Fields", () => {
		it("should render title field", () => {
			render(
				<ArticleDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
		});

		it("should render content field", () => {
			render(
				<ArticleDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
		});
	});

	describe("Form Submission", () => {
		it("should call createArticle when form is submitted", async () => {
			const user = userEvent.setup();
			vi.mocked(knowledgeData.createArticle).mockResolvedValueOnce({
				success: true,
				article: {
					id: "article-1",
					title: "New Article",
					content: "Content",
					slug: "new-article",
					category: null,
					tags: [],
					status: "draft" as const,
					views: 0,
					publishedAt: null,
					createdAt: "2024-01-01",
					updatedAt: "2024-01-01",
					timeAgo: "just now",
					createdBy: null,
					updatedBy: null,
				},
			});

			render(
				<ArticleDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			await user.type(screen.getByLabelText(/title/i), "New Article");
			const submitButton = screen.getByRole("button", { name: /create/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(knowledgeData.createArticle).toHaveBeenCalledWith(
					"acme",
					expect.any(Object),
				);
			});
		});

		it("should call onSaved callback after successful submission", async () => {
			const user = userEvent.setup();
			vi.mocked(knowledgeData.createArticle).mockResolvedValueOnce({
				success: true,
				article: {
					id: "article-1",
					title: "New Article",
					content: "Content",
					slug: "new-article",
					category: null,
					tags: [],
					status: "draft" as const,
					views: 0,
					publishedAt: null,
					createdAt: "2024-01-01",
					updatedAt: "2024-01-01",
					timeAgo: "just now",
					createdBy: null,
					updatedBy: null,
				},
			});

			render(
				<ArticleDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			await user.type(screen.getByLabelText(/title/i), "New Article");
			const submitButton = screen.getByRole("button", { name: /create/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockOnSaved).toHaveBeenCalled();
			});
		});
	});

	describe("Cancel Button", () => {
		it("should call onOpenChange(false) when Cancel clicked", async () => {
			const user = userEvent.setup();

			render(
				<ArticleDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onSaved={mockOnSaved}
				/>,
			);

			const cancelButton = screen.getByRole("button", { name: /cancel/i });
			await user.click(cancelButton);

			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});
	});
});
