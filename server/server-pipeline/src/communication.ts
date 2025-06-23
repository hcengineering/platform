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
import type {
  CommunicationApiFactory,
  Middleware,
  MiddlewareCreator,
  PipelineContext
} from '@hcengineering/server-core'
import { BaseMiddleware } from '@hcengineering/server-core'

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
        broadcast: (ctx, sessions, result: Event) => {
          const { contextData, evt } = CommunicationMiddleware.wrapEvent(ctx, result)
          for (const s of sessions) {
            contextData.broadcast.sessions[s] = (contextData.broadcast.sessions[s] ?? []).concat(evt)
          }
        },
        enqueue: (ctx, result: Event) => {
          const { contextData, evt } = CommunicationMiddleware.wrapEvent(ctx, result)
          contextData.broadcast.queue.push(evt)
        }
      })
      return new CommunicationMiddleware(ctx, context, next, communicationApi)
    }
  }

  private static wrapEvent (ctx: MeasureContext<any>, result: Event): { contextData: SessionData, evt: TxDomainEvent } {
    const contextData = ctx.contextData as SessionData
    const evt: TxDomainEvent = {
      _id: generateId(),
      space: core.space.Tx,
      objectSpace: core.space.Domain,
      _class: core.class.TxDomainEvent,
      domain: COMMUNICATION_DOMAIN,
      event: result,
      modifiedBy: contextData.account.primarySocialId,
      modifiedOn: Date.now()
    }
    return { contextData, evt }
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
    if (args.sendEvent !== undefined) {
      const event = args.sendEvent
      return await this.communicationApi.event(ctx, event)
    }
    return {}
  }

  private getCommunicationCtx (ctx: MeasureContext<SessionData>): CommunicationSession {
    return {
      ...ctx,
      sessionId: ctx.contextData.sessionId,
      // TODO: We should decide what to do with communications package and remove this workaround
      account: ctx.contextData.account
    }
  }
}
