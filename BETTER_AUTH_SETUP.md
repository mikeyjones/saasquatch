# Better Auth Setup

Better Auth has been integrated into this project. Follow these steps to complete the setup:

## 1. Environment Variables

Add these to your `.env.local` file:

```env
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=your-postgresql-connection-string
```

Generate a secure secret key:
```bash
bunx @better-auth/cli secret
```

## 2. Database Migration

Run the database migrations to create the Better Auth tables:

```bash
bun run db:generate
bun run db:migrate
```

This will create the following tables:
- `user` - User accounts
- `session` - User sessions
- `account` - OAuth accounts and credentials
- `verification` - Email verification tokens
- `organization` - Organizations (from organization plugin)
- `member` - Organization members
- `invitation` - Organization invitations

## 3. Usage

### Sign In/Sign Up Pages

Visit:
- `/auth/sign-in` - Sign in page
- `/auth/sign-up` - Sign up page

### Using Auth in Components

```tsx
import { authClient, useSession } from '@/lib/auth-client'

function MyComponent() {
  const { data: session } = useSession()
  
  if (session) {
    return <div>Hello, {session.user.name}!</div>
  }
  
  return <div>Please sign in</div>
}
```

### Sign Out

```tsx
import { authClient } from '@/lib/auth-client'

await authClient.signOut()
```

## 4. Features Enabled

- ✅ Email & Password authentication
- ✅ Organization plugin (multi-tenant support)
- ✅ Session management
- ✅ Drizzle ORM integration

## 5. API Routes

Better Auth API routes are available at `/api/auth/*`:
- `/api/auth/sign-in` - Sign in endpoint
- `/api/auth/sign-up` - Sign up endpoint
- `/api/auth/sign-out` - Sign out endpoint
- And more...

For more information, visit: https://www.better-auth.com/docs

