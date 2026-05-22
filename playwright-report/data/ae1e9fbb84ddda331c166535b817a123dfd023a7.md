# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard-routing.spec.ts >> dashboard map locality flow >> new authenticated users can anchor the radar from preview mode
- Location: e2e\dashboard-routing.spec.ts:34:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/dashboard$/
Received string:  "http://localhost:5173/register"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    9 × unexpected value "http://localhost:5173/register"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - link "NoZar" [ref=e5] [cursor=pointer]:
      - /url: /
      - img "NoZar" [ref=e6]
    - heading "Create Account" [level=1] [ref=e7]
    - paragraph [ref=e8]: Join the barter network
  - generic [ref=e9]:
    - progressbar "Loading" [ref=e10]
    - generic [ref=e12]:
      - generic [ref=e13]: Display Name
      - textbox "Display Name" [ref=e14]:
        - /placeholder: Zanele A.
        - text: Playwright Map 1779449816400-0-chromium
    - generic [ref=e15]:
      - generic [ref=e16]: Email
      - textbox "Email" [ref=e17]:
        - /placeholder: you@example.com
        - text: playwright-map-1779449816400-0-chromium@example.com
    - generic [ref=e18]:
      - generic [ref=e19]: Password
      - textbox "Password" [ref=e20]:
        - /placeholder: Min 8 characters
        - text: Password123!
    - button "Creating account..." [disabled] [ref=e21] [cursor=pointer]:
      - img [ref=e22]
      - text: Creating account...
  - generic [ref=e26]: Or
  - button "Continue with Google" [ref=e28] [cursor=pointer]:
    - img [ref=e29]
    - text: Continue with Google
  - paragraph [ref=e34]:
    - text: Already have an account?
    - link "Sign in" [ref=e35] [cursor=pointer]:
      - /url: /login
```

# Test source

```ts
  1  | import { expect, test, type Page, type TestInfo } from '@playwright/test';
  2  | 
  3  | test.describe.configure({ mode: 'serial' });
  4  | 
  5  | test.describe('dashboard routing auth', () => {
  6  |   test('guests are redirected from /dashboard to /login without redirectTo', async ({ page }) => {
  7  |     await page.goto('/dashboard');
  8  | 
  9  |     await expect(page).toHaveURL(/\/login$/);
  10 |     expect(page.url()).not.toContain('redirectTo=');
  11 |   });
  12 | 
  13 |   test('guests are redirected from nested dashboard routes to /login without redirectTo', async ({ page }) => {
  14 |     await page.goto('/dashboard/asset/1');
  15 | 
  16 |     await expect(page).toHaveURL(/\/login$/);
  17 |     expect(page.url()).not.toContain('redirectTo=');
  18 |   });
  19 | 
  20 |   test('guests are redirected from /dashboard/map to /login without redirectTo', async ({ page }) => {
  21 |     await page.goto('/dashboard/map');
  22 | 
  23 |     await expect(page).toHaveURL(/\/login$/);
  24 |     expect(page.url()).not.toContain('redirectTo=');
  25 |   });
  26 | });
  27 | 
  28 | test.describe('dashboard map locality flow', () => {
  29 |   test.use({
  30 |     permissions: ['geolocation'],
  31 |     geolocation: { latitude: -26.2041, longitude: 28.0473 },
  32 |   });
  33 | 
  34 |   test('new authenticated users can anchor the radar from preview mode', async ({ page }, testInfo) => {
  35 |     await registerFreshUser(page, testInfo);
  36 | 
  37 |     await page.goto('/dashboard/map');
  38 |     await expect(page).toHaveURL(/\/dashboard\/map$/);
  39 |     await expect(page.getByRole('heading', { name: 'Map' })).toBeVisible();
  40 | 
  41 |     const dismissPreviewSetup = page.getByRole('button', { name: 'Maybe Later' });
  42 |     if (await dismissPreviewSetup.isVisible()) {
  43 |       await dismissPreviewSetup.click();
  44 |     }
  45 | 
  46 |     await expect(page.getByText('Preview only')).toBeVisible();
  47 |     await expect(page.getByText(/map stays in MVP preview mode/i)).toBeVisible();
  48 |     await expect(page.getByText(/Save your current location to turn this into a profile-anchored search/i)).toBeVisible();
  49 | 
  50 |     await page.getByRole('button', { name: /save current location/i }).first().click();
  51 | 
  52 |     const initializeRadarHeading = page.getByRole('heading', { name: 'Initialize Radar' });
  53 |     await expect(initializeRadarHeading).toBeVisible();
  54 |     await page.getByRole('button', { name: /enable location & start radar/i }).click({ force: true });
  55 | 
  56 |     await expect(initializeRadarHeading).toBeHidden();
  57 |     await expect(page.getByText('Profile anchored')).toBeVisible();
  58 |     await expect(page.getByText(/Your search centre is anchored to the coordinates saved on your profile/i)).toBeVisible();
  59 |     await expect(page.getByText('Locked to saved centre')).toBeVisible();
  60 |     await expect(page.getByText(/Searching within \d+km of your saved radar location/i)).toBeVisible();
  61 |     await expect(page.getByRole('button', { name: /refresh saved location/i }).first()).toBeVisible();
  62 |   });
  63 | });
  64 | 
  65 | async function registerFreshUser(page: Page, testInfo: TestInfo) {
  66 |   const uniqueKey = `${Date.now()}-${testInfo.parallelIndex}-${slugifyProjectName(testInfo.project.name)}`;
  67 |   const email = `playwright-map-${uniqueKey}@example.com`;
  68 | 
  69 |   await page.goto('/register');
  70 |   await dismissCookieBanner(page);
  71 |   await page.getByLabel('Display Name').fill(`Playwright Map ${uniqueKey}`);
  72 |   await page.getByLabel('Email').fill(email);
  73 |   await page.getByLabel('Password').fill('Password123!');
  74 |   await page.getByRole('button', { name: 'Create Account' }).click();
  75 | 
> 76 |   await expect(page).toHaveURL(/\/dashboard$/);
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  77 | }
  78 | 
  79 | function slugifyProjectName(projectName: string): string {
  80 |   return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  81 | }
  82 | 
  83 | async function dismissCookieBanner(page: Page) {
  84 |   const acceptCookiesButton = page.getByRole('button', { name: 'Accept' });
  85 |   if (await acceptCookiesButton.isVisible()) {
  86 |     await acceptCookiesButton.click();
  87 |   }
  88 | }
  89 | 
```