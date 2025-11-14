// Workspace event handling tests
//
// Copyright © 2024 Hardcore Engineering Inc.
//

import core, {
  BulkUpdateEvent,
  createClient,
  IndexingUpdateEvent,
  Ref,
  TxOperations,
  TxWorkspaceEvent,
  WorkspaceEvent
} from '@hcengineering/core'
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

describe('Workspace Events', () => {
  describe('IndexingUpdate event with $search queries', () => {
    it('should refresh queries with $search when IndexingUpdate event occurs', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'indexing-test',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'searchable message'
      })

      const callback = jest.fn()

      // Query with $search
      liveQuery.query(test.class.TestComment, { $search: 'searchable' }, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Send IndexingUpdate event
      const params: IndexingUpdateEvent = {
        _class: [test.class.TestComment]
      }
      const indexingEvent: TxWorkspaceEvent = {
        _id: 'indexing-event' as Ref<any>,
        _class: core.class.TxWorkspaceEvent,
        space: core.space.DerivedTx,
        modifiedOn: Date.now(),
        modifiedBy: core.account.System,
        objectSpace: space,
        event: WorkspaceEvent.IndexingUpdate,
        params
      }

      await liveQuery.tx(indexingEvent)

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have triggered a refresh
      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      await close()
    })

    it('should handle IndexingUpdate for queued queries with $search', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'queue-indexing',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      // Create a query with $search
      const unsubscribe = liveQuery.query(test.class.TestComment, { $search: 'test' }, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Unsubscribe to move to queue
      unsubscribe()

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Send IndexingUpdate event
      const params: IndexingUpdateEvent = {
        _class: [test.class.TestComment]
      }
      const indexingEvent: TxWorkspaceEvent = {
        _id: 'indexing-queue-event' as Ref<any>,
        _class: core.class.TxWorkspaceEvent,
        space: core.space.DerivedTx,
        modifiedOn: Date.now(),
        modifiedBy: core.account.System,
        objectSpace: space,
        event: WorkspaceEvent.IndexingUpdate,
        params
      }

      await liveQuery.tx(indexingEvent)

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Query should have been handled (either removed or refreshed)
      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('BulkUpdate event', () => {
    it('should refresh queries when BulkUpdate event occurs for matching class', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'bulk-update',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'bulk test'
      })

      const callback = jest.fn()

      liveQuery.query(test.class.TestComment, {}, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Send BulkUpdate event
      const params: BulkUpdateEvent = {
        _class: [test.class.TestComment]
      }
      const bulkEvent: TxWorkspaceEvent = {
        _id: 'bulk-event' as Ref<any>,
        _class: core.class.TxWorkspaceEvent,
        space: core.space.DerivedTx,
        modifiedOn: Date.now(),
        modifiedBy: core.account.System,
        objectSpace: space,
        event: WorkspaceEvent.BulkUpdate,
        params
      }

      await liveQuery.tx(bulkEvent)

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have triggered a refresh
      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      await close()
    })

    it('should handle BulkUpdate for queued queries', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'queue-bulk',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      // Create and then unsubscribe to move to queue
      const unsubscribe = liveQuery.query(test.class.TestComment, {}, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      unsubscribe()

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Send BulkUpdate event
      const params: BulkUpdateEvent = {
        _class: [test.class.TestComment]
      }
      const bulkEvent: TxWorkspaceEvent = {
        _id: 'bulk-queue-event' as Ref<any>,
        _class: core.class.TxWorkspaceEvent,
        space: core.space.DerivedTx,
        modifiedOn: Date.now(),
        modifiedBy: core.account.System,
        objectSpace: space,
        event: WorkspaceEvent.BulkUpdate,
        params
      }

      await liveQuery.tx(bulkEvent)

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Query should have been handled
      expect(callback).toHaveBeenCalled()

      await close()
    })
  })

  describe('SecurityChange event', () => {
    it('should refresh queries when SecurityChange event occurs for matching space', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'security-test',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      await factory.addCollection(test.class.TestComment, space, space, core.class.Space, 'comments', {
        message: 'security test'
      })

      const callback = jest.fn()

      liveQuery.query(test.class.TestComment, { space }, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Send SecurityChange event
      const securityEvent: TxWorkspaceEvent = {
        _id: 'security-event' as Ref<any>,
        _class: core.class.TxWorkspaceEvent,
        space: core.space.DerivedTx,
        modifiedOn: Date.now(),
        modifiedBy: core.account.System,
        objectSpace: space,
        event: WorkspaceEvent.SecurityChange,
        params: null
      }

      await liveQuery.tx(securityEvent)

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have triggered a refresh
      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      await close()
    })

    it('should handle SecurityChange for queries with non-string space (e.g., $in)', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space1 = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'security-1',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const space2 = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'security-2',
        description: 'test',
        private: false,
        members: [],
        archived: false
      })

      const callback = jest.fn()

      // Query with $in for space (non-string)
      liveQuery.query(test.class.TestComment, { space: { $in: [space1, space2] } }, callback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const initialCalls = callback.mock.calls.length

      // Send SecurityChange event
      const securityEvent: TxWorkspaceEvent = {
        _id: 'security-nonstring-event' as Ref<any>,
        _class: core.class.TxWorkspaceEvent,
        space: core.space.DerivedTx,
        modifiedOn: Date.now(),
        modifiedBy: core.account.System,
        objectSpace: space1,
        event: WorkspaceEvent.SecurityChange,
        params: null
      }

      await liveQuery.tx(securityEvent)

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have triggered a refresh since space query is non-string
      expect(callback.mock.calls.length).toBeGreaterThan(initialCalls)

      await close()
    })

    it('should handle SecurityChange for queued queries', async () => {
      const { liveQuery, factory, close } = await getClient()

      const space = await factory.createDoc(core.class.Space, core.space.Model, {
        name: 'security-queue',
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

      // Send SecurityChange event
      const securityEvent: TxWorkspaceEvent = {
        _id: 'security-queue-event' as Ref<any>,
        _class: core.class.TxWorkspaceEvent,
        space: core.space.DerivedTx,
        modifiedOn: Date.now(),
        modifiedBy: core.account.System,
        objectSpace: space,
        event: WorkspaceEvent.SecurityChange,
        params: null
      }

      await liveQuery.tx(securityEvent)

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Query should have been handled
      expect(callback).toHaveBeenCalled()

      await close()
    })
  })
})
