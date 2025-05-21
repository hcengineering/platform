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

describe('Config', () => {
  // Store original environment
  const originalEnv = { ...process.env }

  // Mock required environment variables to prevent test failures
  beforeEach(() => {
    jest.resetModules() // Clear cache for config module between tests

    // Set minimum required env variables
    process.env.ACCOUNTS_URL = 'http://accounts.test'
    process.env.SECRET = 'test-secret'
    process.env.Credentials = 'test-credentials'
    process.env.WATCH_TOPIC_NAME = 'test-topic'
    process.env.KVS_URL = 'http://kvs.test'
    process.env.STORAGE_CONFIG = 'test-storage-config'
  })

  // Restore original environment after tests
  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('should load default configuration values', () => {
    // Import config inside test to ensure env variables are set
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require('../config').default

    // Check default values
    expect(config.Port).toBe(8087)
    expect(config.ServiceID).toBe('gmail-service')
    expect(config.InitLimit).toBe(50)
    expect(config.FooterMessage).toContain('Sent via <a href="https://huly.io">Huly</a>')
    expect(config.Version).toBe(IntegrationVersion.V1)
    expect(config.QueueRegion).toBe('')
    expect(config.CommunicationTopic).toBe('hulygun')
  })

  it('should override defaults with environment variables', () => {
    // Set custom values
    process.env.PORT = '9000'
    process.env.SERVICE_ID = 'custom-service'
    process.env.INIT_LIMIT = '100'
    process.env.FOOTER_MESSAGE = 'Custom footer'
    process.env.VERSION = 'v2'
    process.env.QUEUE_CONFIG = 'custom-queue-config'
    process.env.QUEUE_REGION = 'custom-region'
    process.env.COMMUNICATION_TOPIC = 'custom-topic'

    // Load config with custom values
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require('../config').default

    // Check overridden values
    expect(config.Port).toBe(9000)
    expect(config.ServiceID).toBe('custom-service')
    expect(config.InitLimit).toBe(100)
    expect(config.FooterMessage).toBe('Custom footer')
    expect(config.Version).toBe(IntegrationVersion.V2)
    expect(config.QueueConfig).toBe('custom-queue-config')
    expect(config.QueueRegion).toBe('custom-region')
    expect(config.CommunicationTopic).toBe('custom-topic')
  })

  it('should throw error when required env variables are missing', () => {
    // Remove required environment variables
    process.env.ACCOUNTS_URL = undefined

    // Expect error when loading config
    expect(() => {
      require('../config')
    }).toThrow('Missing env variables: ACCOUNTS_URL')
  })

  it('should throw error for invalid version value', () => {
    // Set invalid version
    process.env.VERSION = 'invalid-version'

    // Expect error when loading config
    expect(() => {
      require('../config')
    }).toThrow("Invalid version: invalid-version. Must be 'v1' or 'v2'.")
  })

  it('should throw error when v2 is set but queue config is missing', () => {
    // Set v2 without required queue config
    process.env.VERSION = 'v2'
    process.env.QUEUE_CONFIG = ''

    // Expect error when loading config
    expect(() => {
      require('../config')
    }).toThrow('Missing env variable: QUEUE_CONFIG')
  })

  it('should throw error when v2 is set but communication topic is missing', () => {
    // Set v2 with queue config but missing communication topic
    process.env.VERSION = 'v2'
    process.env.QUEUE_CONFIG = 'test-queue'
    process.env.COMMUNICATION_TOPIC = ''

    // Expect error when loading config
    expect(() => {
      require('../config')
    }).toThrow('Missing env variable: COMMUNICATION_TOPIC')
  })

  it('should correctly parse numeric values', () => {
    // Set string values for numeric fields
    process.env.PORT = '9999'
    process.env.INIT_LIMIT = '200'

    // Load config
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require('../config').default

    // Check parsed values
    expect(config.Port).toBe(9999)
    expect(config.InitLimit).toBe(200)
    expect(typeof config.Port).toBe('number')
    expect(typeof config.InitLimit).toBe('number')
  })

  it('should handle v2 configuration correctly', () => {
    // Set up v2 configuration
    process.env.VERSION = 'v2'
    process.env.QUEUE_CONFIG = 'test-queue-config'
    process.env.QUEUE_REGION = 'test-region'
    process.env.COMMUNICATION_TOPIC = 'test-topic-name'

    // Load config
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require('../config').default

    // Check v2 specific configuration
    expect(config.Version).toBe(IntegrationVersion.V2)
    expect(config.QueueConfig).toBe('test-queue-config')
    expect(config.QueueRegion).toBe('test-region')
    expect(config.CommunicationTopic).toBe('test-topic-name')
  })
})
