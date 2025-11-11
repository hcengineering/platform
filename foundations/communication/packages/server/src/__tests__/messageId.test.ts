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

import { generateMessageId } from '../messageId'

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
      const ids = []
      const count = 100

      for (let i = 0; i < count; i++) {
        ids.push(generateMessageId())
      }

      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(count)

      for (let i = 1; i < ids.length; i++) {
        expect(BigInt(ids[i])).toBeGreaterThan(BigInt(ids[i - 1]))
      }
    })

    it('should generate IDs that can be parsed as BigInt', () => {
      const id = generateMessageId()

      expect(() => BigInt(id)).not.toThrow()
      const bigIntId = BigInt(id)
      expect(bigIntId).toBeGreaterThan(0n)
    })

    it('should maintain order across multiple calls', () => {
      const batch1 = Array.from({ length: 10 }, () => generateMessageId())
      const batch2 = Array.from({ length: 10 }, () => generateMessageId())

      const lastFromBatch1 = BigInt(batch1[batch1.length - 1])
      const firstFromBatch2 = BigInt(batch2[0])

      expect(firstFromBatch2).toBeGreaterThan(lastFromBatch1)
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
