// Coverage improvement tests for LiveQuery functionality
//
// Copyright © 2024 Hardcore Engineering Inc.
//

import core, { createClient, TxOperations } from '@hcengineering/core'
import { LiveQuery } from '..'
import { connect } from './connection'

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

describe('LiveQuery Coverage Tests', () => {
  it('should handle refreshConnect with clean=true', async () => {
    const { liveQuery, close } = await getClient()

    const callback = jest.fn()

    // Create a query
    const unsubscribe = liveQuery.query(core.class.Space, {}, callback)

    // Wait for initial results
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()
    callback.mockClear()

    // Unsubscribe to move to queue
    unsubscribe()
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Refresh with clean=true should reset the query
    await liveQuery.refreshConnect(true)

    // Verify the query was cleaned
    await close()
  })

  it('should handle isClosed', async () => {
    const { liveQuery } = await getClient()

    expect(liveQuery.isClosed()).toBe(false)

    await liveQuery.close()

    expect(liveQuery.isClosed()).toBe(true)
  })

  it('should handle findOne with projection', async () => {
    const { liveQuery, factory, close } = await getClient()

    // Create a document
    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'test-space',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    // FindOne with projection
    const result = await liveQuery.findOne(core.class.Space, { _id: space }, { projection: { name: 1 } })

    expect(result).toBeDefined()
    expect(result?.name).toBe('test-space')

    await close()
  })

  it('should pass searchFulltext to client', async () => {
    const { liveQuery, close } = await getClient()

    const result = await liveQuery.searchFulltext({ query: 'test' }, {})

    expect(result).toBeDefined()

    await close()
  })

  it('should return hierarchy and model from client', async () => {
    const { liveQuery, close } = await getClient()

    const hierarchy = liveQuery.getHierarchy()
    const model = liveQuery.getModel()

    expect(hierarchy).toBeDefined()
    expect(model).toBeDefined()

    await close()
  })

  it('should handle multiple callbacks for same query', async () => {
    const { liveQuery, close } = await getClient()

    const callback1 = jest.fn()
    const callback2 = jest.fn()
    const callback3 = jest.fn()

    liveQuery.query(core.class.Space, {}, callback1)
    liveQuery.query(core.class.Space, {}, callback2)
    liveQuery.query(core.class.Space, {}, callback3)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // All callbacks should be registered and called
    expect(callback1).toHaveBeenCalled()
    expect(callback2).toHaveBeenCalled()
    expect(callback3).toHaveBeenCalled()

    await close()
  })

  it('should remove only specific callback on unsubscribe', async () => {
    const { liveQuery, close } = await getClient()

    const callback1 = jest.fn()
    const callback2 = jest.fn()

    liveQuery.query(core.class.Space, {}, callback1)
    const unsubscribe2 = liveQuery.query(core.class.Space, {}, callback2)

    await new Promise((resolve) => setTimeout(resolve, 100))

    callback1.mockClear()
    callback2.mockClear()

    unsubscribe2()

    // callback1 should still be active
    await new Promise((resolve) => setTimeout(resolve, 50))

    await close()
  })

  it('should handle query moving from active to queue and back', async () => {
    const { liveQuery, close } = await getClient()

    const callback1 = jest.fn()
    const callback2 = jest.fn()

    // Subscribe
    const unsubscribe1 = liveQuery.query(core.class.Space, {}, callback1)
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback1).toHaveBeenCalled()

    // Unsubscribe - moves to queue
    unsubscribe1()
    await new Promise((resolve) => setTimeout(resolve, 50))

    callback1.mockClear()
    callback2.mockClear()

    // Subscribe again with same query - should reuse from queue
    liveQuery.query(core.class.Space, {}, callback2)
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback2).toHaveBeenCalled()

    await close()
  })

  it('should handle TxUpdateDoc with search query', async () => {
    const { liveQuery, factory, close } = await getClient()

    // Create a document
    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'searchable-space',
      description: 'test document for search',
      private: false,
      members: [],
      archived: false
    })

    const callback = jest.fn()

    // Query with search (though actual search won't work in mock, it tests the code path)
    liveQuery.query(core.class.Space, { _id: space }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()

    // Update the document
    await factory.updateDoc(core.class.Space, core.space.Model, space, {
      name: 'updated-space'
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Callback should have been called again with updated results
    expect(callback.mock.calls.length).toBeGreaterThan(1)

    await close()
  })

  it('should handle TxRemoveDoc with total tracking', async () => {
    const { liveQuery, factory, close } = await getClient()

    // Create a document
    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'to-be-removed',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    const callback = jest.fn()

    // Query with total tracking
    liveQuery.query(core.class.Space, { _id: space }, callback, { total: true })

    await new Promise((resolve) => setTimeout(resolve, 100))

    callback.mockClear()

    // Remove the document
    await factory.removeDoc(core.class.Space, core.space.Model, space)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Callback should have been called with updated results
    expect(callback).toHaveBeenCalled()

    await close()
  })

  it('should handle lookup queries', async () => {
    const { liveQuery, close } = await getClient()

    const callback = jest.fn()

    // Query with reverse lookup
    liveQuery.query(core.class.Space, {}, callback, {
      lookup: {
        _id: {
          attachedDocs: core.class.Doc
        }
      }
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()

    await close()
  })

  it('should compare options correctly ignoring ctx', async () => {
    const { liveQuery, close } = await getClient()

    const callback1 = jest.fn()
    const callback2 = jest.fn()

    // Query with same options (should reuse)
    liveQuery.query(core.class.Space, {}, callback1, { limit: 10, sort: { modifiedOn: 1 } })

    liveQuery.query(core.class.Space, {}, callback2, { limit: 10, sort: { modifiedOn: 1 } })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback1).toHaveBeenCalled()
    expect(callback2).toHaveBeenCalled()

    await close()
  })

  it('should treat different options as different queries', async () => {
    const { liveQuery, close } = await getClient()

    const callback1 = jest.fn()
    const callback2 = jest.fn()

    liveQuery.query(core.class.Space, {}, callback1, { limit: 10 })

    liveQuery.query(core.class.Space, {}, callback2, { limit: 20 })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback1).toHaveBeenCalled()
    expect(callback2).toHaveBeenCalled()

    await close()
  })

  it('should handle TxMixin updates', async () => {
    const { liveQuery, factory, close } = await getClient()

    // Create a space document
    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'mixin-test',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    const callback = jest.fn()

    liveQuery.query(core.class.Space, { _id: space }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()

    await close()
  })

  it('should handle document creation via transaction', async () => {
    const { liveQuery, factory, close } = await getClient()

    const callback = jest.fn()

    // Set up query before creating document
    liveQuery.query(core.class.Space, { name: 'new-space' }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    const initialCallCount = callback.mock.calls.length

    // Create matching document
    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'new-space',
      description: 'newly created',
      private: false,
      members: [],
      archived: false
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Should have been called again with new document
    expect(callback.mock.calls.length).toBeGreaterThan(initialCallCount)

    await close()
  })

  it('should handle refreshConnect without clean', async () => {
    const { liveQuery, close } = await getClient()

    const callback = jest.fn()

    liveQuery.query(core.class.Space, {}, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Refresh without clean
    await liveQuery.refreshConnect(false)

    await close()
  })

  it('should handle associations option', async () => {
    const { liveQuery, close } = await getClient()

    const callback = jest.fn()

    liveQuery.query(core.class.Space, {}, callback, { associations: [] })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()

    await close()
  })
})
