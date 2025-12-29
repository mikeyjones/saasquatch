/**
 * Form utility functions for type-safe form validation with Zod v4
 * 
 * This wrapper is needed because Zod v4's type inference differs from
 * what TanStack Form's StandardSchemaV1 interface expects:
 * 
 * 1. `.default()` creates optional input but required output types
 * 2. `.optional()` creates union types that may not match form defaults
 * 3. Enum types may be narrower in defaultValues than in the schema
 * 
 * This provides a documented wrapper for the type assertion.
 */

import type { z } from 'zod'

// Re-export the StandardSchemaV1 interface that TanStack Form uses
interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1
    readonly vendor: string
    readonly validate: (
      value: unknown
    ) =>
      | { value: Output; issues?: undefined }
      | { issues: ReadonlyArray<{ message: string; path?: ReadonlyArray<PropertyKey> }> }
    readonly types?: { readonly input: Input; readonly output: Output }
  }
}

/**
 * Wraps a Zod schema for use with TanStack Form validators.
 * 
 * Zod v4 implements the Standard Schema interface but has type inference
 * differences that cause TypeScript errors with TanStack Form. This wrapper
 * provides a clean, documented solution for the compatibility issue.
 * 
 * The type assertion is safe because:
 * 1. Zod v4 implements `~standard` interface at runtime
 * 2. Form validation uses schema.parse() which applies defaults
 * 3. Validation errors are correctly surfaced to the form
 * 
 * @example
 * ```ts
 * const schema = z.object({ 
 *   name: z.string().min(1),
 *   bio: z.string().default('') 
 * })
 * 
 * useAppForm({
 *   validators: {
 *     onBlur: zodFormValidator(schema),
 *   },
 * })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// @ts-expect-error - Zod v4's ZodType requires any for generic inference
// biome-ignore lint/suspicious/noExplicitAny: Zod v4's ZodType requires any for generic inference
export function zodFormValidator<T extends z.ZodType<any>>(
  schema: T
): StandardSchemaV1<z.infer<T>, z.infer<T>> {
  // Zod v4 schemas implement the ~standard interface at runtime.
  // This cast bridges the type mismatch between Zod v4's implementation
  // and TanStack Form's expected interface.
  return schema as unknown as StandardSchemaV1<z.infer<T>, z.infer<T>>
}

