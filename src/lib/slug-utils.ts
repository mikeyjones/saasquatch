/**
 * Slug generation utilities for knowledge base
 */

/**
 * Generate a URL-friendly slug from a title.
 *
 * Converts text to lowercase, removes special characters, replaces spaces
 * with hyphens, and limits length to 100 characters.
 *
 * @param title - The title to convert to a slug
 * @returns URL-friendly slug string
 */
export function generateSlug(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "") // Remove special characters
		.replace(/\s+/g, "-") // Replace spaces with hyphens
		.replace(/-+/g, "-") // Replace multiple hyphens with single
		.replace(/^-|-$/g, "") // Remove leading/trailing hyphens
		.substring(0, 100); // Limit length
}
