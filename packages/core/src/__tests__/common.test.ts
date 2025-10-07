//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { groupByArray, groupByArrayAsync, flipSet } from '../common'

describe('common utilities', () => {
  describe('groupByArray', () => {
    it('should group array items by key', () => {
      const items = [
        { id: 1, category: 'A' },
        { id: 2, category: 'B' },
        { id: 3, category: 'A' },
        { id: 4, category: 'C' },
        { id: 5, category: 'B' }
      ]

      const result = groupByArray(items, (item) => item.category)

      expect(result.size).toBe(3)
      expect(result.get('A')).toEqual([
        { id: 1, category: 'A' },
        { id: 3, category: 'A' }
      ])
      expect(result.get('B')).toEqual([
        { id: 2, category: 'B' },
        { id: 5, category: 'B' }
      ])
      expect(result.get('C')).toEqual([{ id: 4, category: 'C' }])
    })

    it('should handle empty array', () => {
      const result = groupByArray([], (item) => item)
      expect(result.size).toBe(0)
    })

    it('should handle single item', () => {
      const items = [{ id: 1, type: 'test' }]
      const result = groupByArray(items, (item) => item.type)

      expect(result.size).toBe(1)
      expect(result.get('test')).toEqual([{ id: 1, type: 'test' }])
    })

    it('should handle numeric keys', () => {
      const items = [
        { value: 10, bucket: 1 },
        { value: 20, bucket: 2 },
        { value: 30, bucket: 1 },
        { value: 40, bucket: 3 }
      ]

      const result = groupByArray(items, (item) => item.bucket)

      expect(result.size).toBe(3)
      expect(result.get(1)).toHaveLength(2)
      expect(result.get(2)).toHaveLength(1)
      expect(result.get(3)).toHaveLength(1)
    })

    it('should handle all items with same key', () => {
      const items = [
        { id: 1, status: 'active' },
        { id: 2, status: 'active' },
        { id: 3, status: 'active' }
      ]

      const result = groupByArray(items, (item) => item.status)

      expect(result.size).toBe(1)
      expect(result.get('active')).toHaveLength(3)
    })

    it('should handle complex key providers', () => {
      const items = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Doe' },
        { firstName: 'John', lastName: 'Smith' }
      ]

      const result = groupByArray(items, (item) => item.lastName)

      expect(result.size).toBe(2)
      expect(result.get('Doe')).toHaveLength(2)
      expect(result.get('Smith')).toHaveLength(1)
    })

    it('should handle undefined keys', () => {
      const items = [{ id: 1, tag: 'a' }, { id: 2 }, { id: 3, tag: 'a' }]

      const result = groupByArray(items, (item: any) => item.tag)

      expect(result.size).toBe(2)
      expect(result.get('a')).toHaveLength(2)
      expect(result.get(undefined)).toHaveLength(1)
    })
  })

  describe('groupByArrayAsync', () => {
    it('should group array items by async key provider', async () => {
      const items = [
        { id: 1, value: 10 },
        { id: 2, value: 20 },
        { id: 3, value: 15 },
        { id: 4, value: 25 }
      ]

      const result = await groupByArrayAsync(items, async (item) => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 1))
        return item.value > 15 ? 'high' : 'low'
      })

      expect(result.size).toBe(2)
      expect(result.get('low')).toEqual([
        { id: 1, value: 10 },
        { id: 3, value: 15 }
      ])
      expect(result.get('high')).toEqual([
        { id: 2, value: 20 },
        { id: 4, value: 25 }
      ])
    })

    it('should handle empty array', async () => {
      const result = await groupByArrayAsync([], async (item) => item)
      expect(result.size).toBe(0)
    })

    it('should handle async errors', async () => {
      const items = [{ id: 1 }, { id: 2 }]

      await expect(
        groupByArrayAsync(items, async (item) => {
          if (item.id === 2) {
            throw new Error('Async error')
          }
          return 'key'
        })
      ).rejects.toThrow('Async error')
    })

    it('should handle single item', async () => {
      const items = [{ id: 1, type: 'test' }]
      const result = await groupByArrayAsync(items, async (item) => {
        await new Promise((resolve) => setTimeout(resolve, 1))
        return item.type
      })

      expect(result.size).toBe(1)
      expect(result.get('test')).toEqual([{ id: 1, type: 'test' }])
    })

    it('should process items sequentially', async () => {
      const order: number[] = []
      const items = [1, 2, 3, 4]

      await groupByArrayAsync(items, async (item) => {
        order.push(item)
        await new Promise((resolve) => setTimeout(resolve, 5 - item)) // Reverse delays
        return item % 2 === 0 ? 'even' : 'odd'
      })

      // Should maintain order despite different delays
      expect(order).toEqual([1, 2, 3, 4])
    })

    it('should handle Promise rejections gracefully', async () => {
      const items = [1, 2, 3]

      await expect(
        groupByArrayAsync(items, async (item) => {
          if (item === 2) {
            return await Promise.reject(new Error('Failed on 2'))
          }
          return 'key'
        })
      ).rejects.toThrow('Failed on 2')
    })

    it('should handle numeric keys', async () => {
      const items = [{ value: 10 }, { value: 20 }, { value: 30 }]

      const result = await groupByArrayAsync(items, async (item) => {
        await new Promise((resolve) => setTimeout(resolve, 1))
        return Math.floor(item.value / 10)
      })

      expect(result.size).toBe(3)
      expect(result.get(1)).toHaveLength(1)
      expect(result.get(2)).toHaveLength(1)
      expect(result.get(3)).toHaveLength(1)
    })
  })

  describe('flipSet', () => {
    it('should add item if not present', () => {
      const set = new Set([1, 2, 3])
      const result = flipSet(set, 4)

      expect(result).toBe(set) // Should return same set
      expect(result.has(4)).toBe(true)
      expect(result.size).toBe(4)
    })

    it('should remove item if present', () => {
      const set = new Set([1, 2, 3])
      const result = flipSet(set, 2)

      expect(result).toBe(set) // Should return same set
      expect(result.has(2)).toBe(false)
      expect(result.size).toBe(2)
    })

    it('should handle empty set', () => {
      const set = new Set<number>()
      const result = flipSet(set, 1)

      expect(result.has(1)).toBe(true)
      expect(result.size).toBe(1)
    })

    it('should handle string items', () => {
      const set = new Set(['a', 'b', 'c'])

      flipSet(set, 'd')
      expect(set.has('d')).toBe(true)

      flipSet(set, 'b')
      expect(set.has('b')).toBe(false)
    })

    it('should handle object items', () => {
      const obj1 = { id: 1 }
      const obj2 = { id: 2 }
      const set = new Set([obj1])

      flipSet(set, obj2)
      expect(set.has(obj2)).toBe(true)
      expect(set.size).toBe(2)

      flipSet(set, obj1)
      expect(set.has(obj1)).toBe(false)
      expect(set.size).toBe(1)
    })

    it('should work with multiple flips', () => {
      const set = new Set([1, 2])

      flipSet(set, 3) // Add 3
      expect(set.size).toBe(3)

      flipSet(set, 3) // Remove 3
      expect(set.size).toBe(2)

      flipSet(set, 3) // Add 3 again
      expect(set.size).toBe(3)
      expect(set.has(3)).toBe(true)
    })

    it('should handle single element set', () => {
      const set = new Set([42])

      flipSet(set, 42)
      expect(set.size).toBe(0)

      flipSet(set, 42)
      expect(set.size).toBe(1)
    })
  })
})
