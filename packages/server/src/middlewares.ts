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

import { MeasureContext } from '@hcengineering/core'
import type { DbAdapter, EventResult, Event, SessionData } from '@hcengineering/communication-sdk-types'
import type {
  Collaborator,
  FindCollaboratorsParams,
  FindLabelsParams,
  FindMessagesGroupsParams,
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  FindPeersParams,
  FindThreadParams,
  Label,
  Message,
  MessagesGroup,
  Notification,
  NotificationContext, Peer,
  Thread,
  WorkspaceID
} from '@hcengineering/communication-types'

import type {
  CommunicationCallbacks,
  Enriched,
  Metadata,
  Middleware,
  MiddlewareContext,
  MiddlewareCreateFn,
  QueryId
} from './types'
import { PermissionsMiddleware } from './middleware/permissions'
import { DatabaseMiddleware } from './middleware/db'
import { BroadcastMiddleware } from './middleware/broadcast'
import { TriggersMiddleware } from './middleware/triggers'
import { ValidateMiddleware } from './middleware/validate'
import { DateMiddleware } from './middleware/date'
import { IdentityMiddleware } from './middleware/indentity'
import { IdMiddleware } from './middleware/id'
import { PeerMiddleware } from './middleware/peer'

export async function buildMiddlewares (
  ctx: MeasureContext,
  workspace: WorkspaceID,
  metadata: Metadata,
  db: DbAdapter,
  callbacks: CommunicationCallbacks, peers: Peer[]
): Promise<Middlewares> {
  const createFns: MiddlewareCreateFn[] = [
    // Enrich events
    async (context, next) => new DateMiddleware(context, next),
    async (context, next) => new IdentityMiddleware(context, next),
    async (context, next) => new IdMiddleware(context, next),

    // Validate events
    async (context, next) => new ValidateMiddleware(context, next),
    async (context, next) => new PermissionsMiddleware(db, context, next),

    // Process events
    async (context, next) => new TriggersMiddleware(callbacks, db, context, next),
    async (context, next) => new BroadcastMiddleware(callbacks, context, next),
    async (context, next) => new DatabaseMiddleware(db, context, next),
    async (context, next) => new PeerMiddleware(context, next)
  ]

  const context: MiddlewareContext = {
    ctx,
    metadata,
    workspace,
    registeredCards: new Set(),
    accountBySocialID: new Map(),
    removedContexts: new Map(),
    cadsWithPeers: new Set(peers.map(it => it.cardId))
  }

  return await Middlewares.create(ctx, context, createFns)
}

export class Middlewares {
  private head: Middleware | undefined

  private readonly middlewares: Middleware[] = []

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly context: MiddlewareContext
  ) {
  }

  static async create (
    ctx: MeasureContext,
    context: MiddlewareContext,
    createFns: MiddlewareCreateFn[]
  ): Promise<Middlewares> {
    const middlewares = new Middlewares(ctx, context)

    const head = await middlewares.buildChain(ctx, createFns, middlewares.context)
    middlewares.head = head
    context.head = head
    return middlewares
  }

  private async buildChain (
    ctx: MeasureContext,
    createFns: MiddlewareCreateFn[],
    context: MiddlewareContext
  ): Promise<Middleware | undefined> {
    let current: Middleware | undefined
    for (let index = createFns.length - 1; index >= 0; index--) {
      const createFn = createFns[index]
      try {
        const nextCurrent = await createFn(context, current)
        this.middlewares.push(nextCurrent)
        current = nextCurrent
      } catch (err: any) {
        ctx.error('failed to initialize middlewares', { err, workspace: context.workspace })
        await this.close()
        throw err
      }
    }
    this.middlewares.reverse()

    return current
  }

  async findMessages (session: SessionData, params: FindMessagesParams, queryId?: QueryId): Promise<Message[]> {
    if (this.head === undefined) return []
    return await this.head.findMessages(session, params, queryId)
  }

  async findMessagesGroups (session: SessionData, params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    if (this.head === undefined) return []
    return await this.head.findMessagesGroups(session, params)
  }

  async findNotificationContexts (
    session: SessionData,
    params: FindNotificationContextParams,
    queryId?: QueryId
  ): Promise<NotificationContext[]> {
    if (this.head === undefined) return []
    return await this.head.findNotificationContexts(session, params, queryId)
  }

  async findNotifications (
    session: SessionData,
    params: FindNotificationsParams,
    queryId?: QueryId
  ): Promise<Notification[]> {
    if (this.head === undefined) return []
    return await this.head.findNotifications(session, params, queryId)
  }

  async findLabels (session: SessionData, params: FindLabelsParams): Promise<Label[]> {
    if (this.head === undefined) return []
    return await this.head.findLabels(session, params)
  }

  async findCollaborators (session: SessionData, params: FindCollaboratorsParams): Promise<Collaborator[]> {
    if (this.head === undefined) return []
    return await this.head.findCollaborators(session, params)
  }

  async findPeers (session: SessionData, params: FindPeersParams): Promise<Peer[]> {
    if (this.head === undefined) return []
    return await this.head.findPeers(session, params)
  }

  async findThreads (session: SessionData, params: FindThreadParams): Promise<Thread[]> {
    if (this.head === undefined) return []
    return await this.head.findThreads(session, params)
  }

  async unsubscribeQuery (session: SessionData, id: number): Promise<void> {
    if (this.head === undefined) return
    this.head?.unsubscribeQuery(session, id)
  }

  async event (session: SessionData, event: Event): Promise<EventResult> {
    if (this.head === undefined) return {}
    const result = (await this.head?.event(session, event as Enriched<Event>, session.derived ?? false)) ?? {}

    this.head?.handleBroadcast(session, [event] as Enriched<Event>[])

    return result
  }

  async closeSession (sessionId: string): Promise<void> {
    if (this.head === undefined) return
    this.head.closeSession(sessionId)
  }

  async close (): Promise<void> {
    for (const mw of this.middlewares) {
      try {
        mw.close()
      } catch (err: any) {
        this.ctx.error('Failed to close middleware', { err, workspace: this.context.workspace })
      }
    }
  }
}
