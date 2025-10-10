//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

/**
 * Test for TxOrderingMiddleware
 *
 * This test verifies that the middleware ensures transactions for the same document
 * are broadcasted in the correct order based on modifiedOn timestamp.
 */

import core, {
  type Class,
  type Doc,
  generateId,
  Hierarchy,
  MeasureMetricsContext,
  type MeasureContext,
  ModelDb,
  type Ref,
  type Space,
  type Tx,
  TxFactory,
  type TxUpdateDoc
} from '@hcengineering/core'
import type { PipelineContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { TxOrderingMiddleware } from '../txOrdering'

interface TestDoc extends Doc {
  name: string
  counter: number
}

const testDocClass = 'test:class:TestDoc' as Ref<Class<TestDoc>>

/**
 * Track broadcasted transactions to verify ordering
 */
class BroadcastTracker {
  broadcasted: Tx[] = []

  record (tx: Tx): void {
    this.broadcasted.push(tx)
  }

  reset (): void {
    this.broadcasted = []
  }

  getOrder (): number[] {
    return this.broadcasted.map((tx) => tx.modifiedOn)
  }
}

describe('TxOrderingMiddleware', () => {
  let ctx: MeasureContext
  let middleware: TxOrderingMiddleware
  let tracker: BroadcastTracker
  let txFactory: TxFactory
  let testDoc: TestDoc

  beforeEach(async () => {
    ctx = new MeasureMetricsContext('test', {})
    ctx.contextData = {
      broadcast: {
        txes: [],
        queue: [],
        sessions: {}
      }
    } as any

    tracker = new BroadcastTracker()

    const hierarchy = new Hierarchy()
    const model = new ModelDb(hierarchy)

    const pipelineContext: PipelineContext = {
      workspace: { uuid: 'test-workspace' as any, url: 'test', dataId: 'test' as any },
      hierarchy,
      modelDb: model,
      branding: null as any,
      adapterManager: {} as any,
      storageAdapter: {} as any,
      contextVars: {},
      lastTx: '',
      lastHash: '',
      broadcastEvent: async (ctx, txes) => {
        for (const tx of txes) {
          tracker.record(tx)
        }
      }
    }

    // Create a mock "next" middleware that just populates the broadcast context
    const nextMiddleware = {
      tx: async (ctx: MeasureContext, tx: Tx[]): Promise<TxMiddlewareResult> => {
        // Just pass through, no-op for tests
        return {}
      },
      handleBroadcast: async (ctx: MeasureContext): Promise<void> => {
        // Simulate what the real middleware does - broadcast the txes
        for (const tx of ctx.contextData.broadcast.txes) {
          tracker.record(tx)
        }
      }
    }

    middleware = (await TxOrderingMiddleware.create()(ctx, pipelineContext, nextMiddleware as any)) as TxOrderingMiddleware
    txFactory = new TxFactory(core.account.System)

    testDoc = {
      _id: generateId<TestDoc>(),
      _class: testDocClass,
      space: 'test:space' as Ref<Space>,
      modifiedOn: 100,
      modifiedBy: core.account.System,
      name: 'Test Document',
      counter: 0
    }
  })

  it('should broadcast transactions in order by modifiedOn', async () => {
    // Create 3 transactions with different modifiedOn times
    const tx1 = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, { counter: 1 })
    tx1.modifiedOn = 101

    const tx2 = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, { counter: 2 })
    tx2.modifiedOn = 102

    const tx3 = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, { counter: 3 })
    tx3.modifiedOn = 103

    // Process transactions in wrong order: tx2, tx1, tx3
    await middleware.tx(ctx as any, [tx2, tx1, tx3])

    // Simulate handleBroadcast calls - tx2 completes first, but should wait for tx1
    // Add txes to broadcast context
    ctx.contextData.broadcast.txes = [tx2, tx1, tx3]

    // Call handleBroadcast - it should wait and reorder
    await middleware.handleBroadcast(ctx as any)

    // Verify they were broadcasted in correct order: 101, 102, 103
    expect(tracker.getOrder()).toEqual([101, 102, 103])
    expect(tracker.broadcasted.length).toBe(3)
  })

  it('should handle multiple documents independently', async () => {
    const testDoc2: TestDoc = {
      _id: generateId<TestDoc>(),
      _class: testDocClass,
      space: 'test:space' as Ref<Space>,
      modifiedOn: 200,
      modifiedBy: core.account.System,
      name: 'Test Document 2',
      counter: 0
    }

    // Create transactions for doc1: out of order
    const tx1Doc1 = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, { counter: 1 })
    tx1Doc1.modifiedOn = 102

    const tx2Doc1 = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, { counter: 2 })
    tx2Doc1.modifiedOn = 101

    // Create transactions for doc2: also out of order
    const tx1Doc2 = txFactory.createTxUpdateDoc(testDocClass, testDoc2.space, testDoc2._id, { counter: 1 })
    tx1Doc2.modifiedOn = 202

    const tx2Doc2 = txFactory.createTxUpdateDoc(testDocClass, testDoc2.space, testDoc2._id, { counter: 2 })
    tx2Doc2.modifiedOn = 201

    // Mix all transactions together
    const txes = [tx1Doc1, tx1Doc2, tx2Doc1, tx2Doc2]
    await middleware.tx(ctx as any, txes)

    // Add to broadcast context
    ctx.contextData.broadcast.txes = txes
    await middleware.handleBroadcast(ctx as any)

    // Each document should have ordered transactions
    const doc1Txes = tracker.broadcasted.filter((tx) => (tx as TxUpdateDoc<Doc>).objectId === testDoc._id)
    const doc2Txes = tracker.broadcasted.filter((tx) => (tx as TxUpdateDoc<Doc>).objectId === testDoc2._id)

    expect(doc1Txes.map((tx) => tx.modifiedOn)).toEqual([101, 102])
    expect(doc2Txes.map((tx) => tx.modifiedOn)).toEqual([201, 202])
  })

  it('should wait for previous transactions to complete', async () => {
    // This test simulates concurrent handleBroadcast calls
    const tx1 = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, { counter: 1 })
    tx1.modifiedOn = 101

    const tx2 = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, { counter: 2 })
    tx2.modifiedOn = 102

    // Record transactions separately to create separate queue entries
    await middleware.tx(ctx as any, [tx1])
    await middleware.tx(ctx as any, [tx2])

    // Simulate tx2's handleBroadcast happening before tx1
    const ctx1 = new MeasureMetricsContext('test', {})
    ctx1.contextData = { broadcast: { txes: [tx1], queue: [], sessions: {} } } as any

    const ctx2 = new MeasureMetricsContext('test', {})
    ctx2.contextData = { broadcast: { txes: [tx2], queue: [], sessions: {} } } as any

    // Start both broadcasts, tx2 first
    const broadcast2 = middleware.handleBroadcast(ctx2 as any)
    const broadcast1 = middleware.handleBroadcast(ctx1 as any)

    // Wait for both to complete
    await Promise.all([broadcast1, broadcast2])

    // Should still be in order: tx1 (101) then tx2 (102)
    expect(tracker.getOrder()).toEqual([101, 102])
  })

  it('should handle rapid sequential transactions', async () => {
    // Create 10 transactions in reverse order
    const txes: Tx[] = []
    for (let i = 10; i > 0; i--) {
      const tx = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, { counter: i })
      tx.modifiedOn = 100 + i
      txes.push(tx)
    }

    await middleware.tx(ctx as any, txes)

    ctx.contextData.broadcast.txes = txes
    await middleware.handleBroadcast(ctx as any)

    // Should be in ascending order
    const order = tracker.getOrder()
    expect(order).toEqual([101, 102, 103, 104, 105, 106, 107, 108, 109, 110])
  })

  it('should track statistics correctly', async () => {
    const tx1 = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, { counter: 1 })
    tx1.modifiedOn = 101

    const tx2 = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, { counter: 2 })
    tx2.modifiedOn = 102

    await middleware.tx(ctx as any, [tx1, tx2])

    // After broadcast, transactions should be removed from queue
    ctx.contextData.broadcast.txes = [tx1, tx2]
    await middleware.handleBroadcast(ctx as any)
  })

  it('should handle already ordered transactions efficiently', async () => {
    // Create transactions already in order
    const tx1 = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, { counter: 1 })
    tx1.modifiedOn = 101

    const tx2 = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, { counter: 2 })
    tx2.modifiedOn = 102

    const tx3 = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, { counter: 3 })
    tx3.modifiedOn = 103

    await middleware.tx(ctx as any, [tx1, tx2, tx3])

    ctx.contextData.broadcast.txes = [tx1, tx2, tx3]
    await middleware.handleBroadcast(ctx as any)

    // Should maintain order
    expect(tracker.getOrder()).toEqual([101, 102, 103])
  })
})

