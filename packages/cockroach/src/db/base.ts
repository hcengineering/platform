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

import postgres, { type ParameterOrJSON } from 'postgres'
import type { WorkspaceID } from '@hcengineering/communication-types'

import { SqlRow, type Logger, type Options, type SqlResult } from '../types'
import { SqlClient } from '../client'

export class BaseDb {
  constructor (
    readonly client: SqlClient,
    readonly workspace: WorkspaceID,
    readonly logger?: Logger,
    readonly options?: Options
  ) {}

  getRowClient (): postgres.Sql {
    return this.client.getRawClient()
  }

  async execute<T extends SqlRow>(
    sql: string,
    params?: ParameterOrJSON<any>[],
    name?: string,
    client?: postgres.TransactionSql
  ): Promise<SqlResult<T>> {
    if (this.options?.withLogs === true && this.logger !== undefined) {
      return await this.executeWithLogs(name, this.logger, sql, params, client)
    }

    return await this.client.execute(sql, params, client)
  }

  private async executeWithLogs<T extends SqlRow>(
    name: string | undefined,
    logger: Logger,
    sql: string,
    params?: ParameterOrJSON<any>[],
    client?: postgres.TransactionSql
  ): Promise<SqlResult<T>> {
    if (name === undefined) {
      return await this.client.execute<T>(sql, params, client)
    }
    const start = performance.now()

    try {
      return await this.client.execute<T>(sql, params, client)
    } finally {
      const time = performance.now() - start
      logger.info(name, { time })
    }
  }
}
