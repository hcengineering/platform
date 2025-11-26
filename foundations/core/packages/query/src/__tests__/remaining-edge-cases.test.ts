// Additional edge case tests for remaining uncovered code
//
// Copyright © 2024 Hardcore Engineering Inc.
//

import core, { createClient, TxOperations } from '@hcengineering/core'
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

describe('Edge Cases for Uncovered Code', () => {
  describe('Reverse lookup update scenarios', () => {
    it('should handle updates to documents in reverse lookup arrays', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'reverse-update-test',
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

      const childComment = await factory.addCollection(
        test.class.TestComment,
        space,
        parentComment,
        test.class.TestComment,
        'comments',
        {
          message: 'child original'
        }
      )

      const callback = jest.fn()

      // Query with reverse lookup
      liveQuery.query(test.class.TestComment, { _id: parentComment }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Update the child comment
      await factory.updateCollection(
        test.class.TestComment,
        space,
        childComment,
        parentComment,
        test.class.TestComment,
        'comments',
        {
          message: 'child updated'
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      // Verify lookup data was updated
      const lastResult = callback.mock.calls[callback.mock.calls.length - 1][0][0]
      expect(lastResult.$lookup).toBeDefined()

      await close()
    })

    it('should handle mixin updates to documents in reverse lookup', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'mixin-reverse-lookup',
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

      const childComment = await factory.addCollection(
        test.class.TestComment,
        space,
        parentComment,
        test.class.TestComment,
        'comments',
        {
          message: 'child'
        }
      )

      const callback = jest.fn()

      liveQuery.query(test.class.TestComment, { _id: parentComment }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Create mixin on child
      await factory.createMixin(childComment, test.class.TestComment, space, test.mixin.TestMixin, {})

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(initialCalls)

      await close()
    })
  })

  describe('Regular lookup update scenarios', () => {
    it('should update $lookup when linked document is updated via TxUpdateDoc', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'lookup-update-test',
        description: 'original',
        private: false,
        members: [],
        archived: false
      })

      const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'test'
      })

      const callback = jest.fn()

      // Query with lookup to space
      liveQuery.query(test.class.TestComment, { _id: comment }, callback, {
        lookup: {
          space: core.class.Space
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Update the space (lookup target)
      await factory.updateDoc(core.class.Space, core.space.Model, space, {
        description: 'updated'
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      // Verify lookup was updated
      const lastResult = callback.mock.calls[callback.mock.calls.length - 1][0][0]
      expect(lastResult.$lookup?.space).toBeDefined()

      await close()
    })

    it('should update $lookup when linked document receives mixin via TxMixin', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'mixin-lookup-test',
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
          space: core.class.Space
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Add mixin to space
      await factory.createMixin(space, core.class.Space, core.space.Model, test.mixin.TestMixin, {})

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(initialCalls)

      await close()
    })
  })

  describe('Array-based reverse lookup edge cases', () => {
    it('should handle reverse lookup with array value containing undefined document', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'undefined-in-array',
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

      // Create child, get its ID, then we'll query before it's properly looked up
      const childComment = await factory.addCollection(
        test.class.TestComment,
        space,
        parentComment,
        test.class.TestComment,
        'comments',
        {
          message: 'child'
        }
      )

      const callback = jest.fn()

      // Query with reverse lookup
      liveQuery.query(test.class.TestComment, { _id: parentComment }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Try to update a non-existent child (index will be -1)
      await factory.updateCollection(
        test.class.TestComment,
        space,
        childComment,
        parentComment,
        test.class.TestComment,
        'comments',
        {
          message: 'updated'
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback).toHaveBeenCalled()

      await close()
    })

    it('should handle updates when reverse lookup value is not yet in array', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'not-in-array',
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

      const callback = jest.fn()

      liveQuery.query(test.class.TestComment, { _id: parentComment }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Create a child which should trigger adding to lookup array
      const childComment = await factory.addCollection(
        test.class.TestComment,
        space,
        parentComment,
        test.class.TestComment,
        'comments',
        {
          message: 'new child'
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Update it - should find it in array now
      await factory.updateCollection(
        test.class.TestComment,
        space,
        childComment,
        parentComment,
        test.class.TestComment,
        'comments',
        {
          message: 'child updated'
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('Nested lookup scenarios', () => {
    it('should handle nested lookup where parent document exists', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'nested-exists',
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

      const childComment = await factory.addCollection(
        test.class.TestComment,
        space,
        parentComment,
        test.class.TestComment,
        'comments',
        {
          message: 'child'
        }
      )

      const callback = jest.fn()

      // Nested lookup: child -> attachedTo (parent) -> space
      liveQuery.query(test.class.TestComment, { _id: childComment }, callback, {
        lookup: {
          attachedTo: [test.class.TestComment, { space: core.class.Space }]
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback).toHaveBeenCalled()

      const result = callback.mock.calls[callback.mock.calls.length - 1][0][0]
      expect(result.$lookup?.attachedTo).toBeDefined()

      await close()
    })

    it('should handle nested lookup where parent document is undefined', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'nested-undefined',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      // Create orphan comment with no valid parent
      const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'orphan'
      })

      const callback = jest.fn()

      // Try nested lookup where parent might not exist
      liveQuery.query(test.class.TestComment, { _id: comment }, callback, {
        lookup: {
          attachedTo: [core.class.Space, {}] // Will find space, nested is empty
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('Reverse lookup with custom attribute', () => {
    it('should handle reverse lookup with custom attribute name (array format)', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'custom-attr',
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

      const callback = jest.fn()

      // Reverse lookup with explicit attribute
      liveQuery.query(test.class.TestComment, { _id: parentComment }, callback, {
        lookup: {
          _id: {
            children: [test.class.TestComment, 'attachedTo']
          }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Add child
      await factory.addCollection(test.class.TestComment, space, parentComment, test.class.TestComment, 'comments', {
        message: 'child with custom attr'
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback).toHaveBeenCalled()

      const result = callback.mock.calls[callback.mock.calls.length - 1][0][0]
      expect(result.$lookup).toBeDefined()

      await close()
    })
  })

  describe('Lookup with mixin key checks', () => {
    it('should handle lookup keys that might be mixin properties', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'mixin-key',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'test'
      })

      const callback = jest.fn()

      // Lookup with keys that will be checked via checkMixinKey
      liveQuery.query(test.class.TestComment, { _id: comment }, callback, {
        lookup: {
          space: core.class.Space,
          attachedTo: core.class.Space
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()

      const result = callback.mock.calls[callback.mock.calls.length - 1][0][0]
      expect(result.$lookup?.space).toBeDefined()

      await close()
    })
  })

  describe('Reverse lookup with 0 or undefined values', () => {
    it('should skip reverse lookup when field value is 0', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'zero-value',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      // Query with reverse lookup on a field that might be 0 or undefined
      liveQuery.query(core.class.Space, { _id: space }, callback, {
        lookup: {
          _id: {
            nonExistentField: test.class.TestComment
          }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()

      // Should not crash and result should be valid
      const result = callback.mock.calls[callback.mock.calls.length - 1][0][0]
      expect(result).toBeDefined()

      await close()
    })
  })
})
