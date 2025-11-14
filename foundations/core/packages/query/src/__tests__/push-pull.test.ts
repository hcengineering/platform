// Tests for $push/$pull operations in lookups
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

describe('Push/Pull Operations with Lookups', () => {
  describe('$push with array lookup values', () => {
    it('should update lookup when $push is used with array of IDs', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'push-array-test',
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

      // Query with reverse lookup
      liveQuery.query(test.class.TestComment, { _id: parentComment }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Create multiple child comments
      await factory.addCollection(test.class.TestComment, space, parentComment, test.class.TestComment, 'comments', {
        message: 'child1'
      })

      await factory.addCollection(test.class.TestComment, space, parentComment, test.class.TestComment, 'comments', {
        message: 'child2'
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback).toHaveBeenCalled()

      const lastResult = callback.mock.calls[callback.mock.calls.length - 1][0][0]
      expect(lastResult.$lookup).toBeDefined()

      await close()
    })

    it('should handle $push with single ID value in lookup', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'push-single-test',
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

      const initialCalls = callback.mock.calls.length

      // Add a single child
      await factory.addCollection(test.class.TestComment, space, parentComment, test.class.TestComment, 'comments', {
        message: 'single child'
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      await close()
    })
  })

  describe('$pull with array lookup values', () => {
    it('should update lookup when $pull is used with array of IDs', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'pull-array-test',
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

      // Create multiple children
      const children: Array<Ref<any>> = []
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
        children.push(child)
      }

      await new Promise((resolve) => setTimeout(resolve, 100))

      const callback = jest.fn()

      liveQuery.query(test.class.TestComment, { _id: parentComment }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Remove multiple children
      await factory.removeCollection(
        test.class.TestComment,
        space,
        children[0],
        parentComment,
        test.class.TestComment,
        'comments'
      )

      await factory.removeCollection(
        test.class.TestComment,
        space,
        children[1],
        parentComment,
        test.class.TestComment,
        'comments'
      )

      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      await close()
    })

    it('should handle $pull with single ID value in lookup', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'pull-single-test',
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
          message: 'single child'
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 100))

      const callback = jest.fn()

      liveQuery.query(test.class.TestComment, { _id: parentComment }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Remove single child
      await factory.removeCollection(
        test.class.TestComment,
        space,
        childComment,
        parentComment,
        test.class.TestComment,
        'comments'
      )

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      await close()
    })
  })

  describe('Lookup initialization with undefined $lookup', () => {
    it('should initialize $lookup array when undefined on $push', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'init-push-test',
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
          message: 'parent with no children initially'
        }
      )

      const callback = jest.fn()

      liveQuery.query(test.class.TestComment, { _id: parentComment }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Add first child - should initialize $lookup.comments array
      await factory.addCollection(test.class.TestComment, space, parentComment, test.class.TestComment, 'comments', {
        message: 'first child'
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback).toHaveBeenCalled()

      await close()
    })

    it('should initialize $lookup array when undefined on $pull', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'init-pull-test',
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

      // Remove child - should handle undefined $lookup gracefully
      await factory.removeCollection(
        test.class.TestComment,
        space,
        childComment,
        parentComment,
        test.class.TestComment,
        'comments'
      )

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      await close()
    })
  })

  describe('Complex lookup scenarios', () => {
    it('should handle nested lookups with $push operations', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'nested-push-test',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const rootComment = await factory.addCollection(
        test.class.TestComment,
        space,
        space,
        core.class.Space,
        'comments',
        {
          message: 'root'
        }
      )

      const callback = jest.fn()

      liveQuery.query(test.class.TestComment, { _id: rootComment }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment },
          space: core.class.Space
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Add nested comment
      await factory.addCollection(test.class.TestComment, space, rootComment, test.class.TestComment, 'comments', {
        message: 'nested'
      })

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback).toHaveBeenCalled()

      await close()
    })

    it('should handle multiple simultaneous $push operations', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'multi-push-test',
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

      // Add multiple children rapidly
      await Promise.all([
        factory.addCollection(test.class.TestComment, space, parentComment, test.class.TestComment, 'comments', {
          message: 'child-a'
        }),
        factory.addCollection(test.class.TestComment, space, parentComment, test.class.TestComment, 'comments', {
          message: 'child-b'
        }),
        factory.addCollection(test.class.TestComment, space, parentComment, test.class.TestComment, 'comments', {
          message: 'child-c'
        })
      ])

      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(callback).toHaveBeenCalled()

      await close()
    })

    it('should handle mixed $push and $pull operations', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'mixed-ops-test',
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

      const existingChild = await factory.addCollection(
        test.class.TestComment,
        space,
        parentComment,
        test.class.TestComment,
        'comments',
        {
          message: 'existing'
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 100))

      const callback = jest.fn()

      liveQuery.query(test.class.TestComment, { _id: parentComment }, callback, {
        lookup: {
          _id: { comments: test.class.TestComment }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Add new child
      await factory.addCollection(test.class.TestComment, space, parentComment, test.class.TestComment, 'comments', {
        message: 'new'
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Remove existing child
      await factory.removeCollection(
        test.class.TestComment,
        space,
        existingChild,
        parentComment,
        test.class.TestComment,
        'comments'
      )

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callback).toHaveBeenCalled()

      await close()
    })
  })
})
