import { PlaywrightTestConfig } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig()

const config: PlaywrightTestConfig = {
  use: {
    screenshot: 'only-on-failure'
  }
}
export default config
