import { PlaywrightTestConfig } from '@playwright/test'
const config: PlaywrightTestConfig = {
  use: {
    screenshot: 'only-on-failure'
  }
}
export default config
