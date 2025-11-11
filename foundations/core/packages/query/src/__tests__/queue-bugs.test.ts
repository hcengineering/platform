//
// Copyright © 2024 Hardcore Engineering Inc.
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

import core, { createClient, SortingOrder, Space, Tx, TxOperations } from '@hcengineering/core'
import { LiveQuery } from '..'
import { connect } from './connection'

async function getClient (): Promise<{ liveQuery: LiveQuery, factory: TxOperations }> {
  const storage = await createClient(connect)
  const liveQuery = new LiveQuery(storage)
  storage.notify = (...tx: Tx[]) => {
    liveQuery.tx(...tx).catch((err) => {
      console.log(err)
    })
  }
  return { liveQuery, factory: new TxOperations(storage, core.account.System) }
}

describe('LiveQuery - Queue Management Bugs', () => {
  describe('Queue and Queries Map Consistency', () => {
    it('should properly synchronize queue and queries map when removing queries', async () => {
      const { liveQuery } = await getClient()

      const unsubscribe1 = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        // Callback 1
      })

      const unsubscribe2 = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        // Callback 2 - same query
      })

      // Both callbacks should share the same query
      // Let's verify internal state
      const queriesMap = (liveQuery as any).queries.get(core.class.Space)
      expect(queriesMap?.size).toBe(1)

      // Unsubscribe first callback
      unsubscribe1()

      // Query should still exist because second callback is still active
      expect(queriesMap?.size).toBe(1)

      // Unsubscribe second callback
      unsubscribe2()

      // Now the query should be moved to the queue (cached for reuse)
      const queue = (liveQuery as any).queue
      expect(queue.size).toBeGreaterThan(0)
    })

    it('should handle rapid subscribe and unsubscribe correctly', async () => {
      const { liveQuery } = await getClient()

      const callbacks: Array<() => void> = []

      // Rapidly subscribe 10 times to the same query
      for (let i = 0; i < 10; i++) {
        const unsubscribe = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
          // Callback
        })
        callbacks.push(unsubscribe)
      }

      const queriesMap = (liveQuery as any).queries.get(core.class.Space)
      // Should only have 1 query since they're all the same
      expect(queriesMap?.size).toBe(1)

      // Unsubscribe all
      callbacks.forEach((unsub) => {
        unsub()
      })

      // Query should be in the queue
      const queue = (liveQuery as any).queue
      expect(queue.size).toBeGreaterThan(0)
    })

    it('should not leak memory when queries are unsubscribed', async () => {
      const { liveQuery } = await getClient()

      const unsubscribeCallbacks: Array<() => void> = []

      // Create many different queries
      for (let i = 0; i < 50; i++) {
        const unsubscribe = liveQuery.query<Space>(core.class.Space, { name: `query-${i}` }, (result) => {
          // Callback
        })
        unsubscribeCallbacks.push(unsubscribe)
      }

      // All queries should be in the queries map
      const queriesMap = (liveQuery as any).queries.get(core.class.Space)
      expect(queriesMap?.size).toBe(50)

      // Unsubscribe all
      unsubscribeCallbacks.forEach((unsub) => {
        unsub()
      })

      // All queries should now be in the queue
      const queue = (liveQuery as any).queue
      expect(queue.size).toBe(50)

      // Wait a bit for any async operations
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Still should have 50 queries in queue
      expect(queue.size).toBe(50)
    })

    it('should properly handle queue cleanup when exceeding CACHE_SIZE', async () => {
      const { liveQuery } = await getClient()

      const CACHE_SIZE = 125 // From the code
      const unsubscribeCallbacks: Array<() => void> = []

      // Create more queries than CACHE_SIZE
      for (let i = 0; i < CACHE_SIZE + 20; i++) {
        const unsubscribe = liveQuery.query<Space>(core.class.Space, { name: `query-${i}` }, (result) => {
          // Callback
        })
        unsubscribeCallbacks.push(unsubscribe)
      }

      const queriesMapBefore = (liveQuery as any).queries.get(core.class.Space)
      expect(queriesMapBefore?.size).toBe(CACHE_SIZE + 20)

      // Unsubscribe all to move them to queue
      unsubscribeCallbacks.forEach((unsub) => {
        unsub()
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const queue = (liveQuery as any).queue
      // Queue should not exceed CACHE_SIZE due to cleanup
      expect(queue.size).toBeLessThanOrEqual(CACHE_SIZE)

      const queriesMapAfter = (liveQuery as any).queries.get(core.class.Space)
      // Some queries should have been removed from the queries map too
      expect(queriesMapAfter?.size).toBeLessThan(CACHE_SIZE + 20)
    })
  })

  describe('Query Callback Management', () => {
    it('should handle multiple callbacks on the same query correctly', async () => {
      const { liveQuery, factory } = await getClient()

      const results1: any[] = []
      const results2: any[] = []

      const unsubscribe1 = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        results1.push(result.length)
      })

      const unsubscribe2 = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        results2.push(result.length)
      })

      // Wait for initial callbacks
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Both should have received the same initial data
      expect(results1.length).toBeGreaterThan(0)
      expect(results2.length).toBeGreaterThan(0)
      expect(results1[0]).toBe(results2[0])

      // Create a new document
      await factory.createDoc(core.class.Space, core.space.Model, {
        private: false,
        name: 'Test Space',
        description: '',
        members: [],
        archived: false
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Both callbacks should have been called again
      expect(results1.length).toBeGreaterThan(1)
      expect(results2.length).toBeGreaterThan(1)

      unsubscribe1()
      unsubscribe2()
    })

    it('should stop sending updates after unsubscribe', async () => {
      const { liveQuery, factory } = await getClient()

      const results: any[] = []

      const unsubscribe = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        results.push(result.length)
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const countBeforeUnsubscribe = results.length

      unsubscribe()

      // Create new documents after unsubscribe
      for (let i = 0; i < 5; i++) {
        await factory.createDoc(core.class.Space, core.space.Model, {
          private: false,
          name: `Space ${i}`,
          description: '',
          members: [],
          archived: false
        })
      }

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should not have received new callbacks
      expect(results.length).toBe(countBeforeUnsubscribe)
    })
  })

  describe('Query Reuse from Queue', () => {
    it('should reuse cached query from queue when re-subscribing', async () => {
      const { liveQuery } = await getClient()

      const unsubscribe1 = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        // First callback
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      const queriesMap = (liveQuery as any).queries.get(core.class.Space)
      const firstQuery: any = Array.from(queriesMap.values())[0]
      const initialQueryId = firstQuery?.id

      unsubscribe1()

      // Query should be in queue now
      const queue = (liveQuery as any).queue
      expect(queue.size).toBeGreaterThan(0)

      // Subscribe again to the same query
      const unsubscribe2 = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        // Second callback
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      const queriesMapAfter = (liveQuery as any).queries.get(core.class.Space)
      const secondQuery: any = Array.from(queriesMapAfter.values())[0]
      const reusedQueryId = secondQuery?.id

      // Should reuse the same query
      expect(reusedQueryId).toBe(initialQueryId)

      unsubscribe2()
    })

    it('should handle query options comparison correctly', async () => {
      const { liveQuery } = await getClient()

      const unsubscribe1 = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {}, {
        limit: 10,
        sort: { name: SortingOrder.Ascending }
      })

      const unsubscribe2 = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {}, {
        limit: 10,
        sort: { name: SortingOrder.Ascending }
      })

      const queriesMap = (liveQuery as any).queries.get(core.class.Space)
      // Should share the same query because options match
      expect(queriesMap?.size).toBe(1)

      unsubscribe1()
      unsubscribe2()

      // Different options should create different query
      const unsubscribe3 = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {}, {
        limit: 20,
        sort: { name: SortingOrder.Descending }
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      // Now should have 2 queries (1 in queue, 1 active)
      const totalQueries = queriesMap?.size ?? 0 + ((liveQuery as any).queue.size ?? 0)
      expect(totalQueries).toBeGreaterThan(1)

      unsubscribe3()
    })
  })

  describe('Edge Cases and Error Conditions', () => {
    it('should handle empty query results', async () => {
      const { liveQuery } = await getClient()

      const results: any[] = []

      const unsubscribe = liveQuery.query<Space>(core.class.Space, { name: 'NonExistentSpace123456' }, (result) => {
        results.push(result)
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toHaveLength(0)

      unsubscribe()
    })

    it('should handle query on closed LiveQuery', async () => {
      const { liveQuery } = await getClient()

      await liveQuery.close()

      // Attempting to query after close should not crash
      expect(() => {
        liveQuery.query<Space>(core.class.Space, {}, (result) => {})
      }).not.toThrow()
    })

    it('should handle concurrent findAll and query operations', async () => {
      const { liveQuery } = await getClient()

      const promises = []

      // Start multiple findAll operations
      for (let i = 0; i < 10; i++) {
        promises.push(liveQuery.findAll(core.class.Space, { private: false }))
      }

      // Start multiple query operations
      for (let i = 0; i < 10; i++) {
        liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {})
      }

      const results = await Promise.all(promises)

      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true)
      })
    })
  })

  describe('Query Counter and ID Management', () => {
    it('should generate unique query IDs', async () => {
      const { liveQuery } = await getClient()

      const queryIds = new Set<number>()
      const unsubscribes: Array<() => void> = []

      // Create many queries
      for (let i = 0; i < 100; i++) {
        const unsubscribe = liveQuery.query<Space>(core.class.Space, { name: `unique-query-${i}` }, (result) => {})
        unsubscribes.push(unsubscribe)
      }

      const queriesMap = (liveQuery as any).queries.get(core.class.Space)
      if (queriesMap !== undefined) {
        for (const query of queriesMap.values()) {
          queryIds.add(query.id)
        }
      }

      // All IDs should be unique
      expect(queryIds.size).toBe(100)

      unsubscribes.forEach((unsub) => {
        unsub()
      })
    })
  })

  describe('Query Result Consistency', () => {
    it('should maintain result consistency across multiple callbacks', async () => {
      const { liveQuery, factory } = await getClient()

      const callback1Results: number[] = []
      const callback2Results: number[] = []

      const unsubscribe1 = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        callback1Results.push(result.length)
      })

      // Wait for first callback to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      const unsubscribe2 = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        callback2Results.push(result.length)
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Create a document
      await factory.createDoc(core.class.Space, core.space.Model, {
        private: false,
        name: 'Consistency Test',
        description: '',
        members: [],
        archived: false
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Both callbacks should have received updates after document creation
      // Note: Due to setTimeout(0) in pushCallback, timing may vary slightly
      // but both should see at least 2 updates (initial + after create)
      expect(callback1Results.length).toBeGreaterThanOrEqual(2)
      expect(callback2Results.length).toBeGreaterThanOrEqual(2)

      // Final counts should match after everything settles
      const final1 = callback1Results[callback1Results.length - 1]
      const final2 = callback2Results[callback2Results.length - 1]
      expect(final1).toBe(final2)

      unsubscribe1()
      unsubscribe2()
    })
  })
})
