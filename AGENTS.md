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
bun run test:coverage    # Coverage report

# Code Quality
bun run check            # Biome check (lint + format)
bun run format           # Format code
bun run lint             # Lint code

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

## When Adding New Features

1. **Start with tests** that describe the expected behavior
2. **Check schema** — add database columns/tables if needed
3. **Update API** — add or modify route handlers
4. **Build components** — create UI with tests
5. **Run full test suite** — ensure no regressions
6. **Check coverage** — maintain thresholds

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

