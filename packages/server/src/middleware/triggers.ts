//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { DbAdapter, RequestEvent, ResponseEvent, SessionData } from '@hcengineering/communication-sdk-types'
import type { MeasureContext } from '@hcengineering/core'

import triggers from '../triggers/all'
import type { Enriched, Middleware, MiddlewareContext, TriggerCtx } from '../types'
import { BaseMiddleware } from './base'
import { notify } from '../notification/notification'

export class TriggersMiddleware extends BaseMiddleware implements Middleware {
  private readonly ctx: MeasureContext

  constructor (
    private readonly db: DbAdapter,
    context: MiddlewareContext,
    next?: Middleware
  ) {
    super(context, next)
    this.ctx = context.ctx.newChild('triggers', {})
    setInterval(
      () => {
        this.context.registeredCards.clear()
      },
      60 * 60 * 1000
    ) // 1hour
  }

  async response (session: SessionData, event: ResponseEvent, derived: boolean): Promise<void> {
    const ctx: Omit<TriggerCtx, 'ctx'> = {
      metadata: this.context.metadata,
      db: this.db,
      workspace: this.context.workspace,
      account: session.account,
      registeredCards: this.context.registeredCards,
      accountBySocialID: this.context.accountBySocialID,
      derived,
      execute: async (event: RequestEvent) => {
        // Will be enriched in head
        return (await this.context.head?.event(session, event as Enriched<RequestEvent>, true)) ?? {}
      }
    }
    await this.applyTriggers(session, event, ctx)
    void notify(
      {
        ...ctx,
        ctx: this.ctx.newChild('create-notifications', {})
      },
      event
    ).then((res) => this.propagate(session, res))
  }

  private async applyTriggers (session: SessionData, event: ResponseEvent, ctx: Omit<TriggerCtx, 'ctx'>): Promise<void> {
    const matchedTriggers = triggers.filter(([_, type]) => type === event.type)
    if (matchedTriggers.length === 0) return

    const derived = (
      await Promise.all(
        matchedTriggers.map(([name, _, fn]) =>
          fn(
            {
              ...ctx,
              ctx: this.ctx.newChild(name, {})
            },
            event
          )
        )
      )
    ).flat()

    await this.propagate(session, derived)
  }

  private async propagate (session: SessionData, derived: RequestEvent[]): Promise<void> {
    if (derived.length === 0) return
    if (this.context.head === undefined) return
    // Will be enriched in head
    await Promise.all(derived.map((d) => this.context.head?.event(session, d as Enriched<RequestEvent>, true)))
  }
}
