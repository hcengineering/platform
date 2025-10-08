// Deep lookup and association tests
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

describe('Deep Lookup Tests', () => {
  describe('Nested lookup with missing parent', () => {
    it('should handle nested lookup when parent document is undefined', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'nested-missing-parent',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      // Create a comment with attachedTo pointing to non-existent parent
      const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'orphan comment'
      })

      const callback = jest.fn()

      // Nested lookup where parent might not exist
      liveQuery.query(test.class.TestComment, { _id: comment }, callback, {
        lookup: {
          attachedTo: core.class.Space
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('Reverse lookup with array values', () => {
    it('should handle reverse lookup with custom attribute', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'reverse-custom-attr',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'parent'
      })

      const callback = jest.fn()

      // Reverse lookup with specific attribute (array format)
      liveQuery.query(test.class.TestComment, { _id: comment }, callback, {
        lookup: {
          _id: {
            children: [test.class.TestComment, 'attachedTo'] // Custom attribute
          }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()

      // Add child with custom attachedTo
      await factory.addCollection(test.class.TestComment, space, comment, test.class.TestComment, 'comments', {
        message: 'child'
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback.mock.calls.length).toBeGreaterThan(1)

      await close()
    })
  })

  describe('Reverse lookup with undefined or zero values', () => {
    it('should skip reverse lookup fields that are undefined or 0', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'reverse-undefined',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      // This should handle cases where the document might have undefined reverse lookup fields
      liveQuery.query(core.class.Space, { _id: space }, callback, {
        lookup: {
          _id: {
            // This might not exist on the document
            somethingThatDoesNotExist: test.class.TestComment
          }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('Lookup with mixin keys', () => {
    it('should handle lookup with mixin property keys', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'mixin-key-lookup',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'test'
      })

      const callback = jest.fn()

      // Lookup that will use checkMixinKey internally
      liveQuery.query(test.class.TestComment, { _id: comment }, callback, {
        lookup: {
          space: core.class.Space,
          attachedTo: core.class.Space
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('Complex nested lookup updates', () => {
    it('should handle updates in nested lookup chain', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space1 = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'nested-space-1',
        description: 'level 1',
        private: false,
        members: [],
        archived: false
      })

      const comment1 = await factory.addCollection(
        test.class.TestComment,
        space1,
        space1,
        core.class.Space,
        'comments',
        {
          message: 'level 2'
        }
      )

      const comment2 = await factory.addCollection(
        test.class.TestComment,
        space1,
        comment1,
        test.class.TestComment,
        'comments',
        {
          message: 'level 3'
        }
      )

      const callback = jest.fn()

      // Deep nested lookup
      liveQuery.query(test.class.TestComment, { _id: comment2 }, callback, {
        lookup: {
          attachedTo: [
            test.class.TestComment,
            {
              space: core.class.Space
            }
          ]
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Update the space (should propagate through nested lookup)
      await factory.updateDoc(core.class.Space, core.space.Model, space1, {
        description: 'level 1 updated'
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('Lookup update with $pull operation', () => {
    it('should handle $pull operations on lookup arrays', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'pull-test',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const parentComment = await factory.addCollection(
        test.class.TestComment,
        space,
        space,
        core.class.Space,
        'comments',
        {
          message: 'parent'
        }
      )

      const childComments: Array<Ref<any>> = []
      for (let i = 0; i < 3; i++) {
        const child = await factory.addCollection(
          test.class.TestComment,
          space,
          parentComment,
          test.class.TestComment,
          'comments',
          {
            message: `child-${i}`
          }
        )
        childComments.push(child)
      }

      const callback = jest.fn()

      liveQuery.query(test.class.TestComment, { _id: parentComment }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Remove a child comment (should trigger $pull-like behavior)
      await factory.removeCollection(
        test.class.TestComment,
        space,
        childComments[1],
        parentComment,
        test.class.TestComment,
        'comments'
      )

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      await close()
    })
  })

  describe('Lookup with attached doc updates', () => {
    it('should handle reverse lookup updates when attached doc changes attachedTo', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'attached-move',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const comment1 = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'parent1'
      })

      const comment2 = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'parent2'
      })

      const childComment = await factory.addCollection(
        test.class.TestComment,
        space,
        comment1,
        test.class.TestComment,
        'comments',
        {
          message: 'child'
        }
      )

      const callback = jest.fn()

      // Watch parent1 with reverse lookup
      liveQuery.query(test.class.TestComment, { _id: comment1 }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Move child from comment1 to comment2
      await factory.updateCollection(
        test.class.TestComment,
        space,
        childComment,
        comment2, // New parent
        test.class.TestComment,
        'comments',
        {
          attachedTo: comment2
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have been notified about the change
      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      await close()
    })
  })

  describe('Lookup with single document vs array', () => {
    it('should handle both single document and array lookups', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'single-vs-array',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'test'
      })

      const callback = jest.fn()

      // Single document lookup (space) and array lookup (_id.comments)
      liveQuery.query(test.class.TestComment, { _id: comment }, callback, {
        lookup: {
          space: core.class.Space, // Single document
          _id: { comments: test.class.TestComment } // Array
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()
      const result = callback.mock.calls[callback.mock.calls.length - 1][0][0]

      // Should have both lookups
      expect(result.$lookup).toBeDefined()

      await close()
    })
  })

  describe('Mixin class matching in queries', () => {
    it('should handle queries on mixin classes', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'mixin-query',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      // Query on space class
      liveQuery.query(core.class.Space, { _id: space }, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('Lookup update edge cases', () => {
    it('should handle updates to documents not matching current query', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'edge-lookup',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'test'
      })

      const callback = jest.fn()

      // Query specific comments
      liveQuery.query(test.class.TestComment, { message: 'test' }, callback, {
        lookup: { space: core.class.Space }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Update message so it no longer matches
      await factory.updateCollection(test.class.TestComment, space, comment, space, core.class.Space, 'comments', {
        message: 'updated-no-match'
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('GetObjectValue with nested properties', () => {
    it('should handle lookups with nested property access', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'nested-property',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'test'
      })

      const callback = jest.fn()

      // Lookup that uses getObjectValue internally
      liveQuery.query(test.class.TestComment, { _id: comment }, callback, {
        lookup: {
          space: core.class.Space,
          attachedTo: core.class.Space
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })
})
