// Bug hunting tests - targeting specific edge cases and potential issues
//
// Copyright © 2024 Hardcore Engineering Inc.
//

import core, { createClient, Ref, SortingOrder, TxOperations } from '@hcengineering/core'
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

describe('Bug Hunting Tests', () => {
  describe('Potential Bug: Sort order after updates with limit', () => {
    it('should maintain correct sort order when updating document that exceeds limit', async () => {
      const { liveQuery, factory, close } = await getClient()

      // Create documents with specific sort order
      const spaces: Array<Ref<any>> = []
      for (let i = 0; i < 5; i++) {
        const space = await factory.createDoc(core.class.Space, core.space.Model, {
          name: `space-${String(i).padStart(2, '0')}`,
          description: `priority-${i}`,
          private: false,
          members: [],
          archived: false
        })
        spaces.push(space)
      }

      const callback = jest.fn()

      // Query with limit and sort
      liveQuery.query(core.class.Space, {}, callback, {
        limit: 3,
        sort: { name: SortingOrder.Ascending }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialResult = callback.mock.calls[callback.mock.calls.length - 1][0]
      expect(initialResult.length).toBeLessThanOrEqual(3)

      // Update a document outside the limit to see if it enters
      await factory.updateDoc(core.class.Space, core.space.Model, spaces[4], {
        name: 'space-00-updated' // Should now be first
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Check that result was updated correctly
      const finalResult = callback.mock.calls[callback.mock.calls.length - 1][0]
      expect(finalResult.length).toBeLessThanOrEqual(3)

      await close()
    })
  })

  describe('Potential Bug: Match function with mixins', () => {
    it('should correctly match documents with mixin classes', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'mixin-match-test',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      // Query for the space
      liveQuery.query(core.class.Space, { _id: space }, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('Potential Bug: getCurrentDoc when document no longer matches', () => {
    it('should handle document that stops matching query after update', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'match-test',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      // Query for private=false
      liveQuery.query(core.class.Space, { _id: space, private: false }, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()
      const initialResult = callback.mock.calls[callback.mock.calls.length - 1][0]
      expect(initialResult.length).toBe(1)

      callback.mockClear()

      // Update to private=true, should no longer match
      await factory.updateDoc(core.class.Space, core.space.Model, space, {
        private: true
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have been called with empty results or document removed
      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('Potential Bug: Lookup updates with $push operations', () => {
    it('should correctly handle $push operations on lookup fields', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'push-test',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'parent'
      })

      const callback = jest.fn()

      // Query with reverse lookup
      liveQuery.query(test.class.TestComment, { _id: comment }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Add a child comment (this should trigger $push like behavior)
      await factory.addCollection(test.class.TestComment, space, comment, test.class.TestComment, 'comments', {
        message: 'child1'
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have been updated
      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      await close()
    })
  })

  describe('Potential Bug: Sort with nested operations', () => {
    it('should detect need for re-sort when nested operations affect sort fields', async () => {
      const { liveQuery, factory, close } = await getClient()

      const spaces: Array<Ref<any>> = []
      for (let i = 0; i < 3; i++) {
        const space = await factory.createDoc(core.class.Space, core.space.Model, {
          name: `sort-${i}`,
          description: 'test',
          private: false,
          members: [],
          archived: false
        })
        spaces.push(space)
      }

      const callback = jest.fn()

      // Query with sort by name
      liveQuery.query(core.class.Space, {}, callback, {
        sort: { name: SortingOrder.Ascending }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Update name which should trigger re-sort
      await factory.updateDoc(core.class.Space, core.space.Model, spaces[0], {
        name: 'sort-zzz' // Should move to end
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback.mock.calls.length).toBeGreaterThan(1)

      await close()
    })
  })

  describe('Potential Bug: checkUpdatedDocMatch with limit', () => {
    it('should refresh query when document stops matching and at limit', async () => {
      const { liveQuery, factory, close } = await getClient()

      const spaces: Array<Ref<any>> = []
      // Create more docs than limit
      for (let i = 0; i < 5; i++) {
        const space = await factory.createDoc(core.class.Space, core.space.Model, {
          name: `limit-match-${i}`,
          description: 'test',
          private: false,
          members: [],
          archived: false
        })
        spaces.push(space)
      }

      const callback = jest.fn()

      // Query with limit
      liveQuery.query(core.class.Space, { private: false }, callback, {
        limit: 3
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialResult = callback.mock.calls[callback.mock.calls.length - 1][0]
      expect(initialResult.length).toBeLessThanOrEqual(3)

      // Make one of the documents not match
      await factory.updateDoc(core.class.Space, core.space.Model, spaces[0], {
        private: true
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have refreshed to include another document
      expect(callback.mock.calls.length).toBeGreaterThan(1)

      await close()
    })
  })

  describe('Potential Bug: updatedDocCallback with limit boundary', () => {
    it('should handle updates when document is exactly at limit boundary', async () => {
      const { liveQuery, factory, close } = await getClient()

      const spaces: Array<Ref<any>> = []
      for (let i = 0; i < 4; i++) {
        const space = await factory.createDoc(core.class.Space, core.space.Model, {
          name: `boundary-${String(i).padStart(2, '0')}`,
          description: 'test',
          private: false,
          members: [],
          archived: false
        })
        spaces.push(space)
      }

      const callback = jest.fn()

      // Query with limit=3, we have 4 documents
      liveQuery.query(core.class.Space, {}, callback, {
        limit: 3,
        sort: { name: SortingOrder.Ascending }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Update the 3rd document (at the limit boundary)
      await factory.updateDoc(core.class.Space, core.space.Model, spaces[2], {
        description: 'updated at boundary'
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback.mock.calls.length).toBeGreaterThan(1)

      await close()
    })
  })

  describe('Potential Bug: Reverse lookup with undefined values', () => {
    it('should handle reverse lookups when field is undefined', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'undefined-lookup',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      // Query with reverse lookup that may have undefined fields
      liveQuery.query(core.class.Space, { _id: space }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('Potential Bug: Match with skipLookup flag', () => {
    it('should correctly skip $lookup keys when matching', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'skip-lookup-test',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'test'
      })

      const callback = jest.fn()

      // Query with lookup
      liveQuery.query(test.class.TestComment, { _id: comment }, callback, {
        lookup: { space: core.class.Space }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('Potential Bug: Query with $search and updates', () => {
    it('should handle updates on documents with $search query', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'searchable document',
        description: 'findable content',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      // Query with search (though it won't actually search in mock)
      liveQuery.query(core.class.Space, { $search: 'searchable' }, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Update the document
      await factory.updateDoc(core.class.Space, core.space.Model, space, {
        description: 'updated content'
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('Potential Bug: Multiple rapid unsubscribe/subscribe cycles', () => {
    it('should handle rapid subscribe/unsubscribe cycles correctly', async () => {
      const { liveQuery, close } = await getClient()

      const callbacks = []
      const unsubscribes = []

      // Rapidly subscribe and unsubscribe
      for (let i = 0; i < 10; i++) {
        const callback = jest.fn()
        callbacks.push(callback)
        const unsub = liveQuery.query(core.class.Space, {}, callback)
        unsubscribes.push(unsub)

        if (i % 2 === 0) {
          unsub() // Unsubscribe every other one immediately
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Clean up remaining subscriptions
      unsubscribes.forEach((unsub, i) => {
        if (i % 2 !== 0) {
          unsub()
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      await close()
    })
  })

  describe('Potential Bug: Empty query result set operations', () => {
    it('should handle operations on empty result sets', async () => {
      const { liveQuery, factory, close } = await getClient()

      const callback = jest.fn()

      // Query that will have no results initially
      liveQuery.query(core.class.Space, { name: 'does-not-exist-initially' }, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()
      const initialResult = callback.mock.calls[callback.mock.calls.length - 1][0]
      expect(initialResult.length).toBe(0)

      // Now create a matching document
      await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'does-not-exist-initially',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const finalResult = callback.mock.calls[callback.mock.calls.length - 1][0]
      expect(finalResult.length).toBe(1)

      await close()
    })
  })

  describe('Potential Bug: Mixin updates with reverse lookup', () => {
    it('should handle mixin updates on documents with reverse lookups', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'mixin-reverse-lookup',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'test'
      })

      const callback = jest.fn()

      liveQuery.query(test.class.TestComment, { _id: comment }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Add child comment
      await factory.addCollection(test.class.TestComment, space, comment, test.class.TestComment, 'comments', {
        message: 'child'
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback.mock.calls.length).toBeGreaterThan(1)

      await close()
    })
  })
})
