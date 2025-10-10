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
 * Test to verify the race condition hypothesis in LiveQuery
 *
 * Hypothesis: when two change transactions {$inc: {messages: 1}} or {$inc: {transcription: 1}}
 * arrive with times t1=101 and t2=102, but tx1 takes longer to process and arrives to the client later,
 * then when processing tx1, the condition `updatedDoc.modifiedOn < tx.modifiedOn` is not met
 * and an unnecessary getCurrentDoc request is made to the server.
 *
 * Scenario:
 * 1. tx1 (t=101) is sent first but takes longer to process
 * 2. tx2 (t=102) is sent second but arrives to the client first
 * 3. Client processes tx2, updates document with modifiedOn=102
 * 4. Client receives tx1 with modifiedOn=101
 * 5. Condition updatedDoc.modifiedOn (102) < tx.modifiedOn (101) = false
 * 6. getCurrentDoc is triggered, leading to an unnecessary request
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
import {
  BaseMiddleware,
  type Middleware,
  type PipelineContext,
  type TxMiddlewareResult
} from '@hcengineering/server-core'
import { TxOrderingMiddleware } from '../txOrdering'

/**
 * Mock document for testing (similar to MeetingMinutes)
 */
interface TestDoc extends Doc {
  name: string
  messages: number
  transcription: number
}

const testDocClass = 'test:class:TestDoc' as Ref<Class<TestDoc>>

/**
 * Counter to track getCurrentDoc (findAll) calls
 */
class FindAllCounter {
  count: number = 0
  queries: Array<{ _class: Ref<Class<Doc>>, docId: Ref<Doc> }> = []

  reset (): void {
    this.count = 0
    this.queries = []
  }

  recordQuery (_class: Ref<Class<Doc>>, docId: Ref<Doc>): void {
    this.count++
    this.queries.push({ _class, docId })
  }
}

/**
 * Test middleware to simulate LiveQuery behavior
 */
class TestLiveQueryMiddleware extends BaseMiddleware implements Middleware {
  private readonly documents = new Map<Ref<Doc>, Doc>()
  private readonly txQueue: Array<{ tx: TxUpdateDoc<Doc>, delay: number }> = []
  private readonly findAllCounter: FindAllCounter

  constructor (context: PipelineContext, findAllCounter: FindAllCounter, next?: Middleware) {
    super(context, next)
    this.findAllCounter = findAllCounter
  }

  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    findAllCounter: FindAllCounter,
    next?: Middleware
  ): Promise<TestLiveQueryMiddleware> {
    return new TestLiveQueryMiddleware(context, findAllCounter, next)
  }

  // Create document in "database"
  async createDoc (doc: Doc): Promise<void> {
    this.documents.set(doc._id, doc)
  }

  // Simulate getCurrentDoc - fetching document from server
  async getCurrentDoc (_class: Ref<Class<Doc>>, docId: Ref<Doc>): Promise<Doc | undefined> {
    this.findAllCounter.recordQuery(_class, docId)
    return this.documents.get(docId)
  }

  // Apply transaction to local document copy
  async applyTxToLocalDoc (tx: TxUpdateDoc<Doc>): Promise<boolean> {
    const doc = this.documents.get(tx.objectId) as any
    if (doc === undefined) {
      return false
    }

    // Simulate LiveQuery logic:
    // If document's modifiedOn >= transaction's modifiedOn, do refresh
    if (doc.modifiedOn >= tx.modifiedOn) {
      // This is the race condition! Need to do getCurrentDoc
      const refreshed = await this.getCurrentDoc(tx.objectClass, tx.objectId)
      if (refreshed !== undefined) {
        this.documents.set(tx.objectId, refreshed)
      }
      return true // Refresh was performed
    }

    // Normal path - just apply operations
    const operations = tx.operations as any

    // Handle $inc operation
    if (operations.$inc !== undefined) {
      for (const [key, value] of Object.entries(operations.$inc)) {
        const currentValue = doc[key]
        doc[key] = (typeof currentValue === 'number' ? currentValue : 0) + (value as number)
      }
    }

    // Handle regular operations
    for (const [key, value] of Object.entries(operations)) {
      if (key !== '$inc') {
        doc[key] = value
      }
    }

    doc.modifiedOn = tx.modifiedOn
    doc.modifiedBy = tx.modifiedBy

    return false // Refresh was not needed
  }

  override async tx (ctx: MeasureContext, txes: any[]): Promise<TxMiddlewareResult> {
    // Just pass through
    return await this.provideTx(ctx, txes)
  }
}

