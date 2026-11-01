import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // o banco de teste (PGlite) leva alguns segundos para subir com todas as migrações
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
})
