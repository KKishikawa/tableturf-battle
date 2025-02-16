import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig(
  baseConfig,
  defineConfig({
    testIgnore: ['**/mobile/**'],
    projects: [
      /* Test against pc viewports. */
      {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] },
      },
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      // {
      //   name: 'webkit',
      //   use: { ...devices['Desktop Safari'] },
      // },
    ],
  }),
);
