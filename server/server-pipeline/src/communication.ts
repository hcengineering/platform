//
// Copyright © 2022 Hardcore Engineering Inc.
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

import type { SessionData as CommunicationSession, Event, ServerApi } from '@hcengineering/communication-sdk-types'
import core, {
  generateId,
  type DomainParams,
  type DomainResult,
  type MeasureContext,
  type OperationDomain,
  type SessionData,
  type TxDomainEvent
} from '@hcengineering/core'
import {
  type CommunicationApiFactory,
  type Middleware,
  type MiddlewareCreator,
  type PipelineContext,
  SessionDataImpl,
  BaseMiddleware
} from '@hcengineering/server-core'

export const COMMUNICATION_DOMAIN = 'communication' as OperationDomain

/**
 * @public
 */
export class CommunicationMiddleware extends BaseMiddleware implements Middleware {
  constructor (
    readonly ctx: MeasureContext,
    context: PipelineContext,
    readonly next: Middleware | undefined,
    readonly communicationApi: ServerApi
  ) {
    super(context, next)
  }

  static create (communicationApiFactory: CommunicationApiFactory): MiddlewareCreator {
    return async (ctx, context, next): Promise<Middleware> => {
      const communicationApi = await communicationApiFactory(ctx, context.workspace, {
        asyncBroadcast: (ctx, result, queue: Event[]) => {
          const { contextData: sctx, txEvents: queueEvents } = CommunicationMiddleware.wrapEvents(ctx, queue)
          const asyncContextData: SessionDataImpl = new SessionDataImpl(
            sctx.account,
            sctx.sessionId,
            sctx.admin,
            { txes: [], targets: {}, queue: [], sessions: {} },
            context.workspace,
            true,
            sctx.removedMap,
            sctx.contextCache,
            context.modelDb,
            sctx.socialStringsToUsers,
            sctx.service
          )

          asyncContextData.broadcast.queue = queueEvents
          for (const [sessionId, events] of Object.entries(result)) {
            const { contextData, txEvents } = CommunicationMiddleware.wrapEvents(ctx, events)

            asyncContextData.broadcast.sessions[sessionId] = (contextData.broadcast.sessions[sessionId] ?? []).concat(
              txEvents
            )
          }
          ctx.contextData = asyncContextData
          void context.head?.handleBroadcast(ctx)
        },
        broadcast: (ctx, result) => {
          for (const [sessionId, events] of Object.entries(result)) {
            const { contextData, txEvents } = CommunicationMiddleware.wrapEvents(ctx, events)
            contextData.broadcast.sessions[sessionId] = (contextData.broadcast.sessions[sessionId] ?? []).concat(
              txEvents
            )
          }
        },
        enqueue: (ctx, result: Event[]) => {
          const { contextData, txEvents } = CommunicationMiddleware.wrapEvents(ctx, result)
          contextData.broadcast.queue.push(...txEvents)
        }
      })
      return new CommunicationMiddleware(ctx, context, next, communicationApi)
    }
  }

  private static wrapEvents (
    ctx: MeasureContext<any>,
    result: Event[]
  ): { contextData: SessionData, txEvents: TxDomainEvent[] } {
    const contextData = ctx.contextData as SessionData
    return {
      contextData,
      txEvents: result.map((it) => ({
        _id: generateId(),
        space: core.space.Tx,
        objectSpace: core.space.Domain,
        _class: core.class.TxDomainEvent,
        domain: COMMUNICATION_DOMAIN,
        event: it,
        modifiedBy: contextData.account.primarySocialId,
        modifiedOn: Date.now()
      }))
    }
  }

  async domainRequest (ctx: MeasureContext, domain: OperationDomain, params: DomainParams): Promise<DomainResult> {
    if (domain === COMMUNICATION_DOMAIN) {
      return {
        domain,
        value: await this.handleCommand(ctx, params)
      }
    } else {
      return await this.provideDomainRequest(ctx, domain, params)
    }
  }

  async handleCommand (_ctx: MeasureContext<SessionData>, args: DomainParams): Promise<any> {
    const ctx = this.getCommunicationCtx(_ctx)
    if (args.findMessages !== undefined) {
      const { params, queryId } = args.findMessages
      return await this.communicationApi.findMessages(ctx, params, queryId)
    }
    if (args.findMessagesGroups !== undefined) {
      const { params } = args.findMessagesGroups
      return await this.communicationApi.findMessagesGroups(ctx, params)
    }
    if (args.findNotificationContexts !== undefined) {
      const { params, queryId } = args.findNotificationContexts
      return await this.communicationApi.findNotificationContexts(ctx, params, queryId)
    }
    if (args.findNotifications !== undefined) {
      const { params, queryId } = args.findNotifications
      return await this.communicationApi.findNotifications(ctx, params, queryId)
    }
    if (args.findLabels !== undefined) {
      const { params } = args.findLabels
      return await this.communicationApi.findLabels(ctx, params)
    }
    if (args.findCollaborators !== undefined) {
      const { params } = args.findCollaborators
      return await this.communicationApi.findCollaborators(ctx, params)
    }
    if (args.unsubscribeQuery !== undefined) {
      const { id } = args.unsubscribeQuery
      await this.communicationApi.unsubscribeQuery(ctx, id)
      return
    }
    if (args.event !== undefined) {
      const event = args.event
      return await this.communicationApi.event(ctx, event)
    }
    return {}
  }

  private getCommunicationCtx (ctx: MeasureContext<SessionData>): CommunicationSession {
    return {
      ...ctx,
      sessionId: ctx.contextData.sessionId,
      asyncData: [],
      derived: ctx.contextData.isTriggerCtx === true,
      // TODO: We should decide what to do with communications package and remove this workaround
      account: ctx.contextData.account
    }
  }
}
