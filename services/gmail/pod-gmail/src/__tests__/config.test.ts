//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { IntegrationVersion } from '../types'

/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-var-requires */
describe('Config Validation', () => {
  // Store original environment variables to restore after tests
  const originalEnv = { ...process.env }

  // Required environment variables for config
  const requiredEnv = {
    ACCOUNTS_URL: 'http://accounts.test',
    SECRET: 'test-secret',
    Credentials: '{"web":{"client_id":"test","client_secret":"test"}}',
    WATCH_TOPIC_NAME: 'gmail-watch',
    KVS_URL: 'http://kvs.test'
  }

  beforeEach(() => {
    // Clear and reset environment for each test
    jest.resetModules()
    process.env = { ...originalEnv }

    // Set required environment variables
    Object.entries(requiredEnv).forEach(([key, value]) => {
      process.env[key] = value
    })
  })

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv
  })

  it('should not require QUEUE_CONFIG when VERSION is v1', () => {
    // Set version to v1
    process.env.VERSION = IntegrationVersion.V1
    process.env.QUEUE_CONFIG = ''

    // This should not throw
    let config
    expect(() => {
      config = require('../config').default
    }).not.toThrow()

    expect(config).toBeDefined()
    expect((config as any).Version).toBe(IntegrationVersion.V1)
    expect((config as any).QueueConfig).toBe('')
  })

  it('should allow empty QUEUE_CONFIG when VERSION is v1', () => {
    // Set version to v1
    process.env.VERSION = IntegrationVersion.V1
    delete process.env.QUEUE_CONFIG

    // This should not throw
    let config
    expect(() => {
      config = require('../config').default
    }).not.toThrow()

    expect(config).toBeDefined()
    expect((config as any).Version).toBe(IntegrationVersion.V1)
    expect((config as any).QueueConfig).toBe('')
  })

  it('should require QUEUE_CONFIG when VERSION is v2', () => {
    // Set version to v2 but don't set QUEUE_CONFIG
    process.env.VERSION = IntegrationVersion.V2
    process.env.QUEUE_CONFIG = ''

    // This should throw
    expect(() => {
      require('../config').default
    }).toThrow('Missing env variable: QUEUE_CONFIG')
  })

  it('should allow valid QUEUE_CONFIG when VERSION is v2', () => {
    // Set version to v2 with valid QUEUE_CONFIG
    process.env.VERSION = IntegrationVersion.V2
    process.env.QUEUE_CONFIG = '{"brokers":["localhost:9092"]}'

    // This should not throw
    let config
    expect(() => {
      config = require('../config').default
    }).not.toThrow()

    expect(config).toBeDefined()
    expect((config as any).Version).toBe(IntegrationVersion.V2)
    expect((config as any).QueueConfig).toBe('{"brokers":["localhost:9092"]}')
  })

  it('should throw error for invalid VERSION', () => {
    // Set an invalid version
    process.env.VERSION = 'v3'

    // This should throw
    expect(() => {
      require('../config').default
    }).toThrow("Invalid version: v3. Must be 'v1' or 'v2'.")
  })
})
