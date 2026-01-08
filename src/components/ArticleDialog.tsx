import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { z } from "zod";

import { useAppForm } from "@/hooks/demo.form";
import { zodFormValidator } from "@/lib/form-utils";
import {
	createArticle,
	updateArticle,
	categoryOptions,
	articleStatusOptions,
	type KnowledgeArticle,
	type CreateArticleInput,
	type UpdateArticleInput,
} from "@/data/knowledge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

const articleSchema = z.object({
	title: z.string().min(1, "Title is required"),
	content: z.string().default(""),
	category: z.string().default(""),
	tags: z.string().default(""), // Comma-separated tags
	status: z.enum(["draft", "published", "archived"]),
});

/**
 * Props for the ArticleDialog component.
 */
interface ArticleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	article?: KnowledgeArticle | null; // If provided, edit mode
	onSaved?: () => void;
}

/**
 * Dialog component for creating or editing a knowledge article.
 *
 * Supports both create and edit modes. When an article is provided,
 * the form is pre-populated and the dialog operates in edit mode.
 *
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Callback when dialog open state changes
 * @param props.article - Article to edit (optional, for edit mode)
 * @param props.onSaved - Callback fired after successful save
 */
export function ArticleDialog({
	open,
	onOpenChange,
	article,
	onSaved,
}: ArticleDialogProps) {
	const params = useParams({ strict: false }) as { tenant?: string };
	const tenant = params.tenant || "";
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isEditMode = !!article;

	const form = useAppForm({
		defaultValues: {
			title: article?.title || "",
			content: article?.content || "",
			category: article?.category || "none",
			tags: article?.tags?.join(", ") || "",
			status: (article?.status || "draft") as
				| "draft"
				| "published"
				| "archived",
		},
		validators: {
			onBlur: zodFormValidator(articleSchema),
		},
		onSubmit: async ({ value }) => {
			if (!tenant) return;
			setIsSubmitting(true);
			setError(null);

			try {
				const tags = value.tags
					? value.tags
							.split(",")
							.map((t) => t.trim())
							.filter(Boolean)
					: undefined;

				// Convert 'none' category to undefined
				const category =
					value.category === "none" ? undefined : value.category || undefined;

				if (isEditMode && article) {
					const input: UpdateArticleInput = {
						id: article.id,
						title: value.title,
						content: value.content || undefined,
						category,
						tags,
						status: value.status,
					};
					const result = await updateArticle(tenant, input);

					if (!result.success) {
						setError(result.error || "Failed to update article");
						return;
					}
				} else {
					const input: CreateArticleInput = {
						title: value.title,
						content: value.content || undefined,
						category,
						tags,
						status: value.status,
					};
					const result = await createArticle(tenant, input);

					if (!result.success) {
						setError(result.error || "Failed to create article");
						return;
					}
				}

				form.reset();
				onOpenChange(false);
				onSaved?.();
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	// Reset form when dialog opens with different article
	useEffect(() => {
		if (open) {
			form.reset();
			form.setFieldValue("title", article?.title || "");
			form.setFieldValue("content", article?.content || "");
			form.setFieldValue("category", article?.category || "none");
			form.setFieldValue("tags", article?.tags?.join(", ") || "");
			form.setFieldValue(
				"status",
				(article?.status || "draft") as "draft" | "published" | "archived",
			);
			setError(null);
		}
	}, [open, article, form]);

	const handleDialogClose = (isOpen: boolean) => {
		if (!isOpen) {
			form.reset();
			setError(null);
		}
		onOpenChange(isOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleDialogClose}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle className="text-xl">
						{isEditMode ? "Edit Article" : "Create New Article"}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? "Update the article details below."
							: "Create a new help center article. Fill in the details below."}
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-5"
				>
					{error && (
						<div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
							{error}
						</div>
					)}

					{/* Title Field */}
					<form.AppField name="title">
						{(field) => (
							<field.TextField label="Title" placeholder="Article title" />
						)}
					</form.AppField>

					{/* Content Field */}
					<form.AppField name="content">
						{(field) => <field.TextArea label="Content" rows={8} />}
					</form.AppField>

					{/* Category Field */}
					<form.AppField name="category">
						{(field) => (
							<field.Select
								label="Category"
								values={[{ label: "None", value: "none" }, ...categoryOptions]}
								placeholder="Select category"
							/>
						)}
					</form.AppField>

					{/* Tags Field */}
					<div className="space-y-2">
						<Label className="text-xl font-bold">Tags</Label>
						<form.Subscribe selector={(state) => state.values.tags}>
							{(tags) => (
								<Input
									placeholder="Enter tags separated by commas (e.g., sso, authentication, security)"
									value={tags}
									onChange={(e) => form.setFieldValue("tags", e.target.value)}
								/>
							)}
						</form.Subscribe>
						<p className="text-xs text-gray-500">
							Separate multiple tags with commas
						</p>
					</div>

					{/* Status Field */}
					<form.AppField name="status">
						{(field) => (
							<field.Select
								label="Status"
								values={articleStatusOptions}
								placeholder="Select status"
							/>
						)}
					</form.AppField>

					<DialogFooter className="pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => handleDialogClose(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting
								? isEditMode
									? "Saving..."
									: "Creating..."
								: isEditMode
									? "Save Changes"
									: "Create Article"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
