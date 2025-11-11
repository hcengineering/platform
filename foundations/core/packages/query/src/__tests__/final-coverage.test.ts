// Final comprehensive tests targeting uncovered scenarios
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

describe('LiveQuery Final Coverage Tests', () => {
  it('should handle complex update with attached documents', async () => {
    const { liveQuery, factory, close } = await getClient()

    // Create a space
    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'attach-test',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    // Add attached comment
    const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
      message: 'original'
    })

    const callback = jest.fn()

    liveQuery.query(test.class.TestComment, { _id: comment }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Update the comment
    await factory.updateCollection(test.class.TestComment, space, comment, space, core.class.Space, 'comments', {
      message: 'updated'
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback.mock.calls.length).toBeGreaterThan(1)

    await close()
  })

  it('should handle reverse lookup updates on attached documents', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'reverse-lookup-test',
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
        _id: {
          comments: test.class.TestComment
        }
      }
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Add child comment
    await factory.addCollection(test.class.TestComment, space, parentComment, test.class.TestComment, 'comments', {
      message: 'child1'
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Should have updated with new child
    expect(callback.mock.calls.length).toBeGreaterThan(1)

    await close()
  })

  it('should handle nested lookups with multiple levels', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'nested-lookup',
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

    // Nested lookup
    liveQuery.query(test.class.TestComment, { _id: childComment }, callback, {
      lookup: {
        attachedTo: [test.class.TestComment, { space: core.class.Space }]
      }
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()

    await close()
  })

  it('should handle query with limit and sorting together', async () => {
    const { liveQuery, factory, close } = await getClient()

    // Create multiple documents
    for (let i = 0; i < 10; i++) {
      await factory.createDoc(core.class.Space, core.space.Model, {
        name: `sorted-${String(i).padStart(2, '0')}`,
        description: 'test',
        private: false,
        members: [],
        archived: false
      })
    }

    const callback = jest.fn()

    // Query with limit and sort
    liveQuery.query(core.class.Space, {}, callback, {
      limit: 3,
      sort: { name: SortingOrder.Ascending }
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()
    const result = callback.mock.calls[callback.mock.calls.length - 1][0]
    expect(result.length).toBeLessThanOrEqual(3)

    await close()
  })

  it('should handle projection with lookup', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'projection-lookup',
      description: 'test description',
      private: false,
      members: [],
      archived: false
    })

    const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
      message: 'test'
    })

    const callback = jest.fn()

    liveQuery.query(test.class.TestComment, { _id: comment }, callback, {
      projection: { message: 1, _id: 1 },
      lookup: { space: core.class.Space }
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()

    await close()
  })

  it('should handle updates to documents with limit queries', async () => {
    const { liveQuery, factory, close } = await getClient()

    const spaces: Array<Ref<any>> = []

    // Create documents
    for (let i = 0; i < 5; i++) {
      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: `limit-${i}`,
        description: 'test',
        private: false,
        members: [],
        archived: false
      })
      spaces.push(space)
    }

    const callback = jest.fn()

    // Query with limit
    liveQuery.query(core.class.Space, {}, callback, { limit: 3 })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Update a document
    await factory.updateDoc(core.class.Space, core.space.Model, spaces[0], {
      description: 'updated'
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback.mock.calls.length).toBeGreaterThan(1)

    await close()
  })

  it('should handle removing attached documents', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'remove-attached',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    const comment = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
      message: 'to be removed'
    })

    const callback = jest.fn()

    liveQuery.query(test.class.TestComment, { _id: comment }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Remove the comment
    await factory.removeCollection(test.class.TestComment, space, comment, space, core.class.Space, 'comments')

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback.mock.calls.length).toBeGreaterThan(1)

    await close()
  })

  it('should handle multiple simultaneous updates', async () => {
    const { liveQuery, factory, close } = await getClient()

    const spaces: Array<Ref<any>> = []

    for (let i = 0; i < 3; i++) {
      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: `multi-${i}`,
        description: 'original',
        private: false,
        members: [],
        archived: false
      })
      spaces.push(space)
    }

    const callback = jest.fn()

    liveQuery.query(core.class.Space, {}, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    const initialCalls = callback.mock.calls.length

    // Simultaneous updates
    await Promise.all(
      spaces.map((space) =>
        factory.updateDoc(core.class.Space, core.space.Model, space, {
          description: 'updated'
        })
      )
    )

    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

    await close()
  })

  it('should handle complex query conditions with $ne', async () => {
    const { liveQuery, factory, close } = await getClient()

    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'not-this',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'this-one',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    const callback = jest.fn()

    liveQuery.query(core.class.Space, { name: { $ne: 'not-this' } }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()

    await close()
  })

  it('should handle attached document updates with reverse lookup', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'reverse-update',
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
        message: 'original child'
      }
    )

    const callback = jest.fn()

    liveQuery.query(test.class.TestComment, { _id: parentComment }, callback, {
      lookup: {
        _id: { comments: test.class.TestComment }
      }
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Update child comment
    await factory.updateCollection(
      test.class.TestComment,
      space,
      childComment,
      parentComment,
      test.class.TestComment,
      'comments',
      {
        message: 'updated child'
      }
    )

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback.mock.calls.length).toBeGreaterThan(1)

    await close()
  })

  it('should handle query reactivation from queue with updates', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'reactivate',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    const callback1 = jest.fn()

    // Subscribe
    const unsub = liveQuery.query(core.class.Space, { _id: space }, callback1)

    await new Promise((resolve) => setTimeout(resolve, 50))

    // Unsubscribe to move to queue
    unsub()

    await new Promise((resolve) => setTimeout(resolve, 50))

    // Update while in queue
    await factory.updateDoc(core.class.Space, core.space.Model, space, {
      description: 'updated while queued'
    })

    await new Promise((resolve) => setTimeout(resolve, 50))

    const callback2 = jest.fn()

    // Reactivate from queue
    liveQuery.query(core.class.Space, { _id: space }, callback2)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback2).toHaveBeenCalled()

    await close()
  })

  it('should handle findAll with total option', async () => {
    const { liveQuery, factory, close } = await getClient()

    // Create more docs than limit
    for (let i = 0; i < 10; i++) {
      await factory.createDoc(core.class.Space, core.space.Model, {
        name: `total-${i}`,
        description: 'test',
        private: false,
        members: [],
        archived: false
      })
    }

    const result = await liveQuery.findAll(
      core.class.Space,
      {},
      {
        limit: 5,
        total: true
      }
    )

    expect(result.length).toBe(5)
    expect(result.total).toBeGreaterThanOrEqual(10)

    await close()
  })

  it('should handle complex attachedTo relationships', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'complex-attached',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    const comment1 = await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
      message: 'comment1'
    })

    await factory.addCollection(test.class.TestComment, space, comment1, test.class.TestComment, 'comments', {
      message: 'comment2'
    })

    const callback = jest.fn()

    liveQuery.query(test.class.TestComment, { attachedTo: comment1 }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()

    await close()
  })
})
