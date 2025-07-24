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
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  // 'github' and HTML for GitHub Actions CI to generate annotations, plus a concise 'dot'
  // default to just 'html' when running locally
  reporter: process.env.CI ? [['github'], ['html']] : 'html',
  //reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.CI ? 'http://localhost:5000' : 'https://localhost:5001',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'on',
    testIdAttribute: 'data-mark', // Uses data-mark attribute same as Umbraco UI test helpers
    ignoreHTTPSErrors: true, // Ignore HTTPS errors for .NET self-signed certs in dev/test environments
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project
    // https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'], // Must run setup test/s first (Login & storing auth)
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'], // Must run setup test/s first (Login & storing auth)
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'], // Must run setup test/s first (Login & storing auth)
    },

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
    url: 'https://localhost:5001/umbraco',
    stderr: 'pipe',
    stdout: 'pipe',
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI, // Don't reuse server on CI to ensure a fresh start
    timeout: 120 * 1000, // Increase timeout to 120 seconds for the server to start - as we need to wait for SQLite DB etc to be created
  },
});
