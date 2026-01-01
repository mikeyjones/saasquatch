# AGENTS.md — AI Agent Development Guide

This document provides guidance for AI coding agents working on this SaaS application. The project follows **Test-Driven Development (TDD)** practices and uses a modern TypeScript stack.

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Runtime | **Bun** (prefer over Node.js) |
| Framework | **TanStack Start** (React + Router + Query) |
| Styling | **Tailwind CSS v4** with shadcn/ui components |
| Database | **PostgreSQL** with Drizzle ORM |
| Authentication | **Better Auth** with organization plugin |
| Testing | **Vitest** + React Testing Library |
| Linting/Formatting | **Biome** |
| Validation | **Zod v4** |

---

## Test-Driven Development (TDD) Workflow

### The Red-Green-Refactor Cycle

1. **RED**: Write a failing test that describes the expected behavior
2. **GREEN**: Write the minimum code to make the test pass
3. **REFACTOR**: Clean up the code while keeping tests green

### Before Writing Code

```bash
# Run tests in watch mode during development
bun run test --watch

# Run all tests
bun run test

# Run tests with coverage
bun run test:coverage
```

### Coverage Thresholds

The project enforces minimum coverage thresholds (defined in `vite.config.ts`):

- **Lines**: 75%
- **Statements**: 75%
- **Functions**: 70%
- **Branches**: 60%

---

## Test File Patterns

### Important: Route Test File Naming

**Test files in `src/routes/` must be prefixed with `-` (hyphen)** so TanStack Router ignores them. This prevents warnings about test files not containing route definitions.

Example: `-api.tenant.$tenant.resource.test.ts` instead of `api.tenant.$tenant.resource.test.ts`

### Component Tests (`*.test.tsx`)

Location: Co-located with components in `src/components/`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from './MyComponent'
import { mockFetchSuccess, mockFetchError } from '@/test/setup'

// Mock router hooks
vi.mock('@tanstack/react-router', () => ({
	useParams: vi.fn(() => ({ tenant: 'acme' })),
}))

describe('MyComponent', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Reset fetch mock
		global.fetch = vi.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify({ error: 'Not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				})
			)
		) as typeof fetch
	})

	describe('Render Behavior', () => {
		it('should render expected content', async () => {
			render(<MyComponent />)
			expect(screen.getByText('Expected Text')).toBeInTheDocument()
		})
	})

	describe('User Interactions', () => {
		it('should handle click events', async () => {
			const user = userEvent.setup()
			render(<MyComponent />)
			
			await user.click(screen.getByRole('button', { name: /submit/i }))
			
			await waitFor(() => {
				expect(screen.getByText('Success')).toBeInTheDocument()
			})
		})
	})

	describe('API Integration', () => {
		it('should fetch data on mount', async () => {
			const mockData = { items: [{ id: '1', name: 'Item 1' }] }
			;(global.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(mockFetchSuccess(mockData))

			render(<MyComponent />)

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/tenant/acme/items')
				)
			})
		})
	})
})
```

### API/Route Tests (`-*.test.ts`)

Location: Co-located with route files in `src/routes/`

**Important**: Test files in the `routes/` directory must be prefixed with `-` (hyphen) so TanStack Router ignores them. For example: `-api.tenant.$tenant.resource.test.ts`

```typescript
import { describe, it, expect } from 'vitest'

/**
 * Tests for API endpoint
 * These tests document expected API behavior.
 */
describe('API Endpoint Name', () => {
	describe('GET /api/tenant/:tenant/resource', () => {
		it('should require authentication', () => {
			const expectedResponse = { error: 'Unauthorized' }
			expect(expectedResponse.error).toBe('Unauthorized')
		})

		it('should return expected data shape', () => {
			const expectedShape = {
				id: 'string',
				name: 'string',
				createdAt: 'ISO date string',
			}
			expect(expectedShape.id).toBeDefined()
		})
	})
})
```

### Schema Tests (`src/db/schema.test.ts`)

Test database schema structure and relationships:

```typescript
import { describe, it, expect } from 'vitest'
import { myTable } from './schema'

