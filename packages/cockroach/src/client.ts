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

import postgres from 'postgres'

import type { PostgresClientReference } from './connection'
import type { SqlParams, SqlRow } from './types'
import { convertArrayParams } from './utils'

export class SqlClient {
  constructor (
    private readonly db: PostgresClientReference,
    private readonly sql: postgres.Sql
  ) {}

  getRawClient (): postgres.Sql {
    return this.sql
  }

  async execute<T = SqlRow>(query: string, params?: SqlParams, client?: postgres.TransactionSql): Promise<T[]> {
    const convertedParams = convertArrayParams(params)
    return await (client ?? this.sql).unsafe<T[]>(query, convertedParams)
  }

  cursor<T = SqlRow>(query: string, params?: SqlParams, size?: number): AsyncIterable<NonNullable<T[][number]>[]> {
    const convertedParams = convertArrayParams(params)
    return this.sql.unsafe<T[]>(query, convertedParams).cursor(size)
  }

  close (): void {
    this.db.close()
  }
}
