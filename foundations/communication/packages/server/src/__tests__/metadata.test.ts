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

import { getMetadata } from '../metadata'
import { MessageID } from '@hcengineering/communication-types'
import { generateMessageId } from '../messageId'

describe('metadata', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('getMetadata', () => {
    it('should return default values when environment variables are not set', () => {
      delete process.env.ACCOUNTS_URL
      delete process.env.SERVER_SECRET
      delete process.env.HULYLAKE_URL
      delete process.env.MESSAGES_PER_BLOB

      const metadata = getMetadata()

      expect(metadata).toEqual({
        accountsUrl: '',
        secret: 'secret',
        hulylakeUrl: 'http://huly.local:8096',
        messagesPerBlob: 200
      })
    })

    it('should use ACCOUNTS_URL from environment', () => {
      process.env.ACCOUNTS_URL = 'http://custom-accounts-url'

      const metadata = getMetadata()

      expect(metadata.accountsUrl).toBe('http://custom-accounts-url')
    })

    it('should use SERVER_SECRET from environment', () => {
      process.env.SERVER_SECRET = 'custom-secret-key'

      const metadata = getMetadata()

      expect(metadata.secret).toBe('custom-secret-key')
    })

    it('should use HULYLAKE_URL from environment', () => {
      process.env.HULYLAKE_URL = 'http://custom-hulylake:9000'

      const metadata = getMetadata()

      expect(metadata.hulylakeUrl).toBe('http://custom-hulylake:9000')
    })

    it('should use MESSAGES_PER_BLOB from environment', () => {
      process.env.MESSAGES_PER_BLOB = '500'

      const metadata = getMetadata()

      expect(metadata.messagesPerBlob).toBe(500)
    })

    it('should use all custom environment variables', () => {
      process.env.ACCOUNTS_URL = 'http://accounts'
      process.env.SERVER_SECRET = 'my-secret'
      process.env.HULYLAKE_URL = 'http://hulylake:8080'
      process.env.MESSAGES_PER_BLOB = '1000'

      const metadata = getMetadata()

      expect(metadata).toEqual({
        accountsUrl: 'http://accounts',
        secret: 'my-secret',
        hulylakeUrl: 'http://hulylake:8080',
        messagesPerBlob: 1000
      })
    })

    it('should handle empty string for ACCOUNTS_URL', () => {
      process.env.ACCOUNTS_URL = ''

      const metadata = getMetadata()

      expect(metadata.accountsUrl).toBe('')
    })

    it('should convert MESSAGES_PER_BLOB to number', () => {
      process.env.MESSAGES_PER_BLOB = '750'

      const metadata = getMetadata()

      expect(typeof metadata.messagesPerBlob).toBe('number')
      expect(metadata.messagesPerBlob).toBe(750)
    })

    it('should handle invalid MESSAGES_PER_BLOB as NaN', () => {
      process.env.MESSAGES_PER_BLOB = 'invalid'

      const metadata = getMetadata()

      expect(metadata.messagesPerBlob).toBeNaN()
    })

    it('should return a new object on each call', () => {
      const metadata1 = getMetadata()
      const metadata2 = getMetadata()

      expect(metadata1).not.toBe(metadata2)
      expect(metadata1).toEqual(metadata2)
    })

    it('should have correct type structure', () => {
      const metadata = getMetadata()

      expect(metadata).toHaveProperty('accountsUrl')
      expect(metadata).toHaveProperty('secret')
      expect(metadata).toHaveProperty('hulylakeUrl')
      expect(metadata).toHaveProperty('messagesPerBlob')

      expect(typeof metadata.accountsUrl).toBe('string')
      expect(typeof metadata.secret).toBe('string')
      expect(typeof metadata.hulylakeUrl).toBe('string')
      expect(typeof metadata.messagesPerBlob).toBe('number')
    })

    it('should handle zero MESSAGES_PER_BLOB', () => {
      process.env.MESSAGES_PER_BLOB = '0'

      const metadata = getMetadata()

      expect(metadata.messagesPerBlob).toBe(0)
    })

    it('should handle negative MESSAGES_PER_BLOB', () => {
      process.env.MESSAGES_PER_BLOB = '-100'

      const metadata = getMetadata()

      expect(metadata.messagesPerBlob).toBe(-100)
    })

    it('should handle floating point MESSAGES_PER_BLOB', () => {
      process.env.MESSAGES_PER_BLOB = '123.45'

      const metadata = getMetadata()

      expect(metadata.messagesPerBlob).toBe(123.45)
    })

    it('should handle URLs with different protocols', () => {
      process.env.ACCOUNTS_URL = 'https://secure-accounts.com'
      process.env.HULYLAKE_URL = 'wss://hulylake.example.com'

      const metadata = getMetadata()

      expect(metadata.accountsUrl).toBe('https://secure-accounts.com')
      expect(metadata.hulylakeUrl).toBe('wss://hulylake.example.com')
    })

    it('should handle URLs with ports', () => {
      process.env.ACCOUNTS_URL = 'http://localhost:3000'
      process.env.HULYLAKE_URL = 'http://localhost:8096'

      const metadata = getMetadata()

      expect(metadata.accountsUrl).toBe('http://localhost:3000')
      expect(metadata.hulylakeUrl).toBe('http://localhost:8096')
    })
  })
})

