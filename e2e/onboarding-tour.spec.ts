import { expect, test, type Page, type TestInfo } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

// Driver.js creates popovers in the DOM — we can target them by title text.
// The tour has 9 steps (index 0–8). Navigation steps (3 → /pings, 4 → /dashboard)
// trigger SPA route changes before advancing.

test.describe('onboarding tour', () => {
  test.use({ storageState: undefined });

  test('shows tour on first dashboard visit, walks through all steps, and completes', async ({ page }, testInfo) => {
    test.setTimeout(120_000); // Allow for Neon cold start

    await registerFreshUser(page, testInfo);

    // ── Step 0: Welcome ────────────────────────────────────────────────
    await expect(page.getByText('🤝 Welcome to NoZar').first()).toBeVisible({ timeout: 30_000 });
    await page.locator('.driver-popover-next-btn').click();

    // ── Step 1: List an Item ───────────────────────────────────────────
    await expect(page.getByText('📸 List an Item').first()).toBeVisible();
    await page.locator('.driver-popover-next-btn').click();

    // ── Step 2: Explore ────────────────────────────────────────────────
    await expect(page.getByText('🔍 Explore with AI').first()).toBeVisible();
    await page.locator('.driver-popover-next-btn').click();

    // ── Step 3: Chat — navigates to /pings ────────────────────────────
    await expect(page.getByText('💬 Chat Safely').first()).toBeVisible();
    await page.locator('.driver-popover-next-btn').click();

    // Wait for SPA navigation to /pings + Driver.js to advance
    await expect(page).toHaveURL(/\/dashboard\/pings$/, { timeout: 15_000 });

    // ── Step 4: Chat Page (/pings) ─────────────────────────────────────
    await expect(page.getByText('💬 Your Chats').first()).toBeVisible({ timeout: 15_000 });
    await page.locator('.driver-popover-next-btn').click();

    // Wait for SPA navigation back to dashboard + Driver.js to advance
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });

    // ── Step 5: AI Features ────────────────────────────────────────────
    await expect(page.getByText('🧠 AI-Powered Trading').first()).toBeVisible({ timeout: 15_000 });
    await page.locator('.driver-popover-next-btn').click();

    // ── Step 6: Safety & Trust ─────────────────────────────────────────
    await expect(page.getByText('🛡️ Safety First').first()).toBeVisible();
    await page.locator('.driver-popover-next-btn').click();

    // ── Step 7: Your Profile (on dashboard, no navigation) ─────────────
    await expect(page.getByText('👤 Your Profile').first()).toBeVisible();
    await page.locator('.driver-popover-next-btn').click();

    // ── Step 8: Done — last step ───────────────────────────────────────
    await expect(page.getByText("🌟 You're All Set!").first()).toBeVisible({ timeout: 15_000 });
    await page.locator('.driver-popover-next-btn').click();

    // ── Verify tour is gone and localStorage flag is set ────────────────
    await page.waitForTimeout(500);
    await expect(page.getByText('🤝 Welcome to NoZar')).not.toBeVisible({ timeout: 5_000 });
    const tourCompleted = await page.evaluate(() =>
      localStorage.getItem('nozar_tour_completed')
    );
    expect(tourCompleted).toBe('1');
  });

  test('tour does not reappear after completion', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await registerFreshUser(page, testInfo);

    // Set the completed flag
    await page.evaluate(() => localStorage.setItem('nozar_tour_completed', '1'));

    // Navigate to dashboard (from wherever registration left us)
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });

    // Verify the tour popover is NOT present
    await expect(page.getByText('🤝 Welcome to NoZar')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('📸 List an Item')).not.toBeVisible();
  });

  test('tour can be closed with x button', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await registerFreshUser(page, testInfo);

    // Step 0 visible
    await expect(page.getByText('🤝 Welcome to NoZar')).toBeVisible({ timeout: 30_000 });

    // Click the close button — Driver.js creates a close button with class
    const closeBtn = page.locator('.driver-popover-close-btn');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Verify tour is gone and localStorage flag is set
    await page.waitForTimeout(500);
    await expect(page.getByText('🤝 Welcome to NoZar')).not.toBeVisible({ timeout: 5_000 });
    const tourCompleted = await page.evaluate(() =>
      localStorage.getItem('nozar_tour_completed')
    );
    expect(tourCompleted).toBe('1');
  });

  test('tour does not break manual navigation', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await registerFreshUser(page, testInfo);

    // Let the welcome step appear, then manually navigate
    await expect(page.getByText('🤝 Welcome to NoZar')).toBeVisible({ timeout: 30_000 });

    await page.goto('/dashboard/map');
    await expect(page).toHaveURL(/\/dashboard\/map$/, { timeout: 15_000 });

    // Tour should close automatically since the step's element (#tour-welcome)
    // is no longer in the DOM path. Driver.js handles this gracefully.
    await expect(page.getByText('🤝 Welcome to NoZar')).not.toBeVisible({ timeout: 5_000 });

    // Navigating back should not restart the tour (it was destroyed on route change)
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    await expect(page.getByText('🤝 Welcome to NoZar')).not.toBeVisible({ timeout: 5_000 });
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function registerFreshUser(page: Page, testInfo: TestInfo) {
  const uniqueKey = `${Date.now()}-${testInfo.parallelIndex}-${slugifyProjectName(testInfo.project.name)}`;
  const email = `playwright-tour-${uniqueKey}@example.com`;

  await page.goto('/register');
  await dismissCookieBanner(page);
  await page.getByLabel('Display Name').fill(`Tour User ${uniqueKey}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Allow extra time for Neon DB cold-start during registration
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
}

function slugifyProjectName(projectName: string): string {
  return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function dismissCookieBanner(page: Page) {
  const acceptButton = page.getByRole('button', { name: 'Accept' });
  if (await acceptButton.isVisible()) {
    await acceptButton.click();
  }
}
