import { expect, test, type Page, type TestInfo } from '@playwright/test';

// Serial mode: registration test mutates state (creates a user), layout tests follow.
test.describe.configure({ mode: 'serial' });

// Auth redirect tests use request.get (not page.goto) because React Router v7's
// dev-mode SSR streaming can abort the connection before the browser frame commits,
// causing ERR_ABORTED. HTTP-level requests bypass the frame entirely and are reliable.
test.describe('chat page auth redirects', () => {
  test('guests are redirected from /dashboard/pings to /login', async ({ request }) => {
    const response = await request.get('/dashboard/pings', {
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(302);
    const location = response.headers()['location'] ?? '';
    expect(location).toMatch(/\/login$/);
    expect(location).not.toContain('redirectTo=');
  });

  test('guests are redirected from /dashboard/pings/1 to /login', async ({ request }) => {
    const response = await request.get('/dashboard/pings/1', {
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(302);
    const location = response.headers()['location'] ?? '';
    expect(location).toMatch(/\/login$/);
    expect(location).not.toContain('redirectTo=');
  });
});

// Mobile layout smoke tests at 390×844 (iPhone 12 Pro dimensions).
test.describe('chat mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('landing page has no horizontal overflow at mobile viewport', async ({ page }) => {
    await page.goto('/');

    const bodyScrollWidth: number = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 390;

    expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('pings list page loads and has no horizontal overflow for authenticated user', async ({
    page,
  }, testInfo) => {
    await registerFreshUser(page, testInfo);

    await page.goto('/dashboard/pings');
    await expect(page).toHaveURL(/\/dashboard\/pings$/);

    // Page heading should be visible.
    await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible();

    // Body must not be wider than the 390 px viewport — no horizontal scroll.
    const bodyScrollWidth: number = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 390;
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth);
  });
});

// ---------------------------------------------------------------------------
// Helpers (mirrors dashboard-routing.spec.ts)
// ---------------------------------------------------------------------------

async function registerFreshUser(page: Page, testInfo: TestInfo) {
  const uniqueKey = `${Date.now()}-${testInfo.parallelIndex}-${slugifyProjectName(testInfo.project.name)}`;
  const email = `playwright-chat-${uniqueKey}@example.com`;

  await page.goto('/register');
  await dismissCookieBanner(page);
  await page.getByLabel('Display Name').fill(`Playwright Chat ${uniqueKey}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Allow extra time for Neon DB cold-start during registration (first real DB write per run).
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
}

function slugifyProjectName(projectName: string): string {
  return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function dismissCookieBanner(page: Page) {
  const acceptCookiesButton = page.getByRole('button', { name: 'Accept' });
  if (await acceptCookiesButton.isVisible()) {
    await acceptCookiesButton.click();
  }
}
