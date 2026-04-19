import { test, expect } from '@playwright/test'

// Phase 1 smoke test: the app loads and shows the title at every viewport.
// Real feature E2E tests will land alongside their phases.
test('app loads and shows the title', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /MLB The Show 26 Season Companion/i })
  ).toBeVisible()
})
