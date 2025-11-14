// Tests for initialization, error handling, and utility code paths
//
// Copyright © 2024 Hardcore Engineering Inc.
//

import core, { createClient, Ref, TxOperations } from '@hcengineering/core'
import { LiveQuery } from '..'
import { connect } from './connection'
import { test } from './minmodel'

async function getClient (): Promise<{ liveQuery: LiveQuery, factory: TxOperations, close: () => Promise<void> }> {
  const storage = await createClient(connect)
  const liveQuery = new LiveQuery(storage)
  storage.notify = (...tx) => {
    void liveQuery.tx(...tx)
  }
  return {
    liveQuery,
    factory: new TxOperations(storage, core.account.System),
    close: async () => {
      await liveQuery.close()
    }
  }
}

describe('Initialization and Utility Code', () => {
  describe('refreshConnect with clean flag', () => {
    it('should clean queries when refreshConnect is called with clean=true', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'clean-refresh-test',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'test'
      })

      const callback = jest.fn()

      // Create query
      liveQuery.query(test.class.TestComment, {}, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Call refreshConnect with clean=true
      await liveQuery.refreshConnect(true)

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have been called with empty result during clean, then refreshed
      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      await close()
    })

    it('should handle queued queries during refreshConnect with clean', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'queue-clean-refresh',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      // Create and unsubscribe to move to queue
      const unsubscribe = liveQuery.query(test.class.TestComment, { space }, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      unsubscribe()

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Clean refresh
      await liveQuery.refreshConnect(true)

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback).toHaveBeenCalled()

      await close()
    })

    it('should remove queries with no callbacks during refreshConnect', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'remove-no-callbacks',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      // Create query
      const unsubscribe = liveQuery.query(test.class.TestComment, { space }, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Unsubscribe to remove all callbacks
      unsubscribe()

      await new Promise((resolve) => setTimeout(resolve, 50))

      // Now refresh - queries with no callbacks should be removed
      await liveQuery.refreshConnect(false)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Query should still work
      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('findOne with projection', () => {
    it('should add required fields to projection in findOne', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'projection-test',
        description: 'test description',
        private: false,
        members: [],
        archived: false
      })

      // findOne with projection - should auto-add _class, space, modifiedOn
      const result = await liveQuery.findOne(
        core.class.Space,
        { _id: space },
        {
          projection: {
            name: 1
          }
        }
      )

      expect(result).toBeDefined()
      expect(result?.name).toBe('projection-test')
      expect(result?._class).toBeDefined()
      expect(result?.space).toBeDefined()

      await close()
    })

    it('should handle findOne with empty options (auto-create options)', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'no-options-test',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      // findOne without options - should create options with limit=1
      const result = await liveQuery.findOne(core.class.Space, { _id: space })

      expect(result).toBeDefined()
      expect(result?.name).toBe('no-options-test')

      await close()
    })

    it('should handle findOne from refs cache', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'refs-cache-test',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      // First call - populates refs cache
      const result1 = await liveQuery.findOne(core.class.Space, { _id: space }, { limit: 1 })

      expect(result1).toBeDefined()

      // Second call - should come from refs cache
      const result2 = await liveQuery.findOne(core.class.Space, { _id: space }, { limit: 1 })

      expect(result2).toBeDefined()
      expect(result2?._id).toBe(space)

      await close()
    })
  })

  describe('findOne with queued queries', () => {
    it('should move query from queue back to active queries on findOne', async () => {
      const { liveQuery, factory, close } = await getClient()

      await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'queue-to-active',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      // Create query then unsubscribe to move to queue
      const unsubscribe = liveQuery.query(core.class.Space, { name: 'queue-to-active' }, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      unsubscribe()

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Now call findOne with same query - should find it in queue
      const result = await liveQuery.findOne(core.class.Space, { name: 'queue-to-active' })

      expect(result).toBeDefined()
      expect(result?.name).toBe('queue-to-active')

      await close()
    })
  })

  describe('Query result promise handling', () => {
    it('should await query result if it is a promise', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'promise-result',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      // Create a query that will have a promise result initially
      const result = await liveQuery.findOne(core.class.Space, { _id: space })

      expect(result).toBeDefined()
      expect(result?.name).toBe('promise-result')

      await close()
    })
  })

  describe('Query cleanup', () => {
    it('should clean query result when cleanQuery is called', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'clean-query',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      liveQuery.query(test.class.TestComment, { space }, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Refresh with clean will call cleanQuery
      await liveQuery.refreshConnect(true)

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have received empty result during clean, then new results
      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('Multiple simultaneous operations', () => {
    it('should handle multiple findOne calls in parallel', async () => {
      const { liveQuery, factory, close } = await getClient()

      const spaces: Array<Ref<any>> = []
      for (let i = 0; i < 5; i++) {
        const space = await factory.createDoc(core.class.Space, core.space.Model, {
          name: `parallel-${i}`,
          description: 'test',
          private: false,
          members: [],
          archived: false
        })
        spaces.push(space)
      }

      // Call findOne for all spaces in parallel
      const results = await Promise.all(spaces.map((space) => liveQuery.findOne(core.class.Space, { _id: space })))

      expect(results).toHaveLength(5)
      results.forEach((result, idx) => {
        expect(result).toBeDefined()
        expect(result?.name).toBe(`parallel-${idx}`)
      })

      await close()
    })

    it('should handle multiple query subscriptions in parallel', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'parallel-queries',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callbacks = [jest.fn(), jest.fn(), jest.fn()]

      // Create multiple subscriptions in parallel
      callbacks.forEach((callback) => {
        liveQuery.query(core.class.Space, { _id: space }, callback)
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      // All callbacks should have been called
      callbacks.forEach((callback) => {
        expect(callback).toHaveBeenCalled()
      })

      await close()
    })
  })

  describe('Edge case: Empty findAll result', () => {
    it('should handle findAll returning empty results', async () => {
      const { liveQuery, factory, close } = await getClient()

      // Just make sure liveQuery is initialized
      await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'dummy',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const result = await liveQuery.findAll(test.class.TestComment, { message: 'does-not-exist-ever' })

      expect(result).toHaveLength(0)

      await close()
    })

    it('should handle findOne returning undefined', async () => {
      const { liveQuery, factory, close } = await getClient()

      // Just make sure liveQuery is initialized
      await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'dummy',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const result = await liveQuery.findOne(test.class.TestComment, { message: 'does-not-exist-ever' })

      expect(result).toBeUndefined()

      await close()
    })
  })

  describe('Query with limit and projection', () => {
    it('should handle query with both limit and projection', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'limit-projection',
        description: 'test description',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      liveQuery.query(core.class.Space, { _id: space }, callback, {
        limit: 10,
        projection: {
          name: 1,
          description: 1
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback).toHaveBeenCalled()

      const result = callback.mock.calls[callback.mock.calls.length - 1][0][0]
      expect(result.name).toBe('limit-projection')
      expect(result._class).toBeDefined()

      await close()
    })
  })

  describe('Result clone operations', () => {
    it('should return cloned result from findOne', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'clone-test',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const result = await liveQuery.findOne(core.class.Space, { _id: space })

      expect(result).toBeDefined()

      // Modify the result - should not affect internal state
      if (result !== undefined) {
        ;(result as any).name = 'modified'
      }

      // Query again - should get original value
      const result2 = await liveQuery.findOne(core.class.Space, { _id: space })

      expect(result2?.name).toBe('clone-test')

      await close()
    })
  })
})
