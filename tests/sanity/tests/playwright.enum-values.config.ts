import { devices, type PlaywrightTestConfig } from '@playwright/test'
import config from './playwright.config'

// Focused cross-browser runs use the same server/environment configuration as
// sanity tests. Each case signs up and creates its own workspace and enum.
// External runner prerequisites: `npm run enum-values-browsers`, a running sanity
// environment with signup/workspace creation enabled, then `npm run enum-values-uitest`.
const enumValuesConfig: PlaywrightTestConfig = {
  ...config,
  projects: [
    { name: 'enum-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'enum-firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'enum-webkit', use: { ...devices['Desktop Safari'] } }
  ],
  testMatch: '**/workspace/enum-values.spec.ts',
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce'
  }
}

export default enumValuesConfig
