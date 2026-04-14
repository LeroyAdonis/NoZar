import { test, expect } from '@playwright/test';

test('verify landing page changes', async ({ page }) => {
  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');

  // Check spelling of 'organised'
  const content = await page.textContent('body');
  expect(content).toContain('organised');

  // Check referral CTA link
  const referralLink = page.getByRole('link', { name: /register/i });
  await expect(referralLink).toBeVisible();
  // We can't easily check the *exact* URL without clicking or getting attribute
  const href = await referralLink.getAttribute('href');
  expect(href).toContain('/register');
  expect(href).toContain('ref=invite');

  // Verify other content (stats, radius, safe zone) - simplistic check
  // Given previous tasks were completed, we check for presence of expected content
  // E.g., looking for "safe zone" in text
  await expect(page.locator('body')).toContainText(/safe zone/i);
  await expect(page.locator('body')).toContainText(/trade radius/i);
});
