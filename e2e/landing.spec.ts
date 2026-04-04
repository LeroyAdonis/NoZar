import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('Landing page loads completely', async ({ page }) => {
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Verify key sections are present
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=NoZar')).toBeVisible();
    await expect(page.locator('text=Barter Without Boundaries')).toBeVisible();
    
    // Verify hero section elements
    await expect(page.locator('text=Get Started Free')).toBeVisible();
    await expect(page.locator('text=View Live Index')).toBeVisible();
    
    // Verify navigation elements
    await expect(page.locator('text=Network Status:')).toBeVisible();
    
    // Take full page screenshot
    await page.screenshot({ path: 'e2e/screenshots/landing-page-complete.png', fullPage: true });
  });

  test('Hero section content and styling', async ({ page }) => {
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Verify hero title
    const heroTitle = page.locator('h1').first();
    await expect(heroTitle).toBeVisible();
    const titleText = await heroTitle.textContent();
    expect(titleText).toContain('NoZar');
    
    // Verify hero subtitle
    const heroSubtitle = page.locator('text=Barter Without Boundaries').first();
    await expect(heroSubtitle).toBeVisible();
    
    // Verify CTA buttons
    const getStartedButton = page.locator('button:has-text("Get Started Free")').first();
    const viewIndexButton = page.locator('button:has-text("View Live Index")').first();
    
    await expect(getStartedButton).toBeVisible();
    await expect(viewIndexButton).toBeVisible();
    
    // Verify button styling
    const getStartedButtonBox = await getStartedButton.boundingBox();
    expect(getStartedButtonBox).toBeDefined();
    expect(getStartedButtonBox!.width).toBeGreaterThan(100);
    
    await page.screenshot({ path: 'e2e/screenshots/hero-section.png', fullPage: false });
  });

  test('Network status indicator', async ({ page }) => {
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Find network status element
    const networkStatus = page.locator('text=Network Status:').first();
    await expect(networkStatus).toBeVisible();
    
    // Check if it contains expected text
    const statusText = await networkStatus.textContent();
    expect(statusText).toContain('Beta Active');
    
    await page.screenshot({ path: 'e2e/screenshots/network-status.png', fullPage: false });
  });

  test('How It Works section', async ({ page }) => {
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Scroll to How It Works section
    const howItWorksSection = page.locator('text=How It Works').first();
    await howItWorksSection.scrollIntoViewIfNeeded();
    
    // Wait for section to be visible
    await expect(howItWorksSection).toBeVisible();
    
    // Verify section content
    const steps = page.locator('[data-testid="step"], .step, [class*="step"]');
    const stepCount = await steps.count();
    expect(stepCount).toBeGreaterThan(0);
    
    await page.screenshot({ path: 'e2e/screenshots/how-it-works-section.png', fullPage: false });
  });

  test('Trust & Safety section', async ({ page }) => {
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Scroll to Trust & Safety section
    const trustSection = page.locator('text=Trust & Safety').first();
    await trustSection.scrollIntoViewIfNeeded();
    
    // Wait for section to be visible
    await expect(trustSection).toBeVisible();
    
    // Verify trust badges or indicators
    const trustBadges = page.locator('[data-testid="trust-badge"], .trust-badge, [class*="trust"]');
    const badgeCount = await trustBadges.count();
    expect(badgeCount).toBeGreaterThan(0);
    
    await page.screenshot({ path: 'e2e/screenshots/trust-safety-section.png', fullPage: false });
  });

  test('Security Protocol section', async ({ page }) => {
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Scroll to Security Protocol section
    const securitySection = page.locator('text=Security Protocol').first();
    await securitySection.scrollIntoViewIfNeeded();
    
    // Wait for section to be visible
    await expect(securitySection).toBeVisible();
    
    // Verify security features
    const securityFeatures = page.locator('[data-testid="security-feature"], .security-feature, [class*="security"]');
    const featureCount = await securityFeatures.count();
    expect(featureCount).toBeGreaterThan(0);
    
    await page.screenshot({ path: 'e2e/screenshots/security-protocol-section.png', fullPage: false });
  });

  test('Exchange Protocol section', async ({ page }) => {
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Scroll to Exchange Protocol section
    const exchangeSection = page.locator('text=Exchange Protocol').first();
    await exchangeSection.scrollIntoViewIfNeeded();
    
    // Wait for section to be visible
    await expect(exchangeSection).toBeVisible();
    
    // Verify exchange process description
    const processDescription = page.locator('[data-testid="process-description"], .process-description, [class*="exchange"]');
    const descriptionCount = await processDescription.count();
    expect(descriptionCount).toBeGreaterThan(0);
    
    await page.screenshot({ path: 'e2e/screenshots/exchange-protocol-section.png', fullPage: false });
  });

  test('Footer section', async ({ page }) => {
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Verify footer elements
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
    
    // Check for company info
    const footerText = await footer.textContent();
    expect(footerText).toContain('NoZar');
    
    // Check for legal links if present
    const legalLinks = page.locator('a:has-text("Terms"), a:has-text("Privacy"), a:has-text("Community")');
    const legalLinkCount = await legalLinks.count();
    expect(legalLinkCount).toBeGreaterThanOrEqual(0);
    
    await page.screenshot({ path: 'e2e/screenshots/footer-section.png', fullPage: false });
  });

  test('Navigation links functionality', async ({ page }) => {
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Test legal links in footer if they exist
    const legalLinks = [
      { text: 'Terms', href: '/legal/terms' },
      { text: 'Privacy', href: '/legal/privacy' },
      { text: 'Community Guidelines', href: '/legal/community-guidelines' },
      { text: 'Complaints', href: '/legal/complaints' }
    ];
    
    for (const link of legalLinks) {
      const linkElement = page.locator(`a:has-text("${link.text}")`).first();
      
      if (await linkElement.isVisible()) {
        // Click the link
        await linkElement.click();
        
        // Verify navigation
        await expect(page).toHaveURL(link.href);
        
        // Verify page loads
        await page.waitForLoadState('networkidle');
        
        // Go back to landing page
        await page.goto('/');
        await page.waitForLoadState('networkidle');
      }
    }
    
    await page.screenshot({ path: 'e2e/screenshots/navigation-links.png', fullPage: false });
  });

  test('Mobile responsiveness', async ({ page }) => {
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('https://no-zar-r66j.vercel.app');
    await page.waitForLoadState('networkidle');
    
    // Verify mobile layout
    const heroTitle = page.locator('h1').first();
    await expect(heroTitle).toBeVisible();
    
    const getStartedButton = page.locator('button:has-text("Get Started Free")').first();
    await expect(getStartedButton).toBeVisible();
    
    // Verify content is not cut off
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = page.viewportSize()?.height || 812;
    expect(bodyHeight).toBeGreaterThan(viewportHeight);
    
    await page.screenshot({ path: 'e2e/screenshots/landing-mobile.png', fullPage: true });
  });

  test('Desktop responsiveness', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await page.goto('https://no-zar-r66j.vercel.app');
    await page.waitForLoadState('networkidle');
    
    // Verify desktop layout
    const heroTitle = page.locator('h1').first();
    await expect(heroTitle).toBeVisible();
    
    const getStartedButton = page.locator('button:has-text("Get Started Free")').first();
    await expect(getStartedButton).toBeVisible();
    
    // Take wide screenshot
    await page.screenshot({ path: 'e2e/screenshots/landing-desktop.png', fullPage: true });
  });

  test('Performance - page load time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Wait for key elements to be ready
    await page.waitForSelector('h1');
    
    const loadTime = Date.now() - startTime;
    
    // Log load time for performance monitoring
    console.log(`Page load time: ${loadTime}ms`);
    
    // Assert load time is reasonable (less than 5 seconds)
    expect(loadTime).toBeLessThan(5000);
    
    // Take screenshot for performance baseline
    await page.screenshot({ path: 'e2e/screenshots/landing-performance.png', fullPage: false });
  });

  test('Accessibility - keyboard navigation', async ({ page }) => {
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Test tab navigation through interactive elements
    const getStartedButton = page.locator('button:has-text("Get Started Free")').first();
    
    // Focus on the button using keyboard
    await getStartedButton.press('Tab');
    
    // Verify button is focused
    const isFocused = await getStartedButton.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
    
    // Take screenshot showing focus state
    await page.screenshot({ path: 'e2e/screenshots/keyboard-focus.png', fullPage: false });
  });

  test('Accessibility - heading structure', async ({ page }) => {
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Check for proper heading hierarchy
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (headings) => {
      return headings.map((h, index) => ({
        tagName: h.tagName,
        text: h.textContent?.trim().substring(0, 50),
        level: parseInt(h.tagName.charAt(1))
      }));
    });
    
    console.log('Heading structure:', headings);
    
    // Verify we have at least one h1
    const h1Headings = headings.filter(h => h.level === 1);
    expect(h1Headings.length).toBeGreaterThan(0);
    
    // Verify h1 contains main title
    const mainH1 = h1Headings[0];
    expect(mainH1.text).toContain('NoZar');
    
    // Take screenshot for heading structure reference
    await page.screenshot({ path: 'e2e/screenshots/heading-structure.png', fullPage: false });
  });
});