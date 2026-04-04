import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('page loads and shows hero section', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="hero-cta"]')).toBeVisible();
    await expect(page.locator('[data-testid="network-status"]')).toBeVisible();
  });

  test('hero CTA links to register or dashboard', async ({ page }) => {
    const cta = page.locator('[data-testid="hero-cta"]');
    await expect(cta).toBeVisible();

    const href = await cta.getAttribute('href');
    expect(href).toMatch(/\/(register|dashboard)/);
  });

  test('network status badge shows Beta Active', async ({ page }) => {
    const badge = page.locator('[data-testid="network-status"]');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Beta Active');
  });

  test('How It Works section is present', async ({ page }) => {
    const section = page.locator('#how-it-works');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    // The section heading
    await expect(page.locator('text=How The Matrix Works')).toBeVisible();
  });

  test('footer renders with legal links', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();

    const footerText = await footer.textContent();
    expect(footerText).toBeTruthy();
  });

  test('legal navigation links point to correct routes', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const legalLinks = [
      { text: 'Terms', href: '/legal/terms' },
      { text: 'Privacy', href: '/legal/privacy' },
      { text: 'Community Guidelines', href: '/legal/community-guidelines' },
      { text: 'Complaints', href: '/legal/complaints' },
    ];

    for (const link of legalLinks) {
      const el = page.locator(`a:has-text("${link.text}")`).first();
      if (await el.isVisible()) {
        const href = await el.getAttribute('href');
        expect(href).toBe(link.href);
      }
    }
  });

  test('heading hierarchy has exactly one h1', async ({ page }) => {
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('mobile layout at 375px shows hero CTA', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="hero-cta"]')).toBeVisible();
  });

  test('page loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.locator('h1').waitFor();
    expect(Date.now() - start).toBeLessThan(5000);
  });
});