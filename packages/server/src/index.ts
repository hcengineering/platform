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

import { type MeasureContext, systemAccountUuid } from '@hcengineering/core'
import type {
  FindMessagesGroupsParams,
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Message,
  MessagesGroup,
  NotificationContext,
  WorkspaceID,
  Notification
} from '@hcengineering/communication-types'
import { createDbAdapter } from '@hcengineering/communication-cockroach'
import type {
  ConnectionInfo,
  DbAdapter,
  EventResult,
  RequestEvent,
  ServerApi
} from '@hcengineering/communication-sdk-types'

import { type BroadcastSessionsFunc, Manager } from './manager'
import { getMetadata, type Metadata } from './metadata'
import type { QueryId } from './types'

export class Api implements ServerApi {
  private readonly manager: Manager

  private constructor(
    private readonly ctx: MeasureContext,
    protected readonly metadata: Metadata,
    private readonly workspace: WorkspaceID,
    private readonly db: DbAdapter,
    private readonly broadcast: BroadcastSessionsFunc
  ) {
    this.manager = new Manager(this.ctx, this.metadata, this.db, this.workspace, this.broadcast)
  }

  static async create(
    ctx: MeasureContext,
    workspace: WorkspaceID,
    dbUrl: string,
    broadcast: BroadcastSessionsFunc
  ): Promise<Api> {
    const db = await createDbAdapter(dbUrl, workspace, ctx, {
      withLogs: process.env.COMMUNICATION_TIME_LOGGING_ENABLED === 'true'
    })
    const metadata = getMetadata()
    return new Api(ctx, metadata, workspace, db, broadcast)
  }

  async findMessages(info: ConnectionInfo, params: FindMessagesParams, queryId?: QueryId): Promise<Message[]> {
    return await this.manager.findMessages(info, params, queryId)
  }

  async findMessagesGroups(info: ConnectionInfo, params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    return await this.manager.findMessagesGroups(info, params)
  }

  async findNotificationContexts(
    info: ConnectionInfo,
    params: FindNotificationContextParams,
    queryId?: QueryId
  ): Promise<NotificationContext[]> {
    const isSystem = info.account.uuid === systemAccountUuid

    if (isSystem) {
      return await this.manager.findNotificationContexts(info, params, queryId)
    }

    const accounts = params.account == null || Array.isArray(params.account) ? params.account : [params.account]
    const withMe = accounts == null || accounts.includes(info.account.uuid)

    if (withMe) {
      return await this.manager.findNotificationContexts(
        info,
        {
          ...params,
          account: info.account.uuid
        },
        queryId
      )
    }

    return []
  }

  async findNotifications(
    info: ConnectionInfo,
    params: FindNotificationsParams,
    queryId?: QueryId
  ): Promise<Notification[]> {
    const isSystem = info.account.uuid === systemAccountUuid

    if (isSystem) {
      return await this.manager.findNotifications(info, params, queryId)
    }

    const accounts = params.account == null || Array.isArray(params.account) ? params.account : [params.account]
    const withMe = accounts == null || accounts.includes(info.account.uuid)

    if (withMe) {
      return await this.manager.findNotifications(
        info,
        {
          ...params,
          account: info.account.uuid
        },
        queryId
      )
    }

    return []
  }

  async unsubscribeQuery(info: ConnectionInfo, id: number): Promise<void> {
    this.manager.unsubscribeQuery(info, id)
  }

  async event(info: ConnectionInfo, event: RequestEvent): Promise<EventResult> {
    return await this.manager.event(info, event)
  }

  async closeSession(sessionId: string): Promise<void> {
    this.manager.closeSession(sessionId)
  }

  async close(): Promise<void> {
    this.manager.close()
  }
}
