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

import { type MeasureContext } from '@hcengineering/core'
import type {
  FindMessagesGroupsParams,
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Message,
  MessagesGroup,
  NotificationContext,
  WorkspaceID,
  Notification,
  FindLabelsParams,
  Label,
  FindCollaboratorsParams,
  Collaborator
} from '@hcengineering/communication-types'
import { createDbAdapter } from '@hcengineering/communication-cockroach'
import type { EventResult, RequestEvent, ServerApi, SessionData } from '@hcengineering/communication-sdk-types'
import { setMetadata } from '@hcengineering/platform'
import serverToken from '@hcengineering/server-token'

import { getMetadata } from './metadata'
import type { BroadcastSessionsFunc, QueryId } from './types'
import { buildMiddlewares, Middlewares } from './middlewares'

export class Api implements ServerApi {
  private constructor (
    private readonly ctx: MeasureContext,
    private readonly middlewares: Middlewares
  ) {}

  static async create (
    ctx: MeasureContext,
    workspace: WorkspaceID,
    dbUrl: string,
    broadcast: BroadcastSessionsFunc
  ): Promise<Api> {
    const db = await createDbAdapter(dbUrl, workspace, ctx, {
      withLogs: process.env.COMMUNICATION_TIME_LOGGING_ENABLED === 'true'
    })

    const metadata = getMetadata()

    setMetadata(serverToken.metadata.Secret, metadata.secret)

    const middleware = await buildMiddlewares(ctx, workspace, metadata, db, broadcast)

    return new Api(ctx, middleware)
  }

  async findMessages (session: SessionData, params: FindMessagesParams, queryId?: QueryId): Promise<Message[]> {
    return await this.middlewares.findMessages(session, params, queryId)
  }

  async findMessagesGroups (session: SessionData, params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    return await this.middlewares.findMessagesGroups(session, params)
  }

  async findNotificationContexts (
    session: SessionData,
    params: FindNotificationContextParams,
    queryId?: QueryId
  ): Promise<NotificationContext[]> {
    return await this.middlewares.findNotificationContexts(session, params, queryId)
  }

  async findNotifications (
    session: SessionData,
    params: FindNotificationsParams,
    queryId?: QueryId
  ): Promise<Notification[]> {
    return await this.middlewares.findNotifications(session, params, queryId)
  }

  async findLabels (session: SessionData, params: FindLabelsParams): Promise<Label[]> {
    return await this.middlewares.findLabels(session, params)
  }

  async findCollaborators (session: SessionData, params: FindCollaboratorsParams): Promise<Collaborator[]> {
    return await this.middlewares.findCollaborators(session, params)
  }

  async unsubscribeQuery (session: SessionData, id: number): Promise<void> {
    await this.middlewares.unsubscribeQuery(session, id)
  }

  async event (session: SessionData, event: RequestEvent): Promise<EventResult> {
    return await this.middlewares.event(session, event)
  }

  async closeSession (sessionId: string): Promise<void> {
    await this.middlewares.closeSession(sessionId)
  }

  async close (): Promise<void> {
    await this.middlewares.close()
  }
}
