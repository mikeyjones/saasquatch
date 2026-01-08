import { createStart } from "@tanstack/react-start";
import { getRouter } from "./router";

/**
 * TanStack Start entry point.
 *
 * Note: The type assertion is required because TanStack Start's public API
 * expects a different signature than what's used internally by the Vite plugin.
 * The Vite plugin injects the actual start entry file at build time.
 */
export default createStart({
	getRouter,
	framework: "react",
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	// @ts-expect-error - Framework-specific type mismatch (TanStack Start API)
	// biome-ignore lint/suspicious/noExplicitAny: Framework-specific type mismatch
} as any);
