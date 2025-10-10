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

import {
  TxProcessor,
  type Doc,
  type MeasureContext,
  type Ref,
  type SessionData,
  type Tx,
  type TxCUD
} from '@hcengineering/core'
import { BaseMiddleware } from '@hcengineering/server-core'
import type { Middleware, MiddlewareCreator, TxMiddlewareResult } from '@hcengineering/server-core'

interface TxOrderEntry {
  txIds: string[] // All transaction IDs in this batch
  modifiedOn: number
  broadcastPromise?: Promise<void>
  broadcastResolve?: () => void
}

/**
 * @public
 *
 * TxOrderingMiddleware ensures that transactions for the same document
 * are broadcasted in the order they were received on the server (by modifiedOn timestamp).
 *
 * This prevents race conditions on the client side when transactions
 * arrive out of order (e.g., tx1 with modifiedOn=101 arrives after
 * tx2 with modifiedOn=102), which would cause unnecessary getCurrentDoc calls.
 *
 * How it works:
 * 1. In tx(): Record transaction order and create a promise for each transaction
 * 2. In handleBroadcast(): Wait for all previous transactions to complete broadcasting before proceeding
 */
export class TxOrderingMiddleware extends BaseMiddleware implements Middleware {
  // Track transactions order per document: Map<docId, TxOrderEntry[]>
  private readonly docTxQueue = new Map<Ref<Doc>, TxOrderEntry[]>()

  static create (): MiddlewareCreator {
    return async (ctx, context, next) => new TxOrderingMiddleware(context, next)
  }

  override async tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    // Group transactions by document ID
    const txesByDoc = new Map<Ref<Doc>, Tx[]>()

    for (const tx of txes) {
      const docId = this.getTargetDocId(tx)
      if (docId !== undefined) {
        let docTxes = txesByDoc.get(docId)
        if (docTxes === undefined) {
          docTxes = []
          txesByDoc.set(docId, docTxes)
        }
        docTxes.push(tx)
      }
    }

    // Create one promise per document (covering all its transactions in this batch)
    for (const [docId, docTxes] of txesByDoc) {
      let queue = this.docTxQueue.get(docId)
      if (queue === undefined) {
        queue = []
        this.docTxQueue.set(docId, queue)
      }

      // Create a single promise for all transactions in this batch for this document
      let broadcastResolve: (() => void) | undefined
      const broadcastPromise = new Promise<void>((resolve) => {
        broadcastResolve = resolve
      })

      // Use the earliest modifiedOn from this batch
      const minModifiedOn = Math.min(...docTxes.map(tx => tx.modifiedOn))

      const entry: TxOrderEntry = {
        txIds: docTxes.map(tx => tx._id),
        modifiedOn: minModifiedOn,
        broadcastPromise,
        broadcastResolve
      }

      queue.push(entry)
    }

    // Pass through to next middleware
    return await this.provideTx(ctx, txes)
  }

  override async handleBroadcast (ctx: MeasureContext<SessionData>): Promise<void> {
    // Get all transactions that need to be broadcasted
    const txes = ctx.contextData.broadcast.txes
    if (txes.length === 0) {
      return
    }

    // Sort transactions by modifiedOn to ensure correct order
    txes.sort((a, b) => a.modifiedOn - b.modifiedOn)

    // Collect all transaction IDs in this broadcast
    const txIdSet = new Set<string>(txes.map(tx => tx._id))

    // For each document, find if any of its transactions are in this broadcast
    // and wait for all previous batches to complete
    const waitPromises: Promise<void>[] = []
    const affectedDocs = new Map<Ref<Doc>, number>() // docId -> index of batch being broadcasted

    for (const tx of txes) {
      const docId = this.getTargetDocId(tx)
      if (docId === undefined || affectedDocs.has(docId)) continue

      const queue = this.docTxQueue.get(docId)
      if (queue === undefined) continue

      // Find the batch that contains this transaction
      const batchIndex = queue.findIndex(entry => entry.txIds.some(id => txIdSet.has(id)))
      if (batchIndex === -1) continue

      affectedDocs.set(docId, batchIndex)

      // Wait for all previous batches for this document to complete broadcasting
      for (let i = 0; i < batchIndex; i++) {
        const prevEntry = queue[i]
        if (prevEntry.broadcastPromise !== undefined) {
          waitPromises.push(prevEntry.broadcastPromise)
        }
      }
    }

    // Wait for all previous broadcasts to complete
    if (waitPromises.length > 0) {
      await Promise.all(waitPromises)
    }

    // Now perform the actual broadcast
    await this.next?.handleBroadcast(ctx)

    // Mark these batches as broadcasted by resolving their promises
    for (const [docId, batchIndex] of affectedDocs) {
      const queue = this.docTxQueue.get(docId)
      if (queue === undefined) continue

      if (batchIndex < queue.length) {
        const entry = queue[batchIndex]
        if (entry.broadcastResolve !== undefined) {
          entry.broadcastResolve()
        }
        // Remove this entry from the queue
        queue.splice(batchIndex, 1)
      }
    }

    // Clean up empty queues and old transactions to prevent memory leaks
    for (const [docId, queue] of this.docTxQueue.entries()) {
      if (queue.length === 0) {
        this.docTxQueue.delete(docId)
      } else if (queue.length > 1000) {
        // Keep only last 1000 batches per document
        const toRemove = queue.splice(0, queue.length - 1000)
        // Resolve any promises that weren't resolved yet (shouldn't happen but safety)
        for (const entry of toRemove) {
          if (entry.broadcastResolve !== undefined) {
            entry.broadcastResolve()
          }
        }
      }
    }
  }

  /**
   * Extract target document ID from transaction
   */
  private getTargetDocId (tx: Tx): Ref<Doc> | undefined {
    if (TxProcessor.isExtendsCUD(tx._class)) {
      return (tx as TxCUD<Doc>).objectId
    }
    return undefined
  }
}
