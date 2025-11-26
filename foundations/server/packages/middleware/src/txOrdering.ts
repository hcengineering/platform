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
  completionPromise: Promise<void>
  completionResolve: () => void
}

/**
 * @public
 *
 * TxOrderingMiddleware ensures that transactions for the same document
 * are processed sequentially by waiting in the tx() method.
 *
 * This prevents race conditions on the client side when transactions
 * arrive out of order (e.g., tx1 with modifiedOn=101 arrives after
 * tx2 with modifiedOn=102), which would cause unnecessary getCurrentDoc calls.
 *
 * How it works:
 * 1. In tx(): Wait for previous transaction for the same document to complete before proceeding
 * 2. After processing completes (after provideTx returns), mark the transaction as complete
 * 3. In handleBroadcast(): Simply pass through since ordering is already guaranteed
 */
export class TxOrderingMiddleware extends BaseMiddleware implements Middleware {
  // Track transactions order per document: Map<docId, TxOrderEntry>
  // Only stores the last pending transaction per document
  private readonly docTxQueue = new Map<Ref<Doc>, TxOrderEntry>()

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

    // For each document, wait for previous transaction to complete
    const waitPromises: Promise<void>[] = []
    const currentEntries = new Map<Ref<Doc>, TxOrderEntry>()

    for (const [docId, docTxes] of txesByDoc) {
      // Get the previous entry for this document if it exists
      const prevEntry = this.docTxQueue.get(docId)
      if (prevEntry !== undefined) {
        // Wait for the previous transaction to complete
        waitPromises.push(prevEntry.completionPromise)
      }

      // Create a new entry for this batch
      let completionResolve: () => void = () => {}
      const completionPromise = new Promise<void>((resolve) => {
        completionResolve = resolve
      })

      const minModifiedOn = Math.min(...docTxes.map((tx) => tx.modifiedOn))

      const entry: TxOrderEntry = {
        txIds: docTxes.map((tx) => tx._id),
        modifiedOn: minModifiedOn,
        completionPromise,
        completionResolve
      }

      currentEntries.set(docId, entry)
      this.docTxQueue.set(docId, entry)
    }

    // Wait for all previous transactions to complete
    if (waitPromises.length > 0) {
      await Promise.all(waitPromises)
    }

    try {
      // Process the transactions
      const result = await this.provideTx(ctx, txes)
      return result
    } finally {
      // Always mark entries as complete and clean up, even if there's an exception
      // This ensures waiting transactions don't get stuck
      for (const entry of currentEntries.values()) {
        entry.completionResolve()
      }

      // Clean up completed entries
      for (const [docId, entry] of currentEntries) {
        // Remove from queue if this is still the current entry
        if (this.docTxQueue.get(docId) === entry) {
          this.docTxQueue.delete(docId)
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
