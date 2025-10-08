//
// Copyright © 2024 Hardcore Engineering Inc.
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
  type BroadcastExcludeResult,
  type BroadcastResult,
  TxProcessor,
  type AccountUuid,
  type BroadcastTargets,
  type Class,
  type Doc,
  type MeasureContext,
  type Ref,
  type SessionData,
  type Tx,
  type TxCUD
} from '@hcengineering/core'
import type {
  BroadcastOps,
  Middleware,
  MiddlewareCreator,
  PipelineContext,
  TxMiddlewareResult
} from '@hcengineering/server-core'
import { BaseMiddleware, createBroadcastEvent } from '@hcengineering/server-core'

/**
 * @public
 */
export class BroadcastMiddleware extends BaseMiddleware implements Middleware {
  constructor (
    context: PipelineContext,
    protected readonly next: Middleware | undefined,
    readonly broadcast: BroadcastOps
  ) {
    super(context, next)
    context.broadcastEvent = (ctx, tx) => this.doBroadcast(ctx, tx)
  }

  static create (broadcast: BroadcastOps): MiddlewareCreator {
    return async (ctx, pipelineContext, next) => new BroadcastMiddleware(pipelineContext, next, broadcast)
  }

  async handleBroadcast (ctx: MeasureContext<SessionData>): Promise<void> {
    await this.next?.handleBroadcast(ctx)

    await this.doBroadcast(ctx, ctx.contextData.broadcast.txes, ctx.contextData.broadcast.targets)

    if (Object.keys(ctx.contextData.broadcast.sessions).length > 0) {
      this.broadcast.broadcastSessions(ctx, ctx.contextData.broadcast.sessions)
    }
  }

  tx (ctx: MeasureContext<SessionData>, tx: Tx[]): Promise<TxMiddlewareResult> {
    // We collect all broadcast information here, so we could send it later
    ctx.contextData.broadcast.txes.push(...tx)

    return this.provideTx(ctx, tx)
  }

  async doBroadcast (ctx: MeasureContext<SessionData>, tx: Tx[], targets?: BroadcastTargets): Promise<void> {
    if (tx.length === 0) {
      return
    }

    // Combine targets by sender

    const toSendTarget = new Map<AccountUuid | '', Tx[]>()
    const txesWithExcludedAccounts = new Map<Tx, AccountUuid[]>()

    const getTxes = (key: AccountUuid | ''): Tx[] => {
      let txes = toSendTarget.get(key)
      if (txes === undefined) {
        txes = [...(toSendTarget.get('') ?? [])] // We also need to add all from to all
        toSendTarget.set(key, txes)
      }
      return txes
    }

    // Put current user as send target
    for (const txd of tx) {
      let target: BroadcastResult
      for (const tt of Object.values(targets ?? {})) {
        target = await tt(txd)
        if (target !== undefined) {
          break
        }
      }
      if (target === undefined) {
        getTxes('') // Be sure we have empty one

        // Also add to all other targeted sends
        for (const v of toSendTarget.values()) {
          v.push(txd)
        }
      } else {
        if (isExlcude(target)) {
          txesWithExcludedAccounts.set(txd, target.exclude)
        } else {
          for (const t of target.target) {
            getTxes(t).push(txd)
          }
        }
      }
    }

    const handleSend = async (
      ctx: MeasureContext<SessionData>,
      derived: Tx[],
      target?: AccountUuid,
      exclude?: AccountUuid[]
    ): Promise<void> => {
      if (derived.length === 0) {
        return
      }

      if (derived.length > 10000) {
        await this.sendWithPart(derived, ctx, target, exclude)
      } else {
        // Let's send after our response will go out
        this.broadcast.broadcast(ctx, derived, target, exclude)
      }
    }

    const toSendAll = toSendTarget.get('') ?? []
    toSendTarget.delete('')

    // Then send targeted and all other
    for (const [k, v] of toSendTarget.entries()) {
      void handleSend(ctx, v, k as AccountUuid)
    }

    for (const [tx, txExcludedAccounts] of txesWithExcludedAccounts.entries()) {
      void handleSend(ctx, [tx], undefined, txExcludedAccounts)
    }

    // Send all other except us.
    await handleSend(ctx, toSendAll, undefined, Array.from(toSendTarget.keys()) as AccountUuid[])
  }

  private async sendWithPart (
    derived: Tx[],
    ctx: MeasureContext<SessionData>,
    target: AccountUuid | undefined,
    exclude: AccountUuid[] | undefined
  ): Promise<void> {
    const classes = new Set<Ref<Class<Doc>>>()
    for (const dtx of derived) {
      if (TxProcessor.isExtendsCUD(dtx._class)) {
        classes.add((dtx as TxCUD<Doc>).objectClass)
        const attachedToClass = (dtx as TxCUD<Doc>).attachedToClass
        if (attachedToClass !== undefined) {
          classes.add(attachedToClass)
        }
      }
    }
    const bevent = createBroadcastEvent(Array.from(classes))
    this.broadcast.broadcast(ctx, [bevent], target, exclude)
  }
}

function isExlcude (result: BroadcastResult): result is BroadcastExcludeResult {
  return (result as BroadcastExcludeResult).exclude !== undefined
}
