import { defineConfig, devices } from '@playwright/test'

// E2E test config. Per PLAN.md §3.3, we run a multi-viewport matrix
// to cover the design targets (phone portrait baseline, plus phone
// landscape, tablet portrait/landscape, and a desktop regression catch).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'phone-portrait',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'phone-landscape',
      use: { ...devices['iPhone 14 landscape'] },
    },
    {
      name: 'tablet-portrait',
      use: { ...devices['iPad Mini'] },
    },
    {
      name: 'tablet-landscape',
      use: { ...devices['iPad Mini landscape'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
})
