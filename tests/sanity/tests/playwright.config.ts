import { PlaywrightTestConfig } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig()

const config: PlaywrightTestConfig = {
  use: {
    screenshot: 'only-on-failure',
    trace: {
      mode: 'retain-on-failure',
      snapshots: true,
      screenshots: true,
      sources: true
    }
  }
}
export default config
