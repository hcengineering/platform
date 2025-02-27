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
