import { defineConfig } from '@playwright/test';

const externalBase = process.env.SLIDES_TEST_BASE_URL;

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: externalBase || 'http://127.0.0.1:5173',
    ignoreHTTPSErrors: process.env.SLIDES_TEST_IGNORE_TLS === '1',
    channel: process.env.BROWSER_CHANNEL || 'chrome',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: externalBase
    ? undefined
    : {
        command: 'npm run dev -- --strictPort',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
