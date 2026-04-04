import { test, expect } from '@playwright/test';

test.describe('Legal Pages', () => {
  test.beforeEach(async ({ page }) => {
    // No authentication needed for legal pages
  });

  test('Legal terms page loads correctly', async ({ page }) => {
    await page.goto('/legal/terms');
    await page.waitForLoadState('networkidle');
    
    // Verify legal page elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Terms of Service')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/legal-terms.png', fullPage: true });
  });

  test('Privacy policy page loads correctly', async ({ page }) => {
    await page.goto('/legal/privacy');
    await page.waitForLoadState('networkidle');
    
    // Verify legal page elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Privacy Policy')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/legal-privacy.png', fullPage: true });
  });

  test('Community guidelines page loads correctly', async ({ page }) => {
    await page.goto('/legal/community-guidelines');
    await page.waitForLoadState('networkidle');
    
    // Verify legal page elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Community Guidelines')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/legal-community.png', fullPage: true });
  });

  test('Complaints process page loads correctly', async ({ page }) => {
    await page.goto('/legal/complaints');
    await page.waitForLoadState('networkidle');
    
    // Verify legal page elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Complaints Process')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/legal-complaints.png', fullPage: true });
  });

  test('Legal pages content structure', async ({ page }) => {
    const legalPages = [
      { path: '/legal/terms', title: 'Terms of Service' },
      { path: '/legal/privacy', title: 'Privacy Policy' },
      { path: '/legal/community-guidelines', title: 'Community Guidelines' },
      { path: '/legal/complaints', title: 'Complaints Process' }
    ];
    
    for (const legalPage of legalPages) {
      await page.goto(legalPage.path);
      await page.waitForLoadState('networkidle');
      
      // Verify page title
      await expect(page.locator(`text=${legalPage.title}`)).toBeVisible();
      
      // Look for content sections
      const contentSections = page.locator('h2, h3, .section, [data-testid*="section"]');
      const sectionCount = await contentSections.count();
      
      console.log(`Found ${sectionCount} content sections on ${legalPage.title}`);
      expect(sectionCount).toBeGreaterThan(0);
      
      // Take screenshot of page structure
      await page.screenshot({ 
        path: `e2e/screenshots/legal-${legalPage.path.split('/').pop()}-structure.png`, 
        fullPage: false 
      });
    }
  });

  test('Legal pages navigation from footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Test legal links in footer
    const legalLinks = [
      { text: 'Terms', href: '/legal/terms' },
      { text: 'Privacy', href: '/legal/privacy' },
      { text: 'Community Guidelines', href: '/legal/community-guidelines' },
      { text: 'Complaints', href: '/legal/complaints' }
    ];
    
    for (const link of legalLinks) {
      const linkElement = page.locator(`a:has-text("${link.text}")`).first();
      
      if (await linkElement.isVisible()) {
        console.log(`Clicking legal link: ${link.text}`);
        
        // Click the link
        await linkElement.click();
        
        // Verify navigation
        await expect(page).toHaveURL(link.href);
        await page.waitForLoadState('networkidle');
        
        // Verify page loads correctly
        await expect(page.locator('h1')).toBeVisible();
        
        // Go back to landing page
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      } else {
        console.log(`Legal link not found: ${link.text}`);
      }
    }
  });

  test('Legal pages responsive design', async ({ page }) => {
    const legalPages = [
      '/legal/terms',
      '/legal/privacy',
      '/legal/community-guidelines',
      '/legal/complaints'
    ];
    
    // Test mobile legal pages
    await page.setViewportSize({ width: 375, height: 812 });
    
    for (const pagePath of legalPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Verify legal page loads on mobile
      await expect(page.locator('h1')).toBeVisible();
      
      // Take mobile screenshot
      await page.screenshot({ 
        path: `e2e/screenshots/legal-${pagePath.split('/').pop()}-mobile.png`, 
        fullPage: true 
      });
    }
    
    // Test desktop legal pages
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    for (const pagePath of legalPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Take desktop screenshot
      await page.screenshot({ 
        path: `e2e/screenshots/legal-${pagePath.split('/').pop()}-desktop.png`, 
        fullPage: true 
      });
    }
  });

  test('Legal pages performance', async ({ page }) => {
    const legalPages = [
      '/legal/terms',
      '/legal/privacy',
      '/legal/community-guidelines',
      '/legal/complaints'
    ];
    
    for (const pagePath of legalPages) {
      const startTime = Date.now();
      
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      console.log(`${pagePath} load time: ${loadTime}ms`);
      
      // Assert load time is reasonable (less than 3 seconds)
      expect(loadTime).toBeLessThan(3000);
      
      // Take performance screenshot
      await page.screenshot({ 
        path: `e2e/screenshots/legal-${pagePath.split('/').pop()}-performance.png`, 
        fullPage: false 
      });
    }
  });

  test('Legal pages content readability', async ({ page }) => {
    const legalPages = [
      '/legal/terms',
      '/legal/privacy',
      '/legal/community-guidelines',
      '/legal/complaints'
    ];
    
    for (const pagePath of legalPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Look for main content area
      const contentArea = page.locator('main, .content, [data-testid="content"], article').first();
      await expect(contentArea).toBeVisible();
      
      // Get content text
      const contentText = await contentArea.textContent();
      expect(contentText).toBeDefined();
      expect(contentText!.length).toBeGreaterThan(100);
      
      // Verify content is readable (has proper paragraph structure)
      const paragraphs = contentArea.locator('p');
      const paragraphCount = await paragraphs.count();
      expect(paragraphCount).toBeGreaterThan(2);
      
      // Check for proper heading structure
      const headings = contentArea.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
      
      // Take readability screenshot
      await page.screenshot({ 
        path: `e2e/screenshots/legal-${pagePath.split('/').pop()}-readability.png`, 
        fullPage: false 
      });
    }
  });

  test('Legal pages accessibility', async ({ page }) => {
    const legalPages = [
      '/legal/terms',
      '/legal/privacy',
      '/legal/community-guidelines',
      '/legal/complaints'
    ];
    
    for (const pagePath of legalPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Test keyboard navigation
      const firstHeading = page.locator('h1').first();
      await expect(firstHeading).toBeVisible();
      
      // Focus on first heading
      await firstHeading.press('Tab');
      
      // Verify focus is visible
      const isFocused = await firstHeading.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBe(true);
      
      // Take screenshot showing focus
      await page.screenshot({ 
        path: `e2e/screenshots/legal-${pagePath.split('/').pop()}-focus.png`, 
        fullPage: false 
      });
      
      // Check for ARIA labels
      const ariaElements = await page.$$('[aria-label], [aria-labelledby]');
      console.log(`Found ${ariaElements.length} ARIA elements on ${pagePath}`);
      
      // Check for alt text on images
      const images = await page.$$('img');
      for (const image of images) {
        const altText = await image.getAttribute('alt');
        console.log(`Image alt text: ${altText}`);
      }
    }
  });

  test('Legal pages print styles', async ({ page }) => {
    // Test how legal pages look when printed
    const legalPages = ['/legal/terms', '/legal/privacy'];
    
    for (const pagePath of legalPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      
      // Take print-style screenshot
      await page.screenshot({ 
        path: `e2e/screenshots/legal-${pagePath.split('/').pop()}-print.png`, 
        fullPage: true 
      });
      
      // Switch back to screen media
      await page.emulateMedia({ media: 'screen' });
    }
  });

  test('Legal pages search functionality', async ({ page }) => {
    // Test if legal pages have search functionality
    await page.goto('/legal/terms');
    await page.waitForLoadState('networkidle');
    
    // Look for search functionality
    const searchInput = page.locator('[data-testid="search-input"], input[type="search"], .search-input').first();
    
    if (await searchInput.isVisible()) {
      console.log('Search functionality found on legal page');
      
      // Test search with a common term
      await searchInput.fill('user');
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(2000);
      
      // Verify search results are highlighted
      const searchResults = page.locator('mark, .highlighted, [data-testid="search-result"]');
      const resultCount = await searchResults.count();
      
      console.log(`Found ${resultCount} search results`);
      
      // Take screenshot of search results
      await page.screenshot({ 
        path: 'e2e/screenshots/legal-search.png', 
        fullPage: false 
      });
    } else {
      console.log('Search functionality not found on legal page');
    }
  });

  test('Legal pages table of contents', async ({ page }) => {
    // Test if legal pages have table of contents
    await page.goto('/legal/terms');
    await page.waitForLoadState('networkidle');
    
    // Look for table of contents
    const tableOfContents = page.locator('[data-testid="table-of-contents"], .table-of-contents, .toc, [class*="toc"]').first();
    
    if (await tableOfContents.isVisible()) {
      console.log('Table of contents found on legal page');
      
      // Get TOC links
      const tocLinks = tableOfContents.locator('a, .toc-link');
      const linkCount = await tocLinks.count();
      
      console.log(`Found ${linkCount} TOC links`);
      
      // Test TOC navigation
      if (linkCount > 0) {
        const firstLink = tocLinks.first();
        const linkText = await firstLink.textContent();
        console.log(`Clicking TOC link: ${linkText}`);
        
        // Click the link
        await firstLink.click();
        
        // Wait for navigation
        await page.waitForTimeout(1000);
        
        // Verify we're on the correct section
        await expect(page.locator(`text=${linkText}`)).toBeVisible();
        
        // Take screenshot of TOC
        await page.screenshot({ 
          path: 'e2e/screenshots/legal-toc.png', 
          fullPage: false 
        });
      }
    } else {
      console.log('Table of contents not found on legal page');
    }
  });

  test('Legal pages back navigation', async ({ page }) => {
    // Test navigation back from legal pages
    const legalPages = [
      '/legal/terms',
      '/legal/privacy',
      '/legal/community-guidelines',
      '/legal/complaints'
    ];
    
    for (const pagePath of legalPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Go back to previous page
      await page.goBack();
      
      // Should be back on landing page or previous page
      await expect(page.locator('h1')).toBeVisible();
      
      // Take screenshot of back navigation
      await page.screenshot({ 
        path: `e2e/screenshots/legal-back-${pagePath.split('/').pop()}.png`, 
        fullPage: false 
      });
    }
  });

  test('Legal pages external links', async ({ page }) => {
    // Test if legal pages have external links that open in new tabs
    await page.goto('/legal/terms');
    await page.waitForLoadState('networkidle');
    
    // Look for external links
    const externalLinks = page.locator('a[href^="http"], a[href^="https"], a[target="_blank"], a[rel*="external"]').first();
    
    if (await externalLinks.isVisible()) {
      console.log('External links found on legal page');
      
      const linkCount = await externalLinks.count();
      console.log(`Found ${linkCount} external links`);
      
      // Test first external link
      const firstLink = externalLinks.first();
      const linkText = await firstLink.textContent();
      const linkUrl = await firstLink.getAttribute('href');
      
      console.log(`External link: ${linkText} -> ${linkUrl}`);
      
      // Take screenshot of external links
      await page.screenshot({ 
        path: 'e2e/screenshots/legal-external-links.png', 
        fullPage: false 
      });
    } else {
      console.log('No external links found on legal page');
    }
  });

  test('Legal pages contact information', async ({ page }) => {
    // Test if legal pages have contact information
    const legalPages = [
      '/legal/terms',
      '/legal/privacy',
      '/legal/community-guidelines',
      '/legal/complaints'
    ];
    
    for (const pagePath of legalPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Look for contact information
      const contactInfo = page.locator(
        'text=contact, text=email, text@, text=info, text=support, text=complaints'
      ).first();
      
      if (await contactInfo.isVisible()) {
        console.log(`Contact information found on ${pagePath}`);
        
        // Take screenshot of contact info
        await page.screenshot({ 
          path: `e2e/screenshots/legal-contact-${pagePath.split('/').pop()}.png`, 
          fullPage: false 
        });
      } else {
        console.log(`No contact information found on ${pagePath}`);
      }
    }
  });
});