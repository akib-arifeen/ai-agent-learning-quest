import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // The every-tool x every-OS render sweeps are slow on a busy machine; the 5 s default flaked.
  test: { environment: 'node', include: ['src/**/*.test.ts'], testTimeout: 30_000 },
})
