import { type ParameterOrJSON, type Row } from 'postgres'
import type { WorkspaceID } from '@hcengineering/communication-types'

import { type SqlClient, type Logger, type Options } from '../types'

export class BaseDb {
  constructor (
    readonly client: SqlClient,
    readonly workspace: WorkspaceID,
    readonly logger?: Logger,
    readonly options?: Options
  ) {}

  async execute<T extends any[] = (Row & Iterable<Row>)[]>(
    sql: string,
    params?: ParameterOrJSON<any>[],
    name?: string
  ): Promise<T> {
    if (this.options?.withLogs === true && this.logger !== undefined) {
      return await this.executeWithLogs(name ?? 'execute sql', this.logger, sql, params)
    }

    return await this.client.execute(sql, params)
  }

  private async executeWithLogs<T extends any[] = (Row & Iterable<Row>)[]>(
    name: string,
    logger: Logger,
    sql: string,
    params?: ParameterOrJSON<any>[]
  ): Promise<T> {
    const start = performance.now()

    try {
      return await this.client.execute(sql, params)
    } finally {
      const time = performance.now() - start
      logger.info(name, { time })
    }
  }
}