describe('LiveQuery Race Condition Tests', () => {
  let ctx: MeasureContext
  let findAllCounter: FindAllCounter
  let middleware: TestLiveQueryMiddleware
  let txFactory: TxFactory
  let testDoc: TestDoc

  beforeEach(async () => {
    ctx = new MeasureMetricsContext('test', {})
    findAllCounter = new FindAllCounter()

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
      lastHash: ''
    }

    middleware = await TestLiveQueryMiddleware.create(ctx, pipelineContext, findAllCounter)
    txFactory = new TxFactory(core.account.System)

    // Create test document
    testDoc = {
      _id: generateId<TestDoc>(),
      _class: testDocClass,
      space: 'test:space' as Ref<Space>,
      modifiedOn: 100,
      modifiedBy: core.account.System,
      name: 'Test Meeting',
      messages: 0,
      transcription: 0
    }

    await middleware.createDoc(testDoc)
  })

  it('should detect race condition with out-of-order transactions', async () => {
    // Create two transactions that will arrive in wrong order
    const tx1: TxUpdateDoc<TestDoc> = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, {
      messages: testDoc.messages + 1
    })
    tx1.modifiedOn = 101
    // Add $inc to simulate real operations
    ;(tx1.operations as any) = { $inc: { messages: 1 } }

    const tx2: TxUpdateDoc<TestDoc> = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, {
      transcription: testDoc.transcription + 1
    })
    tx2.modifiedOn = 102
    ;(tx2.operations as any) = { $inc: { transcription: 1 } }

    // Reset counter
    findAllCounter.reset()

    // Scenario 1: Normal order (tx1 -> tx2)
    // Expect 0 additional requests
    await middleware.applyTxToLocalDoc(tx1)
    await middleware.applyTxToLocalDoc(tx2)

    expect(findAllCounter.count).toBe(0)
    expect((middleware as any).documents.get(testDoc._id).modifiedOn).toBe(102)
    expect((middleware as any).documents.get(testDoc._id).messages).toBe(1)
    expect((middleware as any).documents.get(testDoc._id).transcription).toBe(1)

    // Reset for second test
    findAllCounter.reset()
    // Recreate document with initial values
    testDoc.messages = 0
    testDoc.transcription = 0
    testDoc.modifiedOn = 100
    await middleware.createDoc(testDoc)

    // Scenario 2: Wrong order (tx2 -> tx1) - RACE CONDITION
    // tx2 arrives first and updates document with modifiedOn=102
    const needsRefresh2 = await middleware.applyTxToLocalDoc(tx2)
    expect(needsRefresh2).toBe(false)
    expect((middleware as any).documents.get(testDoc._id).modifiedOn).toBe(102)

    // tx1 arrives second with modifiedOn=101 < 102
    // Race condition should be detected and getCurrentDoc should be called
    const needsRefresh1 = await middleware.applyTxToLocalDoc(tx1)
    expect(needsRefresh1).toBe(true)

    // Verify that an additional getCurrentDoc request was made
    expect(findAllCounter.count).toBe(1)
    expect(findAllCounter.queries[0]._class).toBe(testDocClass)
    expect(findAllCounter.queries[0].docId).toBe(testDoc._id)
  })

  it('should detect race condition with multiple transactions', async () => {
    // Simulate scenario with multiple updates
    const transactions: TxUpdateDoc<TestDoc>[] = []

    // Create 5 transactions with increasing times
    for (let i = 0; i < 5; i++) {
      const tx = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, {
        messages: testDoc.messages + i + 1
      })
      tx.modifiedOn = 101 + i
      ;(tx.operations as any) = { $inc: { messages: 1 } }
      transactions.push(tx)
    }

    findAllCounter.reset()

    // Apply in order: tx[2], tx[4], tx[0], tx[3], tx[1]
    // This should trigger race conditions
    const outOfOrderIndices = [2, 4, 0, 3, 1]

    for (const idx of outOfOrderIndices) {
      await middleware.applyTxToLocalDoc(transactions[idx])
    }

    // Should have several additional getCurrentDoc requests
    // tx[2] (103) - ok, first
    // tx[4] (105) - ok, 105 > 103
    // tx[0] (101) - RACE! 101 < 105 -> getCurrentDoc
    // tx[3] (104) - RACE! 104 < 105 -> getCurrentDoc
    // tx[1] (102) - RACE! 102 < 105 -> getCurrentDoc
    expect(findAllCounter.count).toBeGreaterThan(0)
    console.log('Number of additional getCurrentDoc requests:', findAllCounter.count)
    console.log('Request details:', findAllCounter.queries)
  })

  it('should correctly handle parallel increments in correct order', async () => {
    // Test to confirm that everything works in correct order
    findAllCounter.reset()

    // Recreate document
    testDoc.messages = 0
    testDoc.modifiedOn = 100
    await middleware.createDoc(testDoc)

    // 10 transactions in correct order
    for (let i = 0; i < 10; i++) {
      const tx = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, {
        messages: testDoc.messages + i + 1
      })
      tx.modifiedOn = 101 + i
      ;(tx.operations as any) = { $inc: { messages: 1 } }
      await middleware.applyTxToLocalDoc(tx)
    }

    // Should not have additional requests
    expect(findAllCounter.count).toBe(0)
    expect((middleware as any).documents.get(testDoc._id).messages).toBe(10)
  })
})