describe('messageId', () => {
  describe('generateMessageId', () => {
    it('should generate a valid MessageID', () => {
      const id = generateMessageId()

      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('should generate numeric string IDs', () => {
      const id = generateMessageId()

      expect(/^\d+$/.test(id)).toBe(true)
    })

    it('should generate unique IDs on consecutive calls', () => {
      const id1 = generateMessageId()
      const id2 = generateMessageId()
      const id3 = generateMessageId()

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it('should generate monotonically increasing IDs', () => {
      const id1 = BigInt(generateMessageId())
      const id2 = BigInt(generateMessageId())
      const id3 = BigInt(generateMessageId())

      expect(id2).toBeGreaterThan(id1)
      expect(id3).toBeGreaterThan(id2)
    })

    it('should generate IDs in sequence even when called rapidly', () => {
      const ids: MessageID[] = []
      const count = 100

      for (let i = 0; i < count; i++) {
        ids.push(generateMessageId())
      }

      // Check all IDs are unique
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(count)

      // Check IDs are monotonically increasing
      for (let i = 1; i < ids.length; i++) {
        expect(BigInt(ids[i])).toBeGreaterThan(BigInt(ids[i - 1]))
      }
    })

    it('should handle concurrent generation correctly', () => {
      const ids = new Set<MessageID>()
      const iterations = 50

      for (let i = 0; i < iterations; i++) {
        ids.add(generateMessageId())
      }

      expect(ids.size).toBe(iterations)
    })

    it('should generate IDs that can be parsed as BigInt', () => {
      const id = generateMessageId()

      expect(() => BigInt(id)).not.toThrow()
      const bigIntId = BigInt(id)
      expect(bigIntId).toBeGreaterThan(0n)
    })

    it('should maintain increasing order across multiple batches', () => {
      const batch1 = Array.from({ length: 10 }, () => generateMessageId())
      const batch2 = Array.from({ length: 10 }, () => generateMessageId())

      const lastFromBatch1 = BigInt(batch1[batch1.length - 1])
      const firstFromBatch2 = BigInt(batch2[0])

      expect(firstFromBatch2).toBeGreaterThan(lastFromBatch1)
    })

    it('should generate IDs with reasonable length', () => {
      const id = generateMessageId()

      // Should be a reasonable length (not too short, not too long)
      expect(id.length).toBeGreaterThan(10)
      expect(id.length).toBeLessThan(30)
    })

    it('should not generate negative IDs', () => {
      for (let i = 0; i < 20; i++) {
        const id = generateMessageId()
        expect(id.startsWith('-')).toBe(false)
        expect(BigInt(id)).toBeGreaterThanOrEqual(0n)
      }
    })
  })
})