describe('myTable schema', () => {
	it('should have required columns', () => {
		const columns = Object.keys(myTable)
		expect(columns).toContain('id')
		expect(columns).toContain('organizationId')
		expect(columns).toContain('createdAt')
	})
})
```

### Data Function Tests (`src/data/*.test.ts`)

Test API client functions and data transformations:

```typescript
import { describe, it, expect } from 'vitest'

describe('data function', () => {
	describe('API Request', () => {
		it('should make request to correct endpoint', () => {
			const expectedUrl = `/api/tenant/acme/resource`
			expect(expectedUrl).toContain('/api/tenant/')
		})
	})

	describe('Response Handling', () => {
		it('should return expected shape', () => {
			const response = { items: [] }
			expect(Array.isArray(response.items)).toBe(true)
		})
	})
})
```

---

## Test Setup Utilities

The project provides test helpers in `src/test/setup.ts`:

```typescript
import { mockFetchSuccess, mockFetchError } from '@/test/setup'

// Create a successful response
const response = mockFetchSuccess({ data: 'value' }, 200)

// Create an error response
const errorResponse = mockFetchError('Error message', 500)
```

### Mocking Patterns

**Router mocks:**
```typescript
vi.mock('@tanstack/react-router', () => ({
	useParams: vi.fn(() => ({ tenant: 'acme' })),
	useNavigate: vi.fn(() => vi.fn()),
}))
```

**Fetch mocks:**
```typescript
beforeEach(() => {
	global.fetch = vi.fn()
})

// Mock sequential responses
(global.fetch as ReturnType<typeof vi.fn>)
	.mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))
	.mockResolvedValueOnce(mockFetchSuccess({ members: [] }))
```

---

## Describe Block Organization

Organize tests by behavior categories:

```typescript
describe('ComponentName', () => {
	describe('Render Behavior', () => {
		// Initial render states
	})

	describe('User Interactions', () => {
		// Click, type, submit actions
	})

	describe('API Integration', () => {
		// Fetch, POST, PATCH operations
	})

	describe('Loading States', () => {
		// Skeleton, spinner states
	})

	describe('Error States', () => {
		// Error handling, error messages
	})

	describe('Empty States', () => {
		// No data scenarios
	})

	describe('Validation', () => {
		// Form validation rules
	})
})
```

---

## Database Schema Patterns

### Multi-Tenant Architecture

All data is scoped to organizations:

```typescript
// Support staff organization data
organizationId: text('organizationId')
	.notNull()
	.references(() => organization.id, { onDelete: 'cascade' })

// Customer/tenant data (belongs to support org)
tenantOrganizationId: text('tenantOrganizationId')
	.notNull()
	.references(() => tenantOrganization.id, { onDelete: 'cascade' })
```

### Schema Conventions

- Use `text('id').primaryKey()` for UUIDs
- Add indexes for frequently queried columns
- Use `timestamp('createdAt').notNull().defaultNow()` for timestamps
- Store JSON data as `text()` columns (parse in application)
- Use `integer()` for monetary values (store cents, not dollars)

---

## API Route Patterns

### File Naming

Routes follow TanStack Router conventions:
- `api.tenant.$tenant.resource.ts` → `/api/tenant/:tenant/resource`
- `$tenant.app.section.page.tsx` → `/:tenant/app/section/page`

### API Response Structure

```typescript
// Success response
return new Response(JSON.stringify({
	items: [...],
	total: 100,
}), {
	status: 200,
	headers: { 'Content-Type': 'application/json' },
})

// Error response
return new Response(JSON.stringify({
	error: 'Error message',
}), {
	status: 400,
	headers: { 'Content-Type': 'application/json' },
})
```

---

## Component Patterns

### shadcn/ui Components

Install new components with:
```bash
bunx shadcn@latest add button
```

Components are in `src/components/ui/` and use:
- `class-variance-authority` for variants
- `tailwind-merge` for className merging
- `@radix-ui` primitives for accessibility

### Dialog Components

```typescript
interface CreateResourceDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onResourceCreated?: () => void
	// Optional pre-selection props
	preSelectedId?: string
	preSelectedName?: string
}
```

---

## Commands Reference

```bash
# Development
bun run dev              # Start dev server on port 3000

# Testing
bun run test             # Run all tests
bun run test --watch     # Watch mode
bun run test:coverage    # Coverage report (generates HTML in ./coverage/)

# Code Quality (run regularly!)
bun run check            # Biome check (lint + format)
bun run format           # Format code (auto-fixes many issues)
bun run lint             # Lint code (must pass with zero errors)
bun run test:coverage    # Test coverage (must meet thresholds)

# Database
bun run db:generate      # Generate migrations
bun run db:migrate       # Run migrations
bun run db:push          # Push schema (dev)
bun run db:studio        # Open Drizzle Studio
bun run db:seed          # Seed database
```

---

## TDD Best Practices for This Project

### 1. Write Tests First

Before implementing a feature:
1. Write a test describing the expected behavior
2. Run the test to confirm it fails
3. Implement the feature
4. Run the test to confirm it passes

### 2. Test Behavior, Not Implementation

```typescript
// ✅ Good: Test user-visible behavior
it('should show success message after form submission', async () => {
	await user.click(submitButton)
	expect(screen.getByText('Customer created')).toBeInTheDocument()
})

// ❌ Bad: Test implementation details
it('should call setIsSubmitting(true)', async () => {
	// Testing internal state is brittle
})
```

### 3. Use Meaningful Test Names

```typescript
// ✅ Good: Describes expected behavior
it('should disable submit button when required fields are empty')
it('should display error message when API returns 500')

// ❌ Bad: Vague or technical
it('should work')
it('handles the thing')
```

### 4. One Assertion Per Concept

```typescript
// ✅ Good: Related assertions about form state
it('should reset form after successful submission', async () => {
	await user.click(submitButton)
	await waitFor(() => {
		expect(nameInput).toHaveValue('')
		expect(emailInput).toHaveValue('')
	})
})

// ❌ Bad: Unrelated assertions
it('should do everything', async () => {
	expect(title).toBeInTheDocument()
	expect(button).toBeDisabled()
	expect(fetch).toHaveBeenCalled()
})
```

### 5. Mock External Dependencies

```typescript
// Mock fetch for API tests
beforeEach(() => {
	global.fetch = vi.fn()
})

// Mock router hooks
vi.mock('@tanstack/react-router', () => ({
	useParams: vi.fn(() => ({ tenant: 'acme' })),
}))
```

### 6. Test Edge Cases

Always consider:
- Empty states (no data)
- Error states (API failures)
- Loading states
- Validation errors
- Boundary conditions

---

## File Structure

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui primitives
│   └── *.test.tsx       # Component tests
├── data/                # Data fetching functions
│   └── *.test.ts        # Data function tests
├── db/                  # Database
│   ├── schema.ts        # Drizzle schema
│   ├── schema.test.ts   # Schema tests
│   └── index.ts         # DB connection
├── hooks/               # Custom React hooks
│   └── *.test.ts        # Hook tests
├── lib/                 # Utilities
├── routes/              # TanStack Router routes
│   ├── api.*.ts         # API endpoints
│   ├── $tenant.*.tsx    # Page routes
│   └── -*.test.ts       # Route tests (hyphen prefix required)
└── test/                # Test setup
    └── setup.ts         # Global test configuration
```

---

## Coverage Reports

Coverage reports are automatically generated when running `bun run test:coverage`. The HTML report is available in the `./coverage/` directory.

### GitHub Actions

When code is pushed to the `main` branch, GitHub Actions will:
1. Run all tests with coverage
2. Generate HTML coverage reports
3. Publish reports to GitHub Pages at: `https://<username>.github.io/<repo>/coverage/`

The workflow is defined in `.github/workflows/coverage.yml`.

## Code Quality Checks

**Always run coverage and linting tools before completing work** to ensure code quality standards are maintained:

```bash
# Run linting checks
bun run lint

# Run tests with coverage
bun run test:coverage
```

### Regular Verification

- **After making changes**: Run `bun run lint` to catch any code quality issues
- **Before committing**: Run `bun run test:coverage` to ensure:
  - All tests pass
  - Coverage thresholds are met (75% lines/statements, 70% functions, 60% branches)
- **If linting fails**: Fix issues before proceeding (most can be auto-fixed with `bun run format`)
- **If coverage fails**: Add tests or adjust exclusions in `vite.config.ts` as needed

Both tools must pass with zero errors before considering work complete.

## Documentation Standards

### TSDoc Comments

**Always add TSDoc comments to exported functions, components, interfaces, and types** to maintain 80% docstring coverage.

The project uses JSDoc-style comments compatible with TSDoc. Add documentation as you write code, not as an afterthought.

#### Format

```typescript
/**
 * Brief description of what the function/component does.
 * 
 * Optional longer description explaining behavior, edge cases, or usage.
 * 
 * @param paramName - Description of parameter
 * @returns Description of return value
 */
