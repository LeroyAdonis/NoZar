import { test, expect } from '@playwright/test';

const LEGAL_PAGES = [
  { path: '/legal/terms',               title: 'Terms of Service'       },
  { path: '/legal/privacy',             title: 'Privacy Policy'         },
  { path: '/legal/community-guidelines', title: 'Community Guidelines'  },
  { path: '/legal/complaints',           title: 'Complaints Process'    },
] as const;

test.describe('Legal Pages', () => {
  // No auth required — legal pages are public.

  for (const { path, title } of LEGAL_PAGES) {
    test(`${title} page loads and shows h1`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator(`text=${title}`)).toBeVisible();
    });
  }

  test('all legal pages have readable content (paragraphs + headings)', async ({ page }) => {
    for (const { path } of LEGAL_PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const content = page.locator('main, article, [role="main"]').first();
      await expect(content).toBeVisible();

      const paragraphs = content.locator('p');
      expect(await paragraphs.count()).toBeGreaterThan(2);

      const headings = content.locator('h1, h2, h3, h4, h5, h6');
      expect(await headings.count()).toBeGreaterThan(0);
    }
  });

  test('all legal pages load within 3 seconds', async ({ page }) => {
    for (const { path } of LEGAL_PAGES) {
      const start = Date.now();
      await page.goto(path);
      await page.locator('h1').waitFor();
      expect(Date.now() - start).toBeLessThan(3000);
    }
  });

  test('legal links in footer navigate to correct routes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const legalLinks = [
      { text: 'Terms',                href: '/legal/terms'               },
      { text: 'Privacy',              href: '/legal/privacy'             },
      { text: 'Community Guidelines', href: '/legal/community-guidelines' },
      { text: 'Complaints',           href: '/legal/complaints'          },
    ];

    for (const link of legalLinks) {
      const el = page.locator(`a:has-text("${link.text}")`).first();
      if (await el.isVisible()) {
        await el.click();
        await expect(page).toHaveURL(link.href);
        await expect(page.locator('h1')).toBeVisible();

        // Return to landing and scroll to footer again
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      }
    }
  });

  test('legal pages are mobile-friendly at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    for (const { path } of LEGAL_PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('browser back from legal pages works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/legal/terms');
    await page.waitForLoadState('networkidle');

    await page.goBack();
    await expect(page.locator('h1')).toBeVisible();
  });
});