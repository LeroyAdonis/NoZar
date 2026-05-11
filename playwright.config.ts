import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL matches the local dev server started by webServer below.
     * For production runs against Vercel, override via PW_BASE_URL env var. */
    baseURL: process.env.PW_BASE_URL ?? 'http://localhost:5173',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Local dev: Chromium + Mobile Chrome only to keep the feedback loop fast.
   * CI adds Firefox, WebKit and Mobile Safari via a separate config or override. */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    // --- CI-only browsers (uncomment in CI config) ---
    // { name: 'firefox',      use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',       use: { ...devices['Desktop Safari']  } },
    // { name: 'Mobile Safari', use: { ...devices['iPhone 12']      } },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/logo.svg',
    env: {
      ...process.env,
      PLAYWRIGHT_TEST: '1',
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:5173',
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? 'playwright-test-key',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
