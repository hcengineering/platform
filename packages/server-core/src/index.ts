import type { MeasureContext } from '@hcengineering/core'
import type { FindMessagesParams, Message } from '@hcengineering/communication-types'
import { createDbAdapter } from '@hcengineering/communication-cockroach'
import type { ConnectionInfo, DbAdapter, Event, EventResult, ServerApi } from '@hcengineering/communication-sdk-types'

import { Manager, type BroadcastSessionsFunc } from './manager.ts'

export class Api implements ServerApi {
  private readonly manager: Manager

  private constructor(
    private readonly ctx: MeasureContext,
    private readonly workspace: string,
    db: DbAdapter,
    broadcast: BroadcastSessionsFunc
  ) {
    this.manager = new Manager(this.ctx, db, this.workspace, broadcast)
  }

  static async create(
    ctx: MeasureContext,
    workspace: string,
    dbUrl: string,
    broadcast: BroadcastSessionsFunc
  ): Promise<Api> {
    const db = await createDbAdapter(dbUrl)
    return new Api(ctx, workspace, db, broadcast)
  }

  async findMessages(info: ConnectionInfo, params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    return await this.manager.findMessages(info, params, queryId)
  }

  async unsubscribeQuery(info: ConnectionInfo, id: number): Promise<void> {
    this.manager.unsubscribeQuery(info, id)
  }

  async event(info: ConnectionInfo, event: Event): Promise<EventResult> {
    return await this.manager.event(info, event)
  }

  async closeSession(sessionId: string): Promise<void> {
    this.manager.closeSession(sessionId)
  }

  async close(): Promise<void> {
    this.manager.close()
  }
}
