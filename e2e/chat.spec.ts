import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

// Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars to run these tests.
test.describe('Chat & Messaging (authenticated)', () => {
  test.skip(
    !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
    'Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars to run chat tests',
  );

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('pings page loads and shows heading', async ({ page }) => {
    await page.goto('/dashboard/pings');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').filter({ hasText: /Pings|Conversations/i }).first()).toBeVisible();
  });

  test('thread list or empty state is shown', async ({ page }) => {
    await page.goto('/dashboard/pings');
    await page.waitForLoadState('networkidle');

    // Either a thread list or a "no conversations" empty state should be visible
    const threads = page.locator('[data-testid*="thread"], [data-testid="ping-thread"]');
    const emptyState = page.locator('text=/no (pings|conversations)/i');

    const hasThreads = await threads.count() > 0;
    const hasEmpty = await emptyState.count() > 0;

    expect(hasThreads || hasEmpty).toBe(true);
  });

  test('clicking a thread navigates into the chat', async ({ page }) => {
    await page.goto('/dashboard/pings');
    await page.waitForLoadState('networkidle');

    const threads = page.locator('[data-testid*="thread"]');
    const count = await threads.count();

    if (count > 0) {
      await threads.first().click();
      await expect(page).toHaveURL(/\/dashboard\/pings\/.+/);
    }
  });

  test('pings page loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard/pings');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(5000);
  });

  test('mobile pings at 375px shows heading', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard/pings');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').filter({ hasText: /Pings|Conversations/i }).first()).toBeVisible();
  });
});