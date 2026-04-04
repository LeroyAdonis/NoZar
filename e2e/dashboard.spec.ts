import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

// ─── Auth-required dashboard tests ────────────────────────────────────────────
// Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars to run these tests.
// Without credentials the whole describe block is skipped (not failed).
test.describe('Dashboard (authenticated)', () => {
  test.skip(
    !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
    'Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars to run dashboard tests',
  );

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('dashboard loads and shows feed container', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Region toggle and feed container should be present
    await expect(page.locator('[data-testid="region-toggle"]')).toBeVisible();
    // Feed is shown when listings exist; empty-state div is shown otherwise — both are valid
    const feedOrEmpty = page.locator('[data-testid="feed"], text=No listings found nearby');
    await expect(feedOrEmpty.first()).toBeVisible();
  });

  test('asset cards have correct data-testid', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const cards = page.locator('[data-testid="asset-card"]');
    const count = await cards.count();

    if (count > 0) {
      // Each card should be clickable and navigate to the asset detail page
      await cards.first().click();
      await expect(page).toHaveURL(/\/dashboard\/asset\/\d+/);
    }
  });

  test('region toggle switches region', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const toggle = page.locator('[data-testid="region-toggle"]');
    await expect(toggle).toBeVisible();

    // The toggle contains individual region buttons; click the second one
    const buttons = toggle.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(1);

    await buttons.nth(1).click();
    // Navigates with ?region=... — URL should update
    await expect(page).toHaveURL(/[?&]region=/);
  });

  test('category filter pills are present and clickable', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Category buttons: All, Electronics, Furniture, Service, Vehicles
    const electronicsBtn = page.locator('button', { hasText: 'Electronics' });
    await expect(electronicsBtn).toBeVisible();
    await electronicsBtn.click();

    await expect(page).toHaveURL(/[?&]category=Electronics/);
  });

  test('bottom nav is visible and links to correct routes', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="bottom-nav"]');
    await expect(nav).toBeVisible();

    // Pings link
    await nav.locator('a[href="/dashboard/pings"]').click();
    await expect(page).toHaveURL('/dashboard/pings');
  });

  test('dashboard loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(5000);
  });

  test('mobile dashboard at 375px shows region toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="region-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();
  });
});