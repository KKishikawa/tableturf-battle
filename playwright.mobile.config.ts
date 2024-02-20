import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig(
  baseConfig,
  defineConfig({
    testDir: 'tests/e2e/mobile',
    projects: [
      /* Test against mobile viewports. */
      {
        name: 'Mobile Chrome',
        use: { ...devices['Pixel 5'] },
      },
      {
        name: 'Mobile Safari',
        use: { ...devices['iPhone 12'] },
      },
    ],
  }),
);
