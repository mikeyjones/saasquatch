import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST

const config = defineConfig({
  plugins: [
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
