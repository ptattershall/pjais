import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/e2e-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000
  },
  projects: [
    {
      name: 'electron-main',
      testMatch: /.*\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.ELECTRON_PATH || undefined
        }
      }
    }
  ],
  webServer: process.env.CI ? undefined : {
    command: 'npm run start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
  expect: {
    timeout: 5000
  },
  timeout: 60000,
  globalTimeout: 600000,
  outputDir: 'test-results/e2e-artifacts'
});