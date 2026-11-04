//
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { devices, PlaywrightTestConfig } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig()

let maxFailures: number | undefined
if (process.env.TESTS_MAX_FAILURES !== undefined) {
  maxFailures = parseInt(process.env.TESTS_MAX_FAILURES)
}

// Sharding for CI: PLAYWRIGHT_SHARD_CURRENT=1 PLAYWRIGHT_SHARD_TOTAL=2
const shardCurrent = parseInt(process.env.PLAYWRIGHT_SHARD_CURRENT ?? '')
const shardTotal = parseInt(process.env.PLAYWRIGHT_SHARD_TOTAL ?? '')
const shard = shardTotal > 1 && shardCurrent >= 1 ? { current: shardCurrent, total: shardTotal } : null

// Preserve secure-context APIs, including clipboard, on the local HTTP test origins.
const localOrigins = [process.env.PLATFORM_URI, process.env.PLATFORM_OTP_URI]
  .filter((url): url is string => url !== undefined && url.startsWith('http://tracex.local:'))
  .map((url) => new URL(url).origin)

const config: PlaywrightTestConfig = {
  shard,
  use: {
    // Use full Chromium so the secure-origin flag applies in headless mode.
    channel: 'chromium',
    launchOptions: {
      args: localOrigins.length > 0 ? [`--unsafely-treat-insecure-origin-as-secure=${localOrigins.join(',')}`] : []
    }
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'Platform',
      use: {
        testIdAttribute: 'data-id',
        permissions: ['clipboard-read', 'clipboard-write'],
        ...devices['Desktop Chrome'],
        screenshot: 'only-on-failure',
        viewport: {
          width: 1440,
          height: 900
        },
        trace: {
          mode: 'retain-on-failure',
          snapshots: true,
          screenshots: true,
          sources: true
        },
        contextOptions: {
          reducedMotion: 'reduce'
        }
      },
      fullyParallel: false,
      dependencies: ['setup']
    }
  ],
  retries: 2,
  timeout: 60000,
  maxFailures,
  expect: {
    timeout: 15000
  },
  globalTimeout: 1_800_000,
  reporter: [
    ['list'],
    // In sharded runs each shard writes a blob report; they are merged into one HTML report in CI
    shard !== null ? ['blob', { fileName: `report-${shard.current}.zip` }] : ['html'],
    [
      'allure-playwright',
      {
        detail: true,
        suiteTitle: false
      }
    ]
  ]
}
export default config
