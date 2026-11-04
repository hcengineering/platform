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

const config: PlaywrightTestConfig = {
  shard,
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