/**
 * Integration test with mocked pipeline context
 */
describe('TxOrderingMiddleware Integration', () => {
  it('should work with provideTx flow', async () => {
    const ctx = new MeasureMetricsContext('test', {})
    ctx.contextData = { broadcast: { txes: [], queue: [], sessions: {} } } as any

    const hierarchy = new Hierarchy()
    const model = new ModelDb(hierarchy)
    const broadcasted: Tx[] = []

    // Create middleware with next middleware mock
    const nextMiddleware = {
      tx: async (ctx: MeasureContext, tx: Tx[]): Promise<TxMiddlewareResult> => {
        return {}
      },
      handleBroadcast: async (ctx: MeasureContext): Promise<void> => {
        // Simulate broadcast
        for (const tx of ctx.contextData.broadcast.txes) {
          broadcasted.push(tx)
        }
      }
    }

    const pipelineContext: PipelineContext = {
      workspace: { uuid: 'test-workspace' as any, url: 'test', dataId: 'test' as any },
      hierarchy,
      modelDb: model,
      branding: null as any,
      adapterManager: {} as any,
      storageAdapter: {} as any,
      contextVars: {},
      lastTx: '',
      lastHash: '',
      broadcastEvent: async (ctx, txes) => {}
    }

    const middleware = (await TxOrderingMiddleware.create()(
      ctx,
      pipelineContext,
      nextMiddleware as any
    )) as TxOrderingMiddleware
    const txFactory = new TxFactory(core.account.System)

    const docId = generateId()
    const tx1 = txFactory.createTxUpdateDoc('test:class' as any, 'test:space' as any, docId as any, {} as any)
    tx1.modifiedOn = 102

    const tx2 = txFactory.createTxUpdateDoc('test:class' as any, 'test:space' as any, docId as any, {} as any)
    tx2.modifiedOn = 101

    // Process out-of-order
    await middleware.tx(ctx as any, [tx1, tx2])

    // Add to broadcast and call handleBroadcast
    ;(ctx.contextData as any).broadcast.txes = [tx1, tx2]
    await middleware.handleBroadcast(ctx as any)

    // Verify ordered broadcast
    expect(broadcasted.map((tx) => tx.modifiedOn)).toEqual([101, 102])
  })
})
