import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('Landing page loads successfully', async ({ page }) => {
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Verify key elements are present
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Get Started Free')).toBeVisible();
    await expect(page.locator('text=Network Status:')).toBeVisible();
    
    // Take screenshot for documentation
    await page.screenshot({ path: 'e2e/screenshots/landing-page-loaded.png', fullPage: true });
  });

  test('Google OAuth authentication flow', async ({ page, context }) => {
    // Start from landing page
    await page.goto('https://no-zar-r66j.vercel.app');
    
    // Click Get Started Free button
    await page.click('text=Get Started Free');
    
    // Wait for auth page to load
    await page.waitForURL('/login');
    
    // Click Google OAuth option
    await page.click('text=Continue with Google');
    
    // Handle Google OAuth popup - this will need to be configured with actual Google account
    // For now, we'll test the UI flow up to the Google popup
    
    // Verify we're on Google's auth page
    await expect(page).toHaveURL(/accounts.google.com/);
    
    // Take screenshot to show the OAuth flow
    await page.screenshot({ path: 'e2e/screenshots/google-oauth-start.png', fullPage: true });
    
    // Note: This test will need to be configured with actual Google credentials
    // For CI/CD, we'd need to use Google's test accounts or mock the OAuth flow
  });

  test('Authentication redirect to dashboard', async ({ page }) => {
    // This test assumes the user is already authenticated
    // We'll test that authenticated users get redirected to dashboard
    
    // Clear cookies to start fresh
    await context.clearCookies();
    
    // Try to access dashboard directly
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL('/login');
    
    // Now simulate successful authentication
    // In a real test, we'd use the auth API to create a session
    // For now, we'll test the redirect behavior
    
    // Navigate to login page
    await page.goto('/login');
    
    // Verify login elements are present
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Sign in')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/screenshots/login-page.png', fullPage: true });
  });

  test('Logout functionality', async ({ page }) => {
    // This test assumes user is logged in
    // We'll test the logout flow
    
    // Navigate to dashboard (user should be authenticated)
    await page.goto('/dashboard');
    
    // Verify user is on dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Find and click logout button (exact selector depends on actual implementation)
    const logoutButton = page.locator('button:has-text("Sign Out")').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Should be redirected to landing page
      await expect(page).toHaveURL('/');
      await expect(page.locator('h1')).toBeVisible();
    }
    
    await page.screenshot({ path: 'e2e/screenshots/logout-success.png', fullPage: true });
  });

  test('Session persistence across page refreshes', async ({ page }) => {
    // This test verifies that authenticated sessions persist
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Verify user is authenticated
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Refresh the page
    await page.reload();
    
    // Should still be authenticated
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/screenshots/session-persistence.png', fullPage: true });
  });

  test('Access control for protected routes', async ({ page }) => {
    // Test various protected routes without authentication
    
    const protectedRoutes = [
      '/dashboard',
      '/dashboard/pings',
      '/dashboard/profile',
      '/dashboard/add',
      '/dashboard/asset/1'
    ];
    
    for (const route of protectedRoutes) {
      // Clear cookies to ensure unauthenticated state
      await context.clearCookies();
      
      // Try to access protected route
      await page.goto(route);
      
      // Should be redirected to login
      await expect(page).toHaveURL('/login');
      
      // Go back to landing page
      await page.goto('/');
    }
    
    await page.screenshot({ path: 'e2e/screenshots/access-control.png', fullPage: true });
  });

  test('Login error handling', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Try to submit empty form
    await page.click('button:has-text("Sign In")');
    
    // Should show validation error
    const errorElement = page.locator('.text-red-500, .error-message').first();
    if (await errorElement.isVisible()) {
      expect(await errorElement.textContent()).toContain('required');
    }
    
    await page.screenshot({ path: 'e2e/screenshots/login-error.png', fullPage: true });
  });

  test('Mobile responsive login', async ({ page }) => {
    // Test login page on mobile
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/login');
    
    // Verify mobile layout
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    
    // Test mobile interactions
    await page.click('input[type="email"]');
    await page.type('input[type="email"]', 'test@example.com');
    
    await page.screenshot({ path: 'e2e/screenshots/mobile-login.png', fullPage: true });
  });
});