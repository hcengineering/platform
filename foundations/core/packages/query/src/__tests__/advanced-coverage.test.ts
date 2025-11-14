// Advanced tests for complex LiveQuery scenarios
//
// Copyright © 2024 Hardcore Engineering Inc.
//

import core, { createClient, Ref, SortingOrder, TxOperations } from '@hcengineering/core'
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

describe('LiveQuery Advanced Coverage Tests', () => {
  it('should handle complex sorting scenarios', async () => {
    const { liveQuery, factory, close } = await getClient()

    // Create multiple documents
    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'Z-space',
      description: 'last',
      private: false,
      members: [],
      archived: false
    })

    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'A-space',
      description: 'first',
      private: false,
      members: [],
      archived: false
    })

    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'M-space',
      description: 'middle',
      private: false,
      members: [],
      archived: false
    })

    const callback = jest.fn()

    // Query with sorting
    liveQuery.query(core.class.Space, {}, callback, { sort: { name: SortingOrder.Ascending }, limit: 10 })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()
    const lastResult = callback.mock.calls[callback.mock.calls.length - 1][0]
    expect(lastResult.length).toBeGreaterThan(0)

    await close()
  })

  it('should handle complex query with multiple conditions', async () => {
    const { liveQuery, factory, close } = await getClient()

    const spaces = []
    for (let i = 0; i < 5; i++) {
      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: `multi-${i}`,
        description: `desc-${i}`,
        private: i % 2 === 0,
        members: [],
        archived: i > 3
      })
      spaces.push(space)
    }

    const callback = jest.fn()

    // Complex query
    liveQuery.query(core.class.Space, { private: false, archived: false }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()

    await close()
  })

  it('should handle findAll with complex options', async () => {
    const { liveQuery, factory, close } = await getClient()

    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'findall-1',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'findall-2',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    // Use findAll with various options
    const result = await liveQuery.findAll(
      core.class.Space,
      { private: false },
      {
        limit: 10,
        sort: { modifiedOn: SortingOrder.Descending }
      }
    )

    expect(result.length).toBeGreaterThan(0)

    await close()
  })

  it('should handle rapid document creation and updates', async () => {
    const { liveQuery, factory, close } = await getClient()

    const callback = jest.fn()

    liveQuery.query(core.class.Space, { private: false }, callback)

    await new Promise((resolve) => setTimeout(resolve, 50))

    // Rapid creation
    const spaces: Array<Ref<any>> = []
    for (let i = 0; i < 10; i++) {
      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: `rapid-${i}`,
        description: 'test',
        private: false,
        members: [],
        archived: false
      })
      spaces.push(space)
    }

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Rapid updates
    for (const space of spaces) {
      await factory.updateDoc(core.class.Space, core.space.Model, space, {
        description: 'updated'
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback.mock.calls.length).toBeGreaterThan(1)

    await close()
  })

  it('should handle document removal from live query', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space1 = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'remove-1',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    const callback = jest.fn()

    liveQuery.query(core.class.Space, { _id: space1 }, callback, { total: true })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()
    callback.mockClear()

    // Remove the document
    await factory.removeDoc(core.class.Space, core.space.Model, space1)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Callback should be called with updated results
    expect(callback).toHaveBeenCalled()

    await close()
  })

  it('should handle query with $in operator', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space1 = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'in-1',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    const space2 = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'in-2',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    const callback = jest.fn()

    liveQuery.query(core.class.Space, { _id: { $in: [space1, space2] } }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()

    await close()
  })

  it('should handle nested document updates', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'nested-update',
      description: 'original',
      private: false,
      members: [],
      archived: false
    })

    const callback = jest.fn()

    liveQuery.query(core.class.Space, { _id: space }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    callback.mockClear()

    // Multiple rapid updates
    await factory.updateDoc(core.class.Space, core.space.Model, space, {
      description: 'update-1'
    })

    await factory.updateDoc(core.class.Space, core.space.Model, space, {
      description: 'update-2'
    })

    await factory.updateDoc(core.class.Space, core.space.Model, space, {
      description: 'update-3'
    })

    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(callback).toHaveBeenCalled()

    await close()
  })

  it('should handle query with empty results', async () => {
    const { liveQuery, close } = await getClient()

    const callback = jest.fn()

    liveQuery.query(core.class.Space, { name: 'non-existent-document-name-12345' }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()
    const result = callback.mock.calls[0][0]
    expect(result.length).toBe(0)

    await close()
  })

  it('should handle concurrent queries on same data', async () => {
    const { liveQuery, factory, close } = await getClient()

    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'concurrent-test',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    const callback1 = jest.fn()
    const callback2 = jest.fn()
    const callback3 = jest.fn()

    // Start multiple queries simultaneously
    liveQuery.query(core.class.Space, { private: false }, callback1, { limit: 5 })
    liveQuery.query(core.class.Space, { private: false }, callback2, { limit: 10 })
    liveQuery.query(core.class.Space, { private: false }, callback3)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback1).toHaveBeenCalled()
    expect(callback2).toHaveBeenCalled()
    expect(callback3).toHaveBeenCalled()

    await close()
  })

  it('should handle total count in queries', async () => {
    const { liveQuery, factory, close } = await getClient()

    for (let i = 0; i < 5; i++) {
      await factory.createDoc(core.class.Space, core.space.Model, {
        name: `total-${i}`,
        description: 'test',
        private: false,
        members: [],
        archived: false
      })
    }

    const callback = jest.fn()

    liveQuery.query(core.class.Space, { private: false }, callback, { limit: 2, total: true })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()
    const result = callback.mock.calls[callback.mock.calls.length - 1][0]
    expect(result.total).toBeGreaterThanOrEqual(5)

    await close()
  })

  it('should handle query with archived documents', async () => {
    const { liveQuery, factory, close } = await getClient()

    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'archived-1',
      description: 'test',
      private: false,
      members: [],
      archived: true
    })

    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'active-1',
      description: 'test',
      private: false,
      members: [],
      archived: false
    })

    const callback = jest.fn()

    // Query for non-archived
    liveQuery.query(core.class.Space, { archived: false }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(callback).toHaveBeenCalled()

    await close()
  })

  it('should handle updating query multiple times', async () => {
    const { liveQuery, factory, close } = await getClient()

    const space = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'multi-update',
      description: 'v1',
      private: false,
      members: [],
      archived: false
    })

    const callback = jest.fn()

    liveQuery.query(core.class.Space, { _id: space }, callback)

    await new Promise((resolve) => setTimeout(resolve, 50))

    // Update multiple times
    for (let i = 2; i <= 5; i++) {
      await factory.updateDoc(core.class.Space, core.space.Model, space, {
        description: `v${i}`
      })
      await new Promise((resolve) => setTimeout(resolve, 30))
    }

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Should have been called multiple times
    expect(callback.mock.calls.length).toBeGreaterThan(1)

    await close()
  })

  it('should handle query unsubscribe and resubscribe cycle', async () => {
    const { liveQuery, close } = await getClient()

    const callback1 = jest.fn()

    // Subscribe
    const unsub1 = liveQuery.query(core.class.Space, {}, callback1)

    await new Promise((resolve) => setTimeout(resolve, 50))

    // Unsubscribe
    unsub1()

    await new Promise((resolve) => setTimeout(resolve, 50))

    callback1.mockClear()

    const callback2 = jest.fn()

    // Resubscribe
    liveQuery.query(core.class.Space, {}, callback2)

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(callback2).toHaveBeenCalled()

    await close()
  })

  it('should handle findOne on non-existent document', async () => {
    const { liveQuery, close } = await getClient()

    const result = await liveQuery.findOne(core.class.Space, { _id: 'non-existent-id-12345' as Ref<any> })

    expect(result).toBeUndefined()

    await close()
  })

  it('should handle mixed operations on same query', async () => {
    const { liveQuery, factory, close } = await getClient()

    const spaces: Array<Ref<any>> = []

    // Create initial documents
    for (let i = 0; i < 3; i++) {
      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: `mixed-${i}`,
        description: 'test',
        private: false,
        members: [],
        archived: false
      })
      spaces.push(space)
    }

    const callback = jest.fn()

    liveQuery.query(core.class.Space, { private: false }, callback)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Update one
    await factory.updateDoc(core.class.Space, core.space.Model, spaces[0], {
      description: 'updated'
    })

    // Create new one
    await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'mixed-new',
      description: 'new',
      private: false,
      members: [],
      archived: false
    })

    // Remove one
    await factory.removeDoc(core.class.Space, core.space.Model, spaces[1])

    await new Promise((resolve) => setTimeout(resolve, 150))

    // Should have been notified multiple times
    expect(callback.mock.calls.length).toBeGreaterThan(1)

    await close()
  })
})
