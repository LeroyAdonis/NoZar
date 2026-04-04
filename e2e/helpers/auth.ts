import { type Page } from '@playwright/test';

/**
 * Signs in via the UI email/password form using test credentials from env vars.
 *
 * Returns true if login succeeded.
 * Returns false if TEST_USER_EMAIL or TEST_USER_PASSWORD are not set — the
 * calling test should skip itself in that case.
 *
 * Usage:
 *   test.describe('auth-required', () => {
 *     test.skip(
 *       !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
 *       'Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars to run these tests',
 *     );
 *     test.beforeEach(async ({ page }) => { await loginAsTestUser(page); });
 *   });
 */
export async function loginAsTestUser(page: Page): Promise<boolean> {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) return false;

  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { timeout: 15_000 });

  return true;
}
