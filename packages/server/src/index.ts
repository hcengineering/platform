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

import type { MeasureContext } from '@hcengineering/core'
import type {
  FindMessagesGroupsParams,
  FindMessagesParams,
  Message,
  MessagesGroup,
  WorkspaceID
} from '@hcengineering/communication-types'
import { createDbAdapter } from '@hcengineering/communication-cockroach'
import type {
  ConnectionInfo,
  DbAdapter,
  EventResult,
  RequestEvent,
  ServerApi
} from '@hcengineering/communication-sdk-types'

import { Manager, type BroadcastSessionsFunc } from './manager'
import { getMetadata, type Metadata } from './metadata'

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
    const db = await createDbAdapter(dbUrl, workspace, ctx, { withLogs: true })
    const metadata = getMetadata()
    return new Api(ctx, metadata, workspace, db, broadcast)
  }

  async findMessages(info: ConnectionInfo, params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    return await this.manager.findMessages(info, params, queryId)
  }

  async findMessagesGroups(info: ConnectionInfo, params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    return await this.manager.findMessagesGroups(info, params)
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
