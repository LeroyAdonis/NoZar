import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

// Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars to run these tests.
test.describe('Profile Page (authenticated)', () => {
  test.skip(
    !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
    'Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars to run profile tests',
  );

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('profile page loads and shows heading', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').filter({ hasText: /Profile|Node/i }).first()).toBeVisible();
  });

  test('bottom nav is present on profile page', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();
  });

  test('profile page loads within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(3000);
  });

  test('mobile profile at 375px shows heading', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').filter({ hasText: /Profile|Node/i }).first()).toBeVisible();
  });

  test('profile page has at least one heading', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');

    const headings = page.locator('h1, h2, h3');
    expect(await headings.count()).toBeGreaterThan(0);
  });
});