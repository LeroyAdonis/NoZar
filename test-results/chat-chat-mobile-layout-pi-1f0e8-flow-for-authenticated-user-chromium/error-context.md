# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chat.spec.ts >> chat mobile layout >> pings list page loads and has no horizontal overflow for authenticated user
- Location: e2e\chat.spec.ts:48:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/dashboard$/
Received string:  "http://localhost:5173/register"

Call log:
  - Expect "toHaveURL" with timeout 30000ms
    32 × unexpected value "http://localhost:5173/register"

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
    - paragraph [ref=e10]: Account created!
    - paragraph [ref=e11]: Check your email for a verification link before signing in.
    - paragraph [ref=e12]:
      - link "Go to Sign In →" [ref=e13] [cursor=pointer]:
        - /url: /login
  - generic [ref=e14]:
    - generic [ref=e15]:
      - generic [ref=e16]: Display Name
      - textbox "Display Name" [ref=e17]:
        - /placeholder: Zanele A.
        - text: Playwright Chat 1779897958011-0-chromium
    - generic [ref=e18]:
      - generic [ref=e19]: Email
      - textbox "Email" [ref=e20]:
        - /placeholder: you@example.com
        - text: playwright-chat-1779897958011-0-chromium@example.com
    - generic [ref=e21]:
      - generic [ref=e22]: Password
      - textbox "Password" [ref=e23]:
        - /placeholder: Min 8 characters
        - text: Password123!
    - button "Create Account" [ref=e24] [cursor=pointer]
  - generic [ref=e27]: Or
  - button "Continue with Google" [ref=e29] [cursor=pointer]:
    - img [ref=e30]
    - text: Continue with Google
  - paragraph [ref=e35]:
    - text: Already have an account?
    - link "Sign in" [ref=e36] [cursor=pointer]:
      - /url: /login
```

# Test source

```ts
  1  | import { expect, test, type Page, type TestInfo } from '@playwright/test';
  2  | 
  3  | // Serial mode: registration test mutates state (creates a user), layout tests follow.
  4  | test.describe.configure({ mode: 'serial' });
  5  | 
  6  | // Auth redirect tests use request.get (not page.goto) because React Router v7's
  7  | // dev-mode SSR streaming can abort the connection before the browser frame commits,
  8  | // causing ERR_ABORTED. HTTP-level requests bypass the frame entirely and are reliable.
  9  | test.describe('chat page auth redirects', () => {
  10 |   test('guests are redirected from /dashboard/pings to /login', async ({ request }) => {
  11 |     const response = await request.get('/dashboard/pings', {
  12 |       maxRedirects: 0,
  13 |       failOnStatusCode: false,
  14 |     });
  15 | 
  16 |     expect(response.status()).toBe(302);
  17 |     const location = response.headers()['location'] ?? '';
  18 |     expect(location).toMatch(/\/login$/);
  19 |     expect(location).not.toContain('redirectTo=');
  20 |   });
  21 | 
  22 |   test('guests are redirected from /dashboard/pings/1 to /login', async ({ request }) => {
  23 |     const response = await request.get('/dashboard/pings/1', {
  24 |       maxRedirects: 0,
  25 |       failOnStatusCode: false,
  26 |     });
  27 | 
  28 |     expect(response.status()).toBe(302);
  29 |     const location = response.headers()['location'] ?? '';
  30 |     expect(location).toMatch(/\/login$/);
  31 |     expect(location).not.toContain('redirectTo=');
  32 |   });
  33 | });
  34 | 
  35 | // Mobile layout smoke tests at 390×844 (iPhone 12 Pro dimensions).
  36 | test.describe('chat mobile layout', () => {
  37 |   test.use({ viewport: { width: 390, height: 844 } });
  38 | 
  39 |   test('landing page has no horizontal overflow at mobile viewport', async ({ page }) => {
  40 |     await page.goto('/');
  41 | 
  42 |     const bodyScrollWidth: number = await page.evaluate(() => document.body.scrollWidth);
  43 |     const viewportWidth = 390;
  44 | 
  45 |     expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth);
  46 |   });
  47 | 
  48 |   test('pings list page loads and has no horizontal overflow for authenticated user', async ({
  49 |     page,
  50 |   }, testInfo) => {
  51 |     await registerFreshUser(page, testInfo);
  52 | 
  53 |     await page.goto('/dashboard/pings');
  54 |     await expect(page).toHaveURL(/\/dashboard\/pings$/);
  55 | 
  56 |     // Page heading should be visible.
  57 |     await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible();
  58 | 
  59 |     // Body must not be wider than the 390 px viewport — no horizontal scroll.
  60 |     const bodyScrollWidth: number = await page.evaluate(() => document.body.scrollWidth);
  61 |     const viewportWidth = 390;
  62 |     expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth);
  63 |   });
  64 | });
  65 | 
  66 | // ---------------------------------------------------------------------------
  67 | // Helpers (mirrors dashboard-routing.spec.ts)
  68 | // ---------------------------------------------------------------------------
  69 | 
  70 | async function registerFreshUser(page: Page, testInfo: TestInfo) {
  71 |   const uniqueKey = `${Date.now()}-${testInfo.parallelIndex}-${slugifyProjectName(testInfo.project.name)}`;
  72 |   const email = `playwright-chat-${uniqueKey}@example.com`;
  73 | 
  74 |   await page.goto('/register');
  75 |   await dismissCookieBanner(page);
  76 |   await page.getByLabel('Display Name').fill(`Playwright Chat ${uniqueKey}`);
  77 |   await page.getByLabel('Email').fill(email);
  78 |   await page.getByLabel('Password').fill('Password123!');
  79 |   await page.getByRole('button', { name: 'Create Account' }).click();
  80 | 
  81 |   // Allow extra time for Neon DB cold-start during registration (first real DB write per run).
> 82 |   await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  83 | }
  84 | 
  85 | function slugifyProjectName(projectName: string): string {
  86 |   return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  87 | }
  88 | 
  89 | async function dismissCookieBanner(page: Page) {
  90 |   const acceptCookiesButton = page.getByRole('button', { name: 'Accept' });
  91 |   if (await acceptCookiesButton.isVisible()) {
  92 |     await acceptCookiesButton.click();
  93 |   }
  94 | }
  95 | 
```