export function myFunction(paramName: string): string {
  // ...
}
```

#### Component Documentation

```typescript
/**
 * Dialog component for creating or editing a resource.
 * 
 * Supports both create and edit modes. When a resource is provided,
 * the form is pre-populated and the dialog operates in edit mode.
 * 
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Callback when dialog open state changes
 * @param props.resource - Resource to edit (optional, for edit mode)
 * @param props.onSaved - Callback fired after successful save
 */
export function CreateResourceDialog({ ... }: CreateResourceDialogProps) {
  // ...
}
```

#### Interface Documentation

```typescript
/**
 * Represents a resource with its properties.
 * 
 * Used for data transfer and type safety throughout the application.
 */
export interface Resource {
  id: string
  name: string
  // ...
}
```

#### What to Document

- ✅ All exported functions (public API)
- ✅ All exported React components
- ✅ All exported interfaces and types
- ✅ Helper functions used across modules
- ❌ Internal/private functions (unless complex)
- ❌ Test files
- ❌ Generated files (`routeTree.gen.ts`)
- ❌ UI primitives in `src/components/ui/` (vendor components)

#### Examples

**Function:**
```typescript
/**
 * Fetch all products for a tenant organization with their associated plans.
 * 
 * @param tenantSlug - The tenant organization slug
 * @param filters - Optional filters for product status
 * @returns Promise resolving to an array of products with their plans
 */
