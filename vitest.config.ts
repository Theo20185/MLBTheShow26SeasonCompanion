import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vitest runs in Node, not the browser — it needs its own plugin pipeline.
// Tailwind isn't loaded here because tests don't render real CSS, and the
// Tailwind plugin's dev-server hooks aren't compatible with Vitest's
// bundled Vite version.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
})
