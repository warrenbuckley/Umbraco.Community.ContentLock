import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export const ADMIN_USER_STORAGE_STATE = path.join(__dirname, 'playwright/.auth/admin.json');

export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./tests/auth.setup.ts'),
  /* Maximum time one test can run for. */
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:44391', // Default Umbraco port for the website project
    actionTimeout: 0,
    trace: 'on-first-retry',
    storageState: ADMIN_USER_STORAGE_STATE, // Apply to all tests using this config
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // storageState is now in global use block, but can be overridden here if needed
      },
    },
    // {
    //   name: 'firefox',
    //   use: { 
    //     ...devices['Desktop Firefox'],
    //     // storageState: ADMIN_USER_STORAGE_STATE, // Or rely on global use block
    //   },
    // },
    // {
    //   name: 'webkit',
    //   use: { 
    //     ...devices['Desktop Safari'],
    //     // storageState: ADMIN_USER_STORAGE_STATE, // Or rely on global use block
    //   },
    // },
  ],
  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',
});