export async function fetchProducts(
  tenantSlug: string,
  filters?: { status?: string }
): Promise<Product[]> {
  // ...
}
```

**Hook:**
```typescript
/**
 * Hook to get the current tenant slug from route params.
 * 
 * Use this in components that need the tenant identifier for navigation or display.
 * 
 * @returns The current tenant slug, or empty string if not in tenant route
 */
export function useTenantSlug(): string {
  // ...
}
```

**Utility:**
```typescript
/**
 * Utility function to merge Tailwind CSS classes.
 * 
 * Combines clsx for conditional classes and tailwind-merge to resolve
 * conflicting Tailwind classes intelligently.
 * 
 * @param inputs - Class values to merge (strings, objects, arrays)
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]): string {
  // ...
}
```

### Documentation Coverage

The project maintains **80% docstring coverage** for exported code. When adding new exports:

1. **Write the docstring immediately** as you write the code
2. **Include @param and @returns** tags for functions
3. **Describe component props** for React components
4. **Explain purpose and usage** for interfaces/types

This ensures documentation stays current and helps other developers (and AI agents) understand the codebase.

## When Adding New Features

1. **Start with tests** that describe the expected behavior
2. **Check schema** — add database columns/tables if needed
3. **Update API** — add or modify route handlers
4. **Build components** — create UI with tests
5. **Add documentation** — write TSDoc comments for all exported functions, components, and types
6. **Run full test suite** — ensure no regressions (`bun run test`)
7. **Check coverage** — maintain thresholds (`bun run test:coverage`)
8. **Run linting** — fix any code quality issues (`bun run lint`)

---

## Common Testing Gotchas

### Radix UI Components

Radix components need `ResizeObserver` mock (provided in setup):
```typescript
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}
```

### Async State Updates

Always wrap assertions in `waitFor`:
```typescript
await waitFor(() => {
	expect(screen.getByText('Loaded')).toBeInTheDocument()
})
```

### Select/Dropdown Components

Radix Select doesn't render options until opened. Use role-based queries:
```typescript
await user.click(screen.getByRole('combobox'))
await user.click(screen.getByRole('option', { name: 'Option 1' }))
```

---

## Environment

- Always use `bun` instead of `npm`/`yarn`/`pnpm`
- Tests run with `vitest` (not Jest)
- Path aliases: `@/` maps to `./src/`
- Biome for linting (not ESLint)
- Tabs for indentation, double quotes for strings


## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
