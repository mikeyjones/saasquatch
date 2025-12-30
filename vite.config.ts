import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import tidewave from 'tidewave/vite-plugin';

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST

const config = defineConfig({
  plugins: [
    tidewave(),
    ...(isTest ? [] : [devtools()]),
    ...(isTest ? [] : [nitro()]),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    ...(isTest ? [] : [tanstackStart()]),
    viteReact(),
    
  ],
  ssr: {
    noExternal: [],
  },
  optimizeDeps: {
    exclude: ['pg', 'pg-pool', 'drizzle-orm/node-postgres'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/routeTree.gen.ts',
        '**/styles.css',
        'src/components/ui/**', // UI primitives (vendor-like components)
        'src/routeTree.gen.ts',
        // Non-testable files
        'src/db/seed.ts', // Database seeding (2644 lines)
        'test-*.js', // Root test scripts
        'src/mcp-todos.ts', // MCP tooling
        'src/app.tsx', // Framework entry
        'src/router.tsx', // Framework routing
        'src/data/demo-*.ts', // Demo data files
        'src/data/demo.*.ts', // Demo data files (alternate pattern)
        'src/lib/demo-*.ts', // Demo utilities
        'src/integrations/**', // Third-party integrations
        // Route files (API and page routes - integration tested)
        'src/routes/**', // All route files
        // Utils that require external dependencies
        'src/utils/**', // Utility handlers
        // Lib files with external dependencies (auth, db, etc.)
        'src/lib/auth.ts', // Auth configuration
        'src/lib/auth-client.ts', // Auth client (requires browser)
        'src/lib/auth-server.ts', // Auth server (requires request context)
        'src/lib/get-user-organizations.ts', // Requires DB connection
        'src/lib/invoice-pdf.ts', // PDF generation (requires external libs)
        'src/lib/knowledge-search.ts', // Search utilities (requires embeddings)
        'src/lib/demo-store-devtools.tsx', // Demo/development utilities
        // DB files
        'src/db/index.ts', // DB connection (requires env)
        'src/db/schema.ts', // Schema declarations (no logic to test)
        // Hooks that require React context (router hooks)
        'src/hooks/use-tenant.ts',
        'src/hooks/demo.form-context.ts',
        'src/hooks/demo.form.ts',
      ],
      thresholds: {
        lines: 75,
        statements: 75,
        functions: 70,
        branches: 60,
      },
    },
  },
})

export default config
