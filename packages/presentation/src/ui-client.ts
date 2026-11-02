//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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

import { Analytics } from '@hcengineering/analytics'
import core, { AccountRole, getCurrentAccount, hasAccountRole, TxOperations, TxProcessor } from '@hcengineering/core'
import type {
  Class,
  Client,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Ref,
  Tx,
  TxApplyIf,
  TxCUD,
  TxResult,
  WithLookup
} from '@hcengineering/core'
import type { LiveQuery } from '@hcengineering/query'
import { get, writable } from 'svelte/store'
import type { PresentationPipeline } from './pipeline'
import plugin from './plugin'

export const pendingCreatedDocs = writable<Record<Ref<Doc>, boolean>>({})

function reportError (error: unknown): void {
  Analytics.handleError(error instanceof Error ? error : new Error(String(error)))
}

export class UIClient extends TxOperations implements Client {
  protected pendingTxes = new Set<Ref<Tx>>()

  constructor (
    private readonly pipeline: PresentationPipeline,
    private readonly liveQuery: LiveQuery,
    private readonly rawLiveQuery: LiveQuery,
    private readonly notifyListeners: (txes: Tx[]) => void
  ) {
    super(pipeline, getCurrentAccount().primarySocialId)
  }

  private unwrap (tx: Tx): Array<TxCUD<Doc>> {
    if (tx._class === core.class.TxApplyIf) return (tx as TxApplyIf).txes.flatMap((child) => this.unwrap(child))
    return TxProcessor.isExtendsCUD(tx._class) ? [tx as TxCUD<Doc>] : []
  }

  private clearPending (txes: Tx[]): void {
    const pending = get(pendingCreatedDocs)
    let changed = false
    for (const tx of txes.flatMap((tx) => this.unwrap(tx))) {
      if (!this.pendingTxes.delete(tx._id)) continue
      if (tx._class === core.class.TxCreateDoc) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete pending[tx.objectId]
        changed = true
      }
    }
    if (changed) pendingCreatedDocs.set(pending)
  }

  async doNotify (...txes: Tx[]): Promise<void> {
    this.clearPending(txes)
    await this.provideNotify(...txes)
  }

  private async provideNotify (...txes: Tx[]): Promise<void> {
    try {
      await this.pipeline.notifyTx(...txes)
      await this.liveQuery.tx(...txes)
      await this.rawLiveQuery.tx(...txes)
      this.notifyListeners(txes)
    } catch (error: unknown) {
      reportError(error)
    }
  }

  override async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.liveQuery.findAll(_class, query, options)
  }

  override async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return await this.liveQuery.findOne(_class, query, options)
  }

  override async tx (tx: Tx): Promise<TxResult> {
    const early = this.notifyEarly(tx).catch(reportError)
    let result: TxResult
    try {
      result = await this.pipeline.tx(tx)
    } catch (error: unknown) {
      await this.restore(tx, early)
      throw error
    }
    if ('success' in result && result.success === false) await this.restore(tx, early)
    return result
  }

  private async restore (tx: Tx, early: Promise<void>): Promise<void> {
    // Wait for optimistic notifications before replacing their cached results.
    await early
    this.clearPending([tx])
    const results = await Promise.allSettled([
      this.liveQuery.refreshTransactions(tx),
      this.rawLiveQuery.refreshTransactions(tx)
    ])
    for (const result of results) {
      if (result.status === 'rejected') reportError(result.reason)
    }
  }

  private async notifyEarly (tx: Tx): Promise<void> {
    if (!hasAccountRole(getCurrentAccount(), AccountRole.User)) return
    if (tx._class === core.class.TxApplyIf) {
      const applyTx = tx as TxApplyIf
      if ((applyTx.match?.length ?? 0) !== 0 || (applyTx.notMatch?.length ?? 0) !== 0) return
      await Promise.all(
        applyTx.txes.map(async (child) => {
          await this.notifyEarly(child)
        })
      )
      return
    }
    if (!TxProcessor.isExtendsCUD(tx._class)) return
    const innerTx = tx as TxCUD<Doc>
    const instant = this.getHierarchy().classHierarchyMixin(innerTx.objectClass, plugin.mixin.InstantTransactions)
    if (instant?.txClasses.includes(innerTx._class) !== true) return
    if (innerTx._class === core.class.TxCreateDoc) {
      const pending = get(pendingCreatedDocs)
      pending[innerTx.objectId] = true
      pendingCreatedDocs.set(pending)
    }
    this.pendingTxes.add(tx._id)
    await this.provideNotify(tx)
  }
}
