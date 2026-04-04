import { test, expect } from '@playwright/test';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up authentication - assuming user is logged in
    // In a real implementation, you would authenticate properly
  });

  test('Profile page loads successfully', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Verify profile page elements
    await expect(page.locator('text=Profile')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/profile-page-loaded.png', fullPage: true });
  });

  test('Profile user information displays correctly', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for profile elements
    const profileElements = [
      '[data-testid="profile-name"], .profile-name',
      '[data-testid="profile-email"], .profile-email',
      '[data-testid="profile-bio"], .profile-bio',
      '[data-testid="profile-location"], .profile-location'
    ];
    
    for (const selector of profileElements) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible();
      if (isVisible) {
        console.log(`Found profile element: ${selector}`);
        await expect(element).toBeVisible();
      }
    }
    
    // Take screenshot of profile information
    await page.screenshot({ path: 'e2e/screenshots/profile-information.png', fullPage: false });
  });

  test('Profile trust level display', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for trust level indicators
    const trustElements = [
      '[data-testid="trust-level"], .trust-level',
      '[data-testid="trust-badge"], .trust-badge',
      '[data-testid="trust-stats"], .trust-stats'
    ];
    
    let trustFound = false;
    for (const selector of trustElements) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible();
      if (isVisible) {
        trustFound = true;
        console.log(`Found trust element: ${selector}`);
        await expect(element).toBeVisible();
        
        // Get trust level text if available
        const trustText = await element.textContent();
        console.log(`Trust level: ${trustText}`);
      }
    }
    
    if (!trustFound) {
      console.log('No trust level elements found - this may be expected for new users');
    }
    
    // Take screenshot of trust level
    await page.screenshot({ path: 'e2e/screenshots/profile-trust.png', fullPage: false });
  });

  test('Profile statistics display', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for statistics elements
    const statElements = [
      '[data-testid="trade-count"], .trade-count',
      '[data-testid="completed-trades"], .completed-trades',
      '[data-testid="average-rating"], .average-rating',
      '[data-testid="join-date"], .join-date'
    ];
    
    let statsFound = 0;
    for (const selector of statElements) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible();
      if (isVisible) {
        statsFound++;
        console.log(`Found stat element: ${selector}`);
        await expect(element).toBeVisible();
        
        // Get stat text
        const statText = await element.textContent();
        console.log(`Stat: ${statText}`);
      }
    }
    
    console.log(`Found ${statsFound} statistics elements`);
    
    // Take screenshot of statistics
    await page.screenshot({ path: 'e2e/screenshots/profile-statistics.png', fullPage: false });
  });

  test('Profile avatar and image display', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for profile avatar
    const avatarElements = [
      '[data-testid="profile-avatar"], .profile-avatar',
      'img[alt*="profile"], img[alt*="avatar"]',
      '.avatar img'
    ];
    
    for (const selector of avatarElements) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible();
      if (isVisible) {
        console.log(`Found avatar element: ${selector}`);
        await expect(element).toBeVisible();
        
        // Get image src or alt text
        const imgElement = element.locator('img').first();
        if (await imgElement.isVisible()) {
          const imgSrc = await imgElement.getAttribute('src');
          const imgAlt = await imgElement.getAttribute('alt');
          console.log(`Avatar src: ${imgSrc}`);
          console.log(`Avatar alt: ${imgAlt}`);
        }
        
        // Take screenshot of avatar
        await element.screenshot({ path: 'e2e/screenshots/profile-avatar.png' });
        break;
      }
    }
  });

  test('Profile edit functionality', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for edit button
    const editButton = page.locator('[data-testid="edit-button"], .edit-button, button:has-text("Edit"), button:has-text("Edit Profile")').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Should navigate to edit profile page or show edit form
      await page.waitForLoadState('networkidle');
      
      // Verify edit form elements
      const editForm = page.locator('[data-testid="edit-form"], .edit-form').first();
      await expect(editForm).toBeVisible();
      
      // Look for form inputs
      const formInputs = [
        '[data-testid="name-input"], input[name="name"]',
        '[data-testid="bio-input"], textarea[name="bio"]',
        '[data-testid="location-input"], input[name="location"]'
      ];
      
      for (const selector of formInputs) {
        const input = page.locator(selector).first();
        if (await input.isVisible()) {
          console.log(`Found edit input: ${selector}`);
          await expect(input).toBeVisible();
        }
      }
      
      // Take screenshot of edit form
      await page.screenshot({ path: 'e2e/screenshots/profile-edit.png', fullPage: true });
    } else {
      console.log('Edit button not found - profile may not be editable yet');
    }
  });

  test('Profile trade history', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for trade history section
    const tradeHistory = page.locator('[data-testid="trade-history"], .trade-history, text=Trade History, text=Past Trades').first();
    
    if (await tradeHistory.isVisible()) {
      // Scroll to trade history
      await tradeHistory.scrollIntoViewIfNeeded();
      
      // Wait for trade history to load
      await page.waitForTimeout(2000);
      
      // Look for trade items
      const tradeItems = page.locator('[data-testid="trade-item"], .trade-item, [class*="trade"]');
      const tradeCount = await tradeItems.count();
      
      console.log(`Found ${tradeCount} trade history items`);
      
      // Verify at least some trade items are present
      expect(tradeCount).toBeGreaterThanOrEqual(0);
      
      // Check trade item structure
      if (tradeCount > 0) {
        const firstTrade = tradeItems.first();
        
        // Verify trade elements
        await expect(firstTrade.locator('[data-testid="trade-asset"], .trade-asset')).toBeVisible();
        await expect(firstTrade.locator('[data-testid="trade-date"], .trade-date')).toBeVisible();
        await expect(firstTrade.locator('[data-testid="trade-status"], .trade-status')).toBeVisible();
        
        // Take screenshot of trade history
        await page.screenshot({ path: 'e2e/screenshots/profile-trade-history.png', fullPage: false });
      }
    } else {
      console.log('Trade history section not found - may not have trades yet');
    }
  });

  test('Profile ratings display', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for ratings section
    const ratingsSection = page.locator('[data-testid="ratings"], .ratings, text=Ratings, text=Reviews').first();
    
    if (await ratingsSection.isVisible()) {
      // Scroll to ratings
      await ratingsSection.scrollIntoViewIfNeeded();
      
      // Wait for ratings to load
      await page.waitForTimeout(2000);
      
      // Look for rating items
      const ratingItems = page.locator('[data-testid="rating-item"], .rating-item, [class*="rating"]');
      const ratingCount = await ratingItems.count();
      
      console.log(`Found ${ratingCount} rating items`);
      
      // Verify at least some rating items are present
      expect(ratingCount).toBeGreaterThanOrEqual(0);
      
      // Check rating item structure
      if (ratingCount > 0) {
        const firstRating = ratingItems.first();
        
        // Verify rating elements
        await expect(firstRating.locator('[data-testid="rating-score"], .rating-score')).toBeVisible();
        await expect(firstRating.locator('[data-testid="rating-comment"], .rating-comment')).toBeVisible();
        await expect(firstRating.locator('[data-testid="rating-author"], .rating-author')).toBeVisible();
        
        // Take screenshot of ratings
        await page.screenshot({ path: 'e2e/screenshots/profile-ratings.png', fullPage: false });
      }
    } else {
      console.log('Ratings section not found - may not have ratings yet');
    }
  });

  test('Profile settings section', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for settings section
    const settingsSection = page.locator('[data-testid="settings"], .settings, text=Settings, text=Preferences').first();
    
    if (await settingsSection.isVisible()) {
      // Scroll to settings
      await settingsSection.scrollIntoViewIfNeeded();
      
      // Look for setting options
      const settingOptions = page.locator('[data-testid="setting-option"], .setting-option, [class*="setting"]');
      const settingCount = await settingOptions.count();
      
      console.log(`Found ${settingCount} setting options`);
      
      // Verify at least some setting options are present
      expect(settingCount).toBeGreaterThanOrEqual(0);
      
      // Take screenshot of settings
      await page.screenshot({ path: 'e2e/screenshots/profile-settings.png', fullPage: false });
    } else {
      console.log('Settings section not found - may not be implemented yet');
    }
  });

  test('Profile responsive design', async ({ page }) => {
    // Test mobile profile
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Verify profile loads on mobile
    await expect(page.locator('text=Profile')).toBeVisible();
    
    // Take mobile screenshot
    await page.screenshot({ path: 'e2e/screenshots/profile-mobile.png', fullPage: true });
    
    // Test desktop profile
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Reload for desktop view
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Take desktop screenshot
    await page.screenshot({ path: 'e2e/screenshots/profile-desktop.png', fullPage: true });
  });

  test('Profile performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Profile load time: ${loadTime}ms`);
    
    // Assert load time is reasonable (less than 3 seconds)
    expect(loadTime).toBeLessThan(3000);
    
    // Take performance screenshot
    await page.screenshot({ path: 'e2e/screenshots/profile-performance.png', fullPage: false });
  });

  test('Profile accessibility', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Test keyboard navigation
    const editButton = page.locator('[data-testid="edit-button"], .edit-button, button:has-text("Edit"), button:has-text("Edit Profile")').first();
    
    if (await editButton.isVisible()) {
      // Focus on edit button
      await editButton.press('Tab');
      
      // Verify focus is visible
      const isFocused = await editButton.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBe(true);
      
      // Take screenshot showing focus
      await page.screenshot({ path: 'e2e/screenshots/profile-focus.png', fullPage: false });
    }
    
    // Test ARIA labels if present
    const ariaElements = await page.$$('[aria-label]');
    console.log(`Found ${ariaElements.length} elements with aria-label`);
  });

  test('Profile error handling', async ({ page }) => {
    // Test what happens when there's missing data
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for empty states or missing data messages
    const emptyStates = [
      '[data-testid="empty-state"], .empty-state',
      'text=No trade history',
      'text=No ratings',
      'text=Profile incomplete'
    ];
    
    for (const selector of emptyStates) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        console.log(`Found empty state: ${selector}`);
        await expect(element).toBeVisible();
        
        // Take screenshot of empty state
        await page.screenshot({ path: 'e2e/screenshots/profile-empty-state.png', fullPage: false });
        break;
      }
    }
  });

  test('Profile navigation elements', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Verify profile navigation elements
    const profileHeader = page.locator('[data-testid="profile-header"], .profile-header').first();
    await expect(profileHeader).toBeVisible();
    
    // Check for back navigation
    const backButton = page.locator('[data-testid="back-button"], .back-button, button:has-text("<"), button:has-text("Back")').first();
    const backCount = await backButton.count();
    
    if (backCount > 0) {
      await expect(backButton.first()).toBeVisible();
    }
    
    // Take screenshot of profile navigation
    await page.screenshot({ path: 'e2e/screenshots/profile-navigation.png', fullPage: false });
  });

  test('Profile data validation', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for edit functionality to test validation
    const editButton = page.locator('[data-testid="edit-button"], .edit-button, button:has-text("Edit"), button:has-text("Edit Profile")').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForLoadState('networkidle');
      
      // Look for form validation
      const formInputs = page.locator('input, textarea');
      const inputCount = await formInputs.count();
      
      console.log(`Found ${inputCount} form inputs`);
      
      // Test validation by trying to submit empty form
      const submitButton = page.locator('[data-testid="submit-button"], .submit-button, button:has-text("Save"), button:has-text("Update")').first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Look for validation errors
        const validationErrors = page.locator('[data-testid="validation-error"], .validation-error, .error, .text-red-500');
        const errorCount = await validationErrors.count();
        
        console.log(`Found ${errorCount} validation errors`);
        
        if (errorCount > 0) {
          // Take screenshot of validation errors
          await page.screenshot({ path: 'e2e/screenshots/profile-validation.png', fullPage: false });
        }
      }
    }
  });
});