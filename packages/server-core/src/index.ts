import type { MeasureContext } from '@hcengineering/core'
import type { FindMessagesParams, Message } from '@hcengineering/communication-types'
import { createDbAdapter } from '@hcengineering/communication-cockroach'
import type { ConnectionInfo, DbAdapter, Event, ServerApi } from '@hcengineering/communication-sdk-types'

import { type Result } from './eventProcessor.ts'
import { Manager } from './manager.ts'

export class Api implements ServerApi {
  private readonly manager: Manager

  private constructor(
    private readonly ctx: MeasureContext,
    private readonly workspace: string,
    db: DbAdapter
  ) {
    this.manager = new Manager(this.ctx, db, this.workspace)
  }

  static async create(ctx: MeasureContext, workspace: string, dbUrl: string): Promise<Api> {
    const db = await createDbAdapter(dbUrl)
    return new Api(ctx, workspace, db)
  }

  async findMessages(info: ConnectionInfo, params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    return await this.manager.findMessages(info, params, queryId)
  }

  async unsubscribeQuery(info: ConnectionInfo, id: number): Promise<void> {
    this.manager.unsubscribeQuery(info, id)
  }

  async event(info: ConnectionInfo, event: Event): Promise<Result> {
    return await this.manager.event(info, event)
  }

  async close(): Promise<void> {
    this.manager.close()
  }
}
