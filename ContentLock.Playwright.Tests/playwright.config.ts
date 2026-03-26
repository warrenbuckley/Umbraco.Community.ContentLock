import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Force serial execution everywhere — tests share the same Umbraco site and lock the same
     content nodes, so parallel workers cause lock conflicts (Lock API returns 400 when a node
     is already locked by a concurrent test, timing out the waitForResponse(status===200) call). */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  // 'github' and HTML for GitHub Actions CI to generate annotations, plus a concise 'dot'
  // default to just 'html' when running locally
  reporter: process.env.CI ? [['github'], ['html']] : 'html',
  //reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // Always use HTTPS — OpenIddict (Umbraco 17 auth) enforces HTTPS strictly
    // and returns ID2083 if any part of the auth flow goes over HTTP.
    // The webServer health check below uses http://localhost:5000 separately
    // (Node's built-in TCP checker can't handle self-signed certs), but the
    // actual browser tests must use HTTPS throughout.
    baseURL: 'https://localhost:5001',

    /* Collect trace for all failing tests (not just on retry) so CI artifacts always have trace data. */
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
    testIdAttribute: 'data-mark', // Uses data-mark attribute same as Umbraco UI test helpers
    ignoreHTTPSErrors: true, // Ignore HTTPS errors for .NET self-signed certs in dev/test environments
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup projects — must run before browser tests
    // https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'setup-restricted', testMatch: /auth\.restricted-user\.setup\.ts/, dependencies: ['setup'] },

    // On CI run only Chromium to keep the pipeline fast.
    // All three browsers run locally for cross-browser coverage.
    ...(process.env.CI
      ? [
          {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup', 'setup-restricted'],
          },
        ]
      : [
          {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup', 'setup-restricted'],
          },
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
            dependencies: ['setup', 'setup-restricted'],
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
            dependencies: ['setup', 'setup-restricted'],
          },
        ]),

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    cwd: path.join(__dirname, '../ContentLock.Website'),
    command: 'dotnet run --urls "https://localhost:5001;http://localhost:5000"',
    // Use HTTP for the health-check URL so Node's built-in checker doesn't trip over the
    // self-signed cert (ignoreHTTPSErrors only applies at page level, not webServer polling).
    url: 'http://localhost:5000/umbraco',
    stderr: 'pipe',
    stdout: 'pipe',
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI, // Don't reuse server on CI to ensure a fresh start
    timeout: 300 * 1000, // 300 s — unattended install creates the SQLite DB + runs migrations on first CI boot
    // Explicitly set ASPNETCORE_ENVIRONMENT=Development so Umbraco loads appsettings.Development.json
    // (SQLite connection string + InstallUnattended:true) even when the outer process doesn't pass it.
    env: {
      ASPNETCORE_ENVIRONMENT: 'Development',
    },
  },
});
