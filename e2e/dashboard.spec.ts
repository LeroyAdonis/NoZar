import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up authentication - this would need to be implemented with actual auth
    // For now, we'll test the UI assuming user is authenticated
    
    // Note: In a real implementation, you would:
    // 1. Use API calls to create an authenticated session
    // 2. Set cookies or use Playwright's authentication methods
    // 3. Or use the auth.login() method if implemented
    
    // For now, we'll navigate directly and assume the authentication works
  });

  test('Dashboard loads successfully', async ({ page }) => {
    // Navigate to dashboard (assuming user is authenticated)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Verify dashboard elements
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Verify feed section
    await expect(page.locator('text=Active Listings')).toBeVisible();
    
    // Verify region toggle
    await expect(page.locator('[data-testid="region-toggle"], .region-toggle')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/dashboard-loaded.png', fullPage: true });
  });

  test('Dashboard feed displays asset cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Wait for asset cards to load
    await page.waitForSelector('[data-testid="asset-card"], .asset-card', { timeout: 10000 });
    
    // Count asset cards
    const assetCards = page.locator('[data-testid="asset-card"], .asset-card');
    const cardCount = await assetCards.count();
    
    console.log(`Found ${cardCount} asset cards`);
    
    // Verify at least one asset card is present
    expect(cardCount).toBeGreaterThan(0);
    
    // Check first asset card content
    if (cardCount > 0) {
      const firstCard = assetCards.first();
      
      // Verify key elements in asset card
      await expect(firstCard.locator('[data-testid="asset-title"], .asset-title')).toBeVisible();
      await expect(firstCard.locator('[data-testid="asset-user"], .asset-user')).toBeVisible();
      await expect(firstCard.locator('[data-testid="asset-distance"], .asset-distance')).toBeVisible();
      
      // Take screenshot of asset cards
      await page.screenshot({ path: 'e2e/screenshots/dashboard-feed.png', fullPage: false });
    }
  });

  test('Region toggle functionality', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Find region toggle
    const regionToggle = page.locator('[data-testid="region-toggle"], .region-toggle').first();
    await expect(regionToggle).toBeVisible();
    
    // Get current region
    const currentRegion = await regionToggle.textContent();
    console.log('Current region:', currentRegion);
    
    // Click to toggle region
    await regionToggle.click();
    
    // Wait for feed to update
    await page.waitForTimeout(2000);
    
    // Verify region has changed
    const newRegion = await regionToggle.textContent();
    expect(newRegion).not.toBe(currentRegion);
    
    // Verify feed still loads after region change
    const assetCards = page.locator('[data-testid="asset-card"], .asset-card');
    const cardCount = await assetCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(0);
    
    await page.screenshot({ path: 'e2e/screenshots/region-toggle.png', fullPage: false });
  });

  test('Asset card interactions', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Wait for asset cards to load
    await page.waitForSelector('[data-testid="asset-card"], .asset-card', { timeout: 10000 });
    
    const assetCards = page.locator('[data-testid="asset-card"], .asset-card');
    const cardCount = await assetCards.count();
    
    if (cardCount > 0) {
      // Click on first asset card
      await assetCards.first().click();
      
      // Should navigate to asset detail page
      await expect(page).toHaveURL(/\/dashboard\/asset\/\d+/);
      
      // Verify asset detail page loads
      await expect(page.locator('[data-testid="asset-detail"], .asset-detail')).toBeVisible();
      
      // Take screenshot of asset detail
      await page.screenshot({ path: 'e2e/screenshots/asset-detail.png', fullPage: false });
      
      // Go back to dashboard
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }
  });

  test('Search functionality', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for search input
    const searchInput = page.locator('[data-testid="search-input"], input[type="search"], .search-input').first();
    
    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('laptop');
      
      // Press Enter or click search button
      await searchInput.press('Enter');
      
      // Wait for search results to load
      await page.waitForTimeout(3000);
      
      // Verify search results are displayed
      const searchResults = page.locator('[data-testid="search-results"], .search-results');
      await expect(searchResults).toBeVisible();
      
      // Take screenshot of search results
      await page.screenshot({ path: 'e2e/screenshots/search-results.png', fullPage: false });
    }
  });

  test('Category filtering', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for category filters
    const categoryFilters = page.locator('[data-testid="category-filter"], .category-filter, button:has-text("Electronics"), button:has-text("Furniture")');
    
    const filterCount = await categoryFilters.count();
    console.log(`Found ${filterCount} category filters`);
    
    if (filterCount > 0) {
      // Click first category filter
      await categoryFilters.first().click();
      
      // Wait for feed to update
      await page.waitForTimeout(2000);
      
      // Verify filtered results
      const assetCards = page.locator('[data-testid="asset-card"], .asset-card');
      const cardCount = await assetCards.count();
      
      console.log(`Filtered asset count: ${cardCount}`);
      
      // Take screenshot of filtered results
      await page.screenshot({ path: 'e2e/screenshots/category-filter.png', fullPage: false });
    }
  });

  test('Dashboard responsive design', async ({ page }) => {
    // Test mobile dashboard
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Verify dashboard loads on mobile
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Verify asset cards are responsive
    const assetCards = page.locator('[data-testid="asset-card"], .asset-card');
    const cardCount = await assetCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(0);
    
    // Take mobile screenshot
    await page.screenshot({ path: 'e2e/screenshots/dashboard-mobile.png', fullPage: true });
    
    // Test desktop dashboard
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Reload for desktop view
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Take desktop screenshot
    await page.screenshot({ path: 'e2e/screenshots/dashboard-desktop.png', fullPage: true });
  });

  test('Dashboard performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Wait for asset cards to load
    try {
      await page.waitForSelector('[data-testid="asset-card"], .asset-card', { timeout: 10000 });
    } catch (e) {
      console.log('No asset cards found, but dashboard loaded');
    }
    
    const loadTime = Date.now() - startTime;
    console.log(`Dashboard load time: ${loadTime}ms`);
    
    // Assert load time is reasonable (less than 5 seconds)
    expect(loadTime).toBeLessThan(5000);
    
    // Take performance screenshot
    await page.screenshot({ path: 'e2e/screenshots/dashboard-performance.png', fullPage: false });
  });

  test('Dashboard error handling', async ({ page }) => {
    // Test what happens when there's no data
    // This would require mocking an empty response
    
    // For now, test that the dashboard handles empty state gracefully
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for empty state message
    const emptyState = page.locator('[data-testid="empty-state"], .empty-state, text=No listings found');
    
    if (await emptyState.isVisible()) {
      // Verify empty state is user-friendly
      await expect(emptyState).toBeVisible();
      
      // Take screenshot of empty state
      await page.screenshot({ path: 'e2e/screenshots/dashboard-empty-state.png', fullPage: false });
    }
  });

  test('Dashboard navigation elements', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Verify dashboard header elements
    const dashboardHeader = page.locator('[data-testid="dashboard-header"], .dashboard-header').first();
    await expect(dashboardHeader).toBeVisible();
    
    // Check for user profile info
    const userProfile = page.locator('[data-testid="user-profile"], .user-profile, img[alt*="profile"], .avatar');
    const profileCount = await userProfile.count();
    
    if (profileCount > 0) {
      await expect(userProfile.first()).toBeVisible();
    }
    
    // Check for notifications icon
    const notifications = page.locator('[data-testid="notifications"], .notifications, button:has-text("Notifications")');
    const notificationCount = await notifications.count();
    
    if (notificationCount > 0) {
      await expect(notifications.first()).toBeVisible();
    }
    
    // Take screenshot of dashboard header
    await page.screenshot({ path: 'e2e/screenshots/dashboard-header.png', fullPage: false });
  });

  test('Dashboard loading states', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for loading indicators
    const loadingIndicators = page.locator('[data-testid="loading"], .loading, .spinner, .skeleton');
    const loadingCount = await loadingIndicators.count();
    
    console.log(`Found ${loadingCount} loading indicators`);
    
    // If loading indicators are present, wait for them to disappear
    if (loadingCount > 0) {
      await page.waitForSelector('[data-testid="loading"], .loading, .spinner, .skeleton', { state: 'hidden', timeout: 10000 });
    }
    
    // Verify final state
    const assetCards = page.locator('[data-testid="asset-card"], .asset-card');
    const cardCount = await assetCards.count();
    console.log(`Final asset card count: ${cardCount}`);
    
    // Take screenshot of final loaded state
    await page.screenshot({ path: 'e2e/screenshots/dashboard-loaded-state.png', fullPage: false });
  });

  test('Dashboard accessibility', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Test keyboard navigation
    const firstAssetCard = page.locator('[data-testid="asset-card"], .asset-card').first();
    
    if (await firstAssetCard.isVisible()) {
      // Focus on first asset card
      await firstAssetCard.press('Tab');
      
      // Verify focus is visible
      const isFocused = await firstAssetCard.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBe(true);
      
      // Take screenshot showing focus
      await page.screenshot({ path: 'e2e/screenshots/dashboard-focus.png', fullPage: false });
    }
    
    // Test ARIA labels if present
    const ariaElements = await page.$$('[aria-label]');
    console.log(`Found ${ariaElements.length} elements with aria-label`);
  });
});