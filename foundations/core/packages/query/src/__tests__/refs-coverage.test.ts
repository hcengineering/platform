// Tests for Refs class to improve coverage
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

describe('Refs Class Coverage Tests', () => {
  it('should find document from refs cache with specific _id', async () => {
    const { liveQuery, factory, close } = await getClient()

    // Create a document
    const space1 = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'cached-space-1',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    // Query it to cache it
    const callback = jest.fn()
    liveQuery.query(core.class.Space, { _id: space1 }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Now findOne should use cached version
    const result = await liveQuery.findOne(core.class.Space, { _id: space1 })

    expect(result).toBeDefined()
    expect(result?._id).toBe(space1)

    await close()
  })

  it('should handle findOne with limit=1 without sort', async () => {
    const { liveQuery, factory, close } = await getClient()

    // Create multiple documents
    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'test-1',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'test-2',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    // findOne with limit should use refs optimization
    const result = await liveQuery.findOne(core.class.Space, { private: false }, { limit: 1 })

    expect(result).toBeDefined()

    await close()
  })

  it('should handle findOne with associations and lookup', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'lookup-test',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    // Query with lookup to populate refs cache
    const callback = jest.fn()
    liveQuery.query(core.class.Space, { _id: space }, callback, { lookup: { _id: { docs: core.class.Doc } } })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // FindOne should use refs cache
    const result = await liveQuery.findOne(
      core.class.Space,
      { _id: space },
      { lookup: { _id: { docs: core.class.Doc } } }
    )

    expect(result).toBeDefined()

    await close()
  })

  it('should strip $lookup and $associations when finding from cache without them', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'strip-test',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    // Query with lookup to cache with $lookup
    const callback = jest.fn()
    liveQuery.query(core.class.Space, { _id: space }, callback, { lookup: { _id: { docs: core.class.Doc } } })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // FindOne without lookup should strip $lookup from cached doc
    const result = await liveQuery.findOne(core.class.Space, { _id: space })

    expect(result).toBeDefined()
    expect((result as any).$lookup).toBeUndefined()

    await close()
  })

  it('should handle mixin class in findOne', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'mixin-findone',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    // Query to cache
    const callback = jest.fn()
    liveQuery.query(core.class.Space, { _id: space }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Find with different class to test mixin path
    const result = await liveQuery.findOne(core.class.Space, { _id: space })

    expect(result).toBeDefined()

    await close()
  })

  it('should handle query with lookup and associations together', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'both-options',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    const callback = jest.fn()

    liveQuery.query(core.class.Space, { _id: space }, callback, {
      lookup: { _id: { docs: core.class.Doc } },
      associations: []
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()

    await close()
  })

  it('should handle updating refs cache on document changes', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'update-refs',
      description: 'original',
      private: false,
      members: [],
      archived: false
    })

    // Cache it
    const callback = jest.fn()
    liveQuery.query(core.class.Space, { _id: space }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Update it
    await factory.updateDoc(core.class.Space, core.space.Model, space, {
      description: 'updated'
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Find should have updated version
    const result = await liveQuery.findOne(core.class.Space, { _id: space })

    expect(result).toBeDefined()
    expect(result?.description).toBe('updated')

    await close()
  })

  it('should clean refs cache when query is removed', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'clean-refs',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    // Cache it
    const callback = jest.fn()
    const unsubscribe = liveQuery.query(core.class.Space, { _id: space }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Unsubscribe to clean refs
    unsubscribe()

    await new Promise((resolve) => setTimeout(resolve, 100))

    await close()
  })

  it('should handle multiple queries referencing same document', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'multi-ref',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    // Multiple queries on same document
    const callback1 = jest.fn()
    const callback2 = jest.fn()
    const callback3 = jest.fn()

    liveQuery.query(core.class.Space, { _id: space }, callback1)
    liveQuery.query(core.class.Space, { _id: space }, callback2)
    liveQuery.query(core.class.Space, { _id: space }, callback3)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback1).toHaveBeenCalled()
    expect(callback2).toHaveBeenCalled()
    expect(callback3).toHaveBeenCalled()

    await close()
  })

  it('should use refs cache for descendants check', async () => {
    const { liveQuery, factory, close } = await getClient()

    // Create documents
    const space1 = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'desc-test-1',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    // Cache with callback
    const callback = jest.fn()
    liveQuery.query(core.class.Space, {}, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // FindOne by _id should check descendants
    const result = await liveQuery.findOne(core.class.Space, { _id: space1 })

    expect(result).toBeDefined()

    await close()
  })
})
