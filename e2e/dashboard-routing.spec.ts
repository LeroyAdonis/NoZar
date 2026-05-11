import { expect, test, type Page, type TestInfo } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('dashboard routing auth', () => {
  test('guests are redirected from /dashboard to /login without redirectTo', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    expect(page.url()).not.toContain('redirectTo=');
  });

  test('guests are redirected from nested dashboard routes to /login without redirectTo', async ({ page }) => {
    await page.goto('/dashboard/asset/1');

    await expect(page).toHaveURL(/\/login$/);
    expect(page.url()).not.toContain('redirectTo=');
  });

  test('guests are redirected from /dashboard/map to /login without redirectTo', async ({ page }) => {
    await page.goto('/dashboard/map');

    await expect(page).toHaveURL(/\/login$/);
    expect(page.url()).not.toContain('redirectTo=');
  });
});

test.describe('dashboard map locality flow', () => {
  test.use({
    permissions: ['geolocation'],
    geolocation: { latitude: -26.2041, longitude: 28.0473 },
  });

  test('new authenticated users can anchor the radar from preview mode', async ({ page }, testInfo) => {
    await registerFreshUser(page, testInfo);

    await page.goto('/dashboard/map');
    await expect(page).toHaveURL(/\/dashboard\/map$/);
    await expect(page.getByRole('heading', { name: 'Map' })).toBeVisible();

    const dismissPreviewSetup = page.getByRole('button', { name: 'Maybe Later' });
    if (await dismissPreviewSetup.isVisible()) {
      await dismissPreviewSetup.click();
    }

    await expect(page.getByText('Preview only')).toBeVisible();
    await expect(page.getByText(/map stays in MVP preview mode/i)).toBeVisible();
    await expect(page.getByText(/Save your current location to turn this into a profile-anchored search/i)).toBeVisible();

    await page.getByRole('button', { name: /save current location/i }).first().click();

    const initializeRadarHeading = page.getByRole('heading', { name: 'Initialize Radar' });
    await expect(initializeRadarHeading).toBeVisible();
    await page.getByRole('button', { name: /enable location & start radar/i }).click({ force: true });

    await expect(initializeRadarHeading).toBeHidden();
    await expect(page.getByText('Profile anchored')).toBeVisible();
    await expect(page.getByText(/Your search centre is anchored to the coordinates saved on your profile/i)).toBeVisible();
    await expect(page.getByText('Locked to saved centre')).toBeVisible();
    await expect(page.getByText(/Searching within \d+km of your saved radar location/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /refresh saved location/i }).first()).toBeVisible();
  });
});

async function registerFreshUser(page: Page, testInfo: TestInfo) {
  const uniqueKey = `${Date.now()}-${testInfo.parallelIndex}-${slugifyProjectName(testInfo.project.name)}`;
  const email = `playwright-map-${uniqueKey}@example.com`;

  await page.goto('/register');
  await dismissCookieBanner(page);
  await page.getByLabel('Display Name').fill(`Playwright Map ${uniqueKey}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
}

function slugifyProjectName(projectName: string): string {
  return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function dismissCookieBanner(page: Page) {
  const acceptCookiesButton = page.getByRole('button', { name: 'Accept' });
  if (await acceptCookiesButton.isVisible()) {
    await acceptCookiesButton.click();
  }
}
