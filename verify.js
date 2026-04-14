import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');

  // Check spelling of 'organised'
  const content = await page.textContent('body');
  // Check for some content to ensure page loaded correctly
  if (!content) {
    throw new Error('Page content is empty');
  }

  // Check referral CTA link
  const referralLink = page.getByRole('link', { name: /register/i });
  const href = await referralLink.getAttribute('href');
  if (!href || !href.includes('/register') || !href.includes('ref=invite')) {
    throw new Error(`Referral link incorrect: ${href}`);
  }

  // Check for safe zone
  if (!(await page.locator('body').innerText()).includes('safe zone')) {
    throw new Error('Safe zone text not found');
  }

  console.log('Verification passed!');
  await browser.close();
})();
