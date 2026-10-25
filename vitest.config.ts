import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // tsconfig keeps `jsx: preserve` for Next; tests render TSX to static markup, so the
  // oxc transform (Vite 7's default) needs the automatic runtime.
  oxc: { jsx: { runtime: 'automatic' } },
  // The every-tool x every-OS render sweeps are slow on a busy machine; the 5 s default flaked.
  test: { environment: 'node', include: ['src/**/*.test.ts'], testTimeout: 30_000 },
})
