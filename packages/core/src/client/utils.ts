//
// Copyright © 2025 Anticrm Platform Contributors.
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

import { Analytics } from '@hcengineering/analytics'
import { DOMAIN_MODEL, Doc } from '../classes'
import core from '../component'
import { Hierarchy } from '../hierarchy'
import { MeasureContext } from '../measurements'
import { ModelDb } from '../memdb'
import { Tx, TxCUD, TxProcessor } from '../tx'
import { platformNow, platformNowDiff } from '../utils'
import type { ClientConnection, ModelFilter, TxPersistenceStore } from './types'

export function isModelDomain (tx: Tx, h: Hierarchy): boolean {
  return TxProcessor.isExtendsCUD(tx._class) ? h.findDomain((tx as TxCUD<Doc>).objectClass) === DOMAIN_MODEL : false
}

// Ignore Employee accounts.
// We may still have them in transactions in old workspaces even with global accounts.
export function isPersonAccount (tx: Tx): boolean {
  return (
    (tx._class === core.class.TxCreateDoc ||
      tx._class === core.class.TxUpdateDoc ||
      tx._class === core.class.TxRemoveDoc) &&
    ((tx as TxCUD<Doc>).objectClass === 'contact:class:PersonAccount' ||
      (tx as TxCUD<Doc>).objectClass === 'core:class:Account')
  )
}

export async function loadModel (
  ctx: MeasureContext,
  conn: ClientConnection,
  persistence?: TxPersistenceStore
): Promise<{ mode: 'same' | 'addition' | 'upgrade', current: Tx[], addition: Tx[] }> {
  const t = platformNow()

  const current = (await ctx.with('persistence-load', {}, () => persistence?.load())) ?? {
    full: true,
    transactions: [],
    hash: ''
  }

  if (conn.getLastHash !== undefined) {
    const account = await conn.getAccount()
    const lastHash = await conn.getLastHash(ctx)
    if (lastHash[account.targetWorkspace] === current.hash) {
      // We have same model hash.
      return { mode: 'same', current: current.transactions, addition: [] }
    }
  }
  const lastTxTime = getLastTxTime(current.transactions)
  const result = await ctx.with('connection-load-model', { hash: current.hash !== '' }, (ctx) =>
    conn.loadModel(lastTxTime, current.hash)
  )

  if (Array.isArray(result)) {
    // Fallback to old behavior, only for tests
    return {
      mode: 'same',
      current: result,
      addition: []
    }
  }

  // Save concatenated, if have some more of them.
  void ctx
    .with('persistence-store', {}, (ctx) =>
      persistence?.store({
        ...result,
        // Store concatinated old + new txes
        transactions: result.full ? result.transactions : current.transactions.concat(result.transactions)
      })
    )
    .catch((err) => {
      Analytics.handleError(err)
    })

  if (typeof window !== 'undefined') {
    console.log('find' + (result.full ? 'full model' : 'model diff'), result.transactions.length, platformNowDiff(t))
  }
  if (result.full) {
    return { mode: 'upgrade', current: result.transactions, addition: [] }
  }
  return { mode: 'addition', current: current.transactions, addition: result.transactions }
}

export function buildModel (
  ctx: MeasureContext,
  transactions: Tx[],
  modelFilter: ModelFilter | undefined,
  hierarchy: Hierarchy,
  model: ModelDb
): void {
  const systemTx: Tx[] = []
  const userTx: Tx[] = []

  const atxes = transactions

  ctx.withSync('split txes', {}, () => {
    atxes.forEach((tx) =>
      ((tx.modifiedBy === core.account.ConfigUser || tx.modifiedBy === core.account.System) && !isPersonAccount(tx)
        ? systemTx
        : userTx
      ).push(tx)
    )
  })

  userTx.sort(compareTxes)

  let txes = systemTx.concat(userTx)
  if (modelFilter !== undefined) {
    txes = modelFilter(txes)
  }

  ctx.withSync('build hierarchy', {}, () => {
    for (const tx of txes) {
      try {
        hierarchy.tx(tx)
      } catch (err: any) {
        ctx.warn('failed to apply model transaction, skipping', {
          _id: tx._id,
          _class: tx._class,
          message: err?.message
        })
      }
    }
  })
  ctx.withSync('build model', {}, (ctx) => {
    model.addTxes(ctx, txes, false)
  })
}

export function getLastTxTime (txes: Tx[]): number {
  let lastTxTime = 0
  for (const tx of txes) {
    if (tx.modifiedOn > lastTxTime) {
      lastTxTime = tx.modifiedOn
    }
  }
  return lastTxTime
}

function compareTxes (a: Tx, b: Tx): number {
  const result = a.modifiedOn - b.modifiedOn
  if (result !== 0) {
    return result
  }
  if (a._class !== b._class) {
    if (a._class === core.class.TxCreateDoc) {
      return -1
    }
    if (b._class === core.class.TxCreateDoc) {
      return 1
    }
  }
  return a._id.localeCompare(b._id)
}