/**
 * Tests with TxOrderingMiddleware - demonstrating the solution
 */
describe('LiveQuery with TxOrderingMiddleware - Solution', () => {
  let ctx: MeasureContext
  let findAllCounter: FindAllCounter
  let liveQueryMiddleware: TestLiveQueryMiddleware
  let orderingMiddleware: TxOrderingMiddleware
  let txFactory: TxFactory
  let testDoc: TestDoc
  let pipelineContext: PipelineContext

  beforeEach(async () => {
    ctx = new MeasureMetricsContext('test', {})
    ctx.contextData = {
      broadcast: {
        txes: [],
        queue: [],
        sessions: {}
      }
    } as any

    findAllCounter = new FindAllCounter()

    const hierarchy = new Hierarchy()
    const model = new ModelDb(hierarchy)

    pipelineContext = {
      workspace: { uuid: 'test-workspace' as any, url: 'test', dataId: 'test' as any },
      hierarchy,
      modelDb: model,
      branding: null as any,
      adapterManager: {} as any,
      storageAdapter: {} as any,
      contextVars: {},
      lastTx: '',
      lastHash: ''
    }

    // Create middleware chain: TxOrderingMiddleware -> TestLiveQueryMiddleware
    liveQueryMiddleware = await TestLiveQueryMiddleware.create(ctx, pipelineContext, findAllCounter)
    orderingMiddleware = (await TxOrderingMiddleware.create()(
      ctx,
      pipelineContext,
      liveQueryMiddleware
    )) as TxOrderingMiddleware

    txFactory = new TxFactory(core.account.System)

    // Create test document
    testDoc = {
      _id: generateId<TestDoc>(),
      _class: testDocClass,
      space: 'test:space' as Ref<Space>,
      modifiedOn: 100,
      modifiedBy: core.account.System,
      name: 'Test Meeting',
      messages: 0,
      transcription: 0
    }

    await liveQueryMiddleware.createDoc(testDoc)
  })

  it('should prevent race condition using TxOrderingMiddleware', async () => {
    // Create two transactions
    const tx1: TxUpdateDoc<TestDoc> = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, {
      messages: testDoc.messages + 1
    })
    tx1.modifiedOn = 101
    ;(tx1.operations as any) = { $inc: { messages: 1 } }

    const tx2: TxUpdateDoc<TestDoc> = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, {
      transcription: testDoc.transcription + 1
    })
    tx2.modifiedOn = 102
    ;(tx2.operations as any) = { $inc: { transcription: 1 } }

    findAllCounter.reset()

    // Create a mock next middleware that applies txes
    const appliedOrder: number[] = []
    const mockNext = {
      tx: async (ctx: MeasureContext, txes: Tx[]): Promise<TxMiddlewareResult> => {
        return {}
      },
      handleBroadcast: async (ctx: MeasureContext): Promise<void> => {
        for (const tx of ctx.contextData.broadcast.txes) {
          appliedOrder.push(tx.modifiedOn)
          await liveQueryMiddleware.applyTxToLocalDoc(tx as TxUpdateDoc<Doc>)
        }
      }
    }

    // Recreate ordering middleware with the mock
    orderingMiddleware = (await TxOrderingMiddleware.create()(
      ctx,
      pipelineContext,
      mockNext as any
    )) as TxOrderingMiddleware

    // Register transactions - first tx1, then tx2 (correct order by modifiedOn)
    await orderingMiddleware.tx(ctx as any, [tx1])
    await orderingMiddleware.tx(ctx as any, [tx2])

    // Simulate tx2 broadcast trying to happen first
    const ctx2 = new MeasureMetricsContext('test', {})
    ctx2.contextData = { broadcast: { txes: [tx2], queue: [], sessions: {} } } as any

    const ctx1 = new MeasureMetricsContext('test', {})
    ctx1.contextData = { broadcast: { txes: [tx1], queue: [], sessions: {} } } as any

    // Start broadcast2 first, but it should wait for broadcast1
    const promise2 = orderingMiddleware.handleBroadcast(ctx2 as any)
    // Give it time to start and block
    await new Promise((resolve) => setTimeout(resolve, 10))
    const promise1 = orderingMiddleware.handleBroadcast(ctx1 as any)

    await Promise.all([promise1, promise2])

    // Check that transactions were applied in correct order (101 before 102)
    expect(appliedOrder).toEqual([101, 102])

    // Thanks to TxOrderingMiddleware, transactions are applied in correct order
    // and there should be NO additional getCurrentDoc requests
    expect(findAllCounter.count).toBe(0)
    expect((liveQueryMiddleware as any).documents.get(testDoc._id).modifiedOn).toBe(102)
    expect((liveQueryMiddleware as any).documents.get(testDoc._id).messages).toBe(1)
    expect((liveQueryMiddleware as any).documents.get(testDoc._id).transcription).toBe(1)
  })

  it('should handle multiple out-of-order transactions without race condition', async () => {
    const transactions: TxUpdateDoc<TestDoc>[] = []

    // Create 3 transactions (fewer for a simpler test)
    for (let i = 0; i < 3; i++) {
      const tx = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, {
        messages: testDoc.messages + i + 1
      })
      tx.modifiedOn = 101 + i
      ;(tx.operations as any) = { $inc: { messages: 1 } }
      transactions.push(tx)
    }

    findAllCounter.reset()

    // Track order of application
    const appliedOrder: number[] = []

    // Create a mock next middleware that applies txes in order
    const mockNext = {
      tx: async (ctx: MeasureContext, txes: Tx[]): Promise<TxMiddlewareResult> => {
        return {}
      },
      handleBroadcast: async (ctx: MeasureContext): Promise<void> => {
        for (const tx of ctx.contextData.broadcast.txes) {
          appliedOrder.push(tx.modifiedOn)
          await liveQueryMiddleware.applyTxToLocalDoc(tx as TxUpdateDoc<Doc>)
        }
      }
    }

    // Recreate ordering middleware with the mock
    orderingMiddleware = (await TxOrderingMiddleware.create()(
      ctx,
      pipelineContext,
      mockNext as any
    )) as TxOrderingMiddleware

    // Register all transactions separately in correct order
    for (const tx of transactions) {
      await orderingMiddleware.tx(ctx as any, [tx])
    }

    // Simulate broadcast for tx[2] first, then tx[0], then tx[1]
    // tx[2] should wait for both tx[0] and tx[1]
    const ctx2 = new MeasureMetricsContext('test', {})
    ctx2.contextData = { broadcast: { txes: [transactions[2]], queue: [], sessions: {} } } as any

    const ctx0 = new MeasureMetricsContext('test', {})
    ctx0.contextData = { broadcast: { txes: [transactions[0]], queue: [], sessions: {} } } as any

    const ctx1 = new MeasureMetricsContext('test', {})
    ctx1.contextData = { broadcast: { txes: [transactions[1]], queue: [], sessions: {} } } as any

    // Start tx[2] broadcast first (it will wait)
    const promise2 = orderingMiddleware.handleBroadcast(ctx2 as any)
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Then start tx[0] and tx[1]
    const promise0 = orderingMiddleware.handleBroadcast(ctx0 as any)
    await new Promise((resolve) => setTimeout(resolve, 10))
    const promise1 = orderingMiddleware.handleBroadcast(ctx1 as any)

    await Promise.all([promise0, promise1, promise2])

    // Check application order - should be 101, 102, 103 despite broadcast order
    expect(appliedOrder).toEqual([101, 102, 103])

    // Thanks to the middleware, all transactions are applied in correct order
    // and there are NO additional getCurrentDoc requests
    expect(findAllCounter.count).toBe(0)
    expect((liveQueryMiddleware as any).documents.get(testDoc._id).messages).toBe(3)
    expect((liveQueryMiddleware as any).documents.get(testDoc._id).modifiedOn).toBe(103)
  })

  it('should correctly handle transaction batches', async () => {
    // Create two batches of transactions
    const batch1: TxUpdateDoc<TestDoc>[] = []
    const batch2: TxUpdateDoc<TestDoc>[] = []

    // Batch 1: txes with modifiedOn 101, 102
    for (let i = 0; i < 2; i++) {
      const tx = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, {
        messages: testDoc.messages + i + 1
      })
      tx.modifiedOn = 101 + i
      ;(tx.operations as any) = { $inc: { messages: 1 } }
      batch1.push(tx)
    }

    // Batch 2: txes with modifiedOn 103, 104
    for (let i = 0; i < 2; i++) {
      const tx = txFactory.createTxUpdateDoc(testDocClass, testDoc.space, testDoc._id, {
        messages: testDoc.messages + i + 3
      })
      tx.modifiedOn = 103 + i
      ;(tx.operations as any) = { $inc: { messages: 1 } }
      batch2.push(tx)
    }

    findAllCounter.reset()

    const appliedOrder: number[] = []

    // Create a mock next middleware that applies txes
    const mockNext = {
      tx: async (ctx: MeasureContext, txes: Tx[]): Promise<TxMiddlewareResult> => {
        return {}
      },
      handleBroadcast: async (ctx: MeasureContext): Promise<void> => {
        for (const tx of ctx.contextData.broadcast.txes) {
          appliedOrder.push(tx.modifiedOn)
          await liveQueryMiddleware.applyTxToLocalDoc(tx as TxUpdateDoc<Doc>)
        }
      }
    }

    // Recreate ordering middleware with the mock
    orderingMiddleware = (await TxOrderingMiddleware.create()(
      ctx,
      pipelineContext,
      mockNext as any
    )) as TxOrderingMiddleware

    // Register batches - this creates one promise per batch
    await orderingMiddleware.tx(ctx as any, batch1)
    await orderingMiddleware.tx(ctx as any, batch2)

    // Try to broadcast batch2 first
    const ctx2 = new MeasureMetricsContext('test', {})
    ctx2.contextData = { broadcast: { txes: batch2, queue: [], sessions: {} } } as any

    const ctx1 = new MeasureMetricsContext('test', {})
    ctx1.contextData = { broadcast: { txes: batch1, queue: [], sessions: {} } } as any

    // Start broadcasts - batch2 tries to go first, but should wait for batch1
    const broadcast2 = orderingMiddleware.handleBroadcast(ctx2 as any)
    await new Promise((resolve) => setTimeout(resolve, 10))
    const broadcast1 = orderingMiddleware.handleBroadcast(ctx1 as any)

    await Promise.all([broadcast1, broadcast2])

    // Check that batch1 was applied before batch2
    expect(appliedOrder).toEqual([101, 102, 103, 104])

    // Verify that everything was applied in correct order without extra requests
    expect(findAllCounter.count).toBe(0)
    expect((liveQueryMiddleware as any).documents.get(testDoc._id).messages).toBe(4)
    expect((liveQueryMiddleware as any).documents.get(testDoc._id).modifiedOn).toBe(104)
  })
})

/**
 * Results of executing this test will confirm or refute the hypothesis.
 *
 * Expected result:
 * - The test "should detect race condition with out-of-order transactions" should show
 *   that when transactions are received in incorrect order, an additional getCurrentDoc call occurs
 *
 * If the hypothesis is confirmed, this proves the existence of the problem and the need for a solution.
 *
 * Solution:
 * - New tests with TxOrderingMiddleware demonstrate that the middleware successfully prevents
 *   race conditions by ensuring correct ordering of transaction broadcasts.
 */
