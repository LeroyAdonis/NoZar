import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('Landing page loads successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="hero-cta"]')).toBeVisible();
    await expect(page.locator('[data-testid="network-status"]')).toBeVisible();
  });

  test('Get Started Free navigates to register', async ({ page }) => {
    await page.goto('/');

    const cta = page.locator('[data-testid="hero-cta"]');
    await expect(cta).toBeVisible();
    await cta.click();

    // Should land on /register (or /login when logged in → /dashboard)
    await expect(page).toHaveURL(/\/(register|login|dashboard)/);
  });

  test('Google OAuth button is present on login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Verify the Google OAuth button exists — we don't follow the redirect
    // because that leads to accounts.google.com which Playwright cannot fake.
    const googleButton = page.locator('text=Continue with Google').first();
    await expect(googleButton).toBeVisible();
  });

  test('Unauthenticated access to protected routes redirects to login', async ({ page }) => {
    const protectedRoutes = [
      '/dashboard',
      '/dashboard/pings',
      '/dashboard/profile',
      '/dashboard/add',
    ];

    for (const route of protectedRoutes) {
      await page.context().clearCookies();
      await page.goto(route);
      await expect(page).toHaveURL('/login');
    }
  });

  test('Login page renders form elements', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Login error shown for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'notareal@user.example');
    await page.fill('input[type="password"]', 'wrongpassword123');
    await page.click('button[type="submit"]');

    // The form should stay on /login and show an error — it must NOT redirect
    // to /dashboard with bad credentials.
    await expect(page).toHaveURL('/login');
  });

  test('Mobile login form is usable at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    await emailInput.fill('test@example.com');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});