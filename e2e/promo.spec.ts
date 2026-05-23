import { expect, test, type Page, type TestInfo } from '@playwright/test';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function dismissCookieBanner(page: Page) {
  const acceptButton = page.getByRole('button', { name: 'Accept' });
  if (await acceptButton.isVisible()) {
    await acceptButton.click();
  }
}

function slugifyProjectName(projectName: string): string {
  return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Register a brand-new user and land on /dashboard.
 * Each call uses a unique email so tests never share state.
 */
async function registerFreshUser(page: Page, testInfo: TestInfo) {
  const uniqueKey = `${Date.now()}-${testInfo.parallelIndex}-${slugifyProjectName(testInfo.project.name)}`;
  const email = `promo-test-${uniqueKey}@test.nozar.co.za`;

  await page.goto('/register');
  await dismissCookieBanner(page);
  await page.getByLabel('Display Name').fill(`Promo Test ${uniqueKey}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Wait for redirect to dashboard — proves auth succeeded and promo was enrolled
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

// ─── Banner tests (unauthenticated) ─────────────────────────────────────────

test.describe('Promo Banner — landing page', () => {
  test('shows the promo banner on landing page', async ({ page }) => {
    await page.goto('/');
    // The full banner only appears after React hydration reads localStorage.
    // Wait up to 8 s for it to become visible.
    await page.locator('[data-testid="promo-banner"]').waitFor({
      state: 'visible',
      timeout: 8_000,
    });
    await expect(page.locator('[data-testid="promo-banner"]')).toBeVisible();
  });

  test('CTA links to /register for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="promo-banner"]').waitFor({
      state: 'visible',
      timeout: 8_000,
    });
    const href = await page
      .locator('[data-testid="promo-cta"]')
      .getAttribute('href');
    expect(href).toContain('/register');
  });

  test('dismiss button hides the banner and persists on reload', async ({
    page,
  }) => {
    // Ensure clean state before starting
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.removeItem('nozar-promo-dismissed'),
    );
    await page.reload();

    // Full banner must be visible before we dismiss
    await page.locator('[data-testid="promo-banner"]').waitFor({
      state: 'visible',
      timeout: 8_000,
    });

    // Dismiss — component re-renders to minimal bar (no promo-banner testid)
    await page.locator('[data-testid="promo-dismiss"]').click();
    await expect(page.locator('[data-testid="promo-banner"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="promo-dismiss"]')).not.toBeVisible();

    // Reload — localStorage "1" keeps dismissed=true; full banner must NOT reappear
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="promo-dismiss"]')).not.toBeVisible();

    // Cleanup so subsequent tests start with a fresh banner
    await page.evaluate(() =>
      localStorage.removeItem('nozar-promo-dismissed'),
    );
  });
});

// ─── Enrollment tests (authenticated) ───────────────────────────────────────

test.describe('Promo Enrollment — dashboard', () => {
  test('auto-enrolls user in plus promo on first dashboard visit', async ({
    page,
  }, testInfo) => {
    // Registration triggers dashboard loader → ensurePromoEnrolled → status="promo"
    await registerFreshUser(page, testInfo);

    await page.goto('/dashboard/billing');
    await page.locator('[data-testid="promo-status-card"]').waitFor({
      state: 'visible',
      timeout: 10_000,
    });

    await expect(
      page.locator('[data-testid="promo-status-card"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="promo-status-card"]'),
    ).toContainText(/beta plus active/i);
  });

  test('CTA links to /dashboard/billing for logged-in users', async ({
    page,
  }, testInfo) => {
    await registerFreshUser(page, testInfo);

    await page.goto('/');
    await page.locator('[data-testid="promo-banner"]').waitFor({
      state: 'visible',
      timeout: 8_000,
    });

    const href = await page
      .locator('[data-testid="promo-cta"]')
      .getAttribute('href');
    expect(href).toContain('/dashboard/billing');
  });
});

// ─── Legal page tests ────────────────────────────────────────────────────────

test.describe('Legal — beta promo terms', () => {
  test('beta promo terms page renders', async ({ page }) => {
    await page.goto('/legal/beta-promo');
    // There may be multiple h1s (page heading + markdown heading); target the first.
    // The component's <h1> reads "Beta Promotional Terms".
    await expect(page.locator('h1').first()).toContainText(/beta/i);
  });

  test('footer contains Beta Promo Terms link', async ({ page }) => {
    await page.goto('/');
    // React Router renders <Link to="/legal/beta-promo"> which becomes a regular anchor
    await expect(
      page.locator('a[href="/legal/beta-promo"]'),
    ).toBeVisible();
  });
});
