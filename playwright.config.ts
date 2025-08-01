import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel - but Electron tests need to be sequential */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Use single worker for Electron tests to avoid conflicts */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Set timeout for actions */
    actionTimeout: 10000,
  },
  
  /* Configure timeouts */
  timeout: 60000, // Overall test timeout
  expect: {
    timeout: 10000, // Timeout for expect assertions
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'electron-app',
      use: { 
        ...devices['Desktop Chrome'],
        // Increase timeouts for Electron app initialization
        actionTimeout: 15000,
        navigationTimeout: 15000,
      },
    },
  ],

  /* Global setup/teardown - temporarily disabled */
  // globalSetup: require.resolve('./e2e/global-setup.ts'),
  // globalTeardown: require.resolve('./e2e/global-teardown.ts'),

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
}); 