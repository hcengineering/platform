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
import { SortingOrder, WorkspaceUuid } from '@hcengineering/communication-types'
import { Domain } from '@hcengineering/communication-sdk-types'

import { SqlRow, type Logger, type Options, type SqlResult } from '../types'
import { SqlClient } from '../client'
import {
  DbModelBatchUpdate,
  DbModelColumn,
  DbModelColumnType,
  DbModelFilter,
  DbModelUpdate,
  DomainDbModel,
  schemas
} from '../schema'

export class BaseDb {
  constructor (
    readonly client: SqlClient,
    readonly workspace: WorkspaceUuid,
    readonly logger?: Logger,
    readonly options?: Options
  ) {}

  protected getRowClient (): postgres.Sql {
    return this.client.getRawClient()
  }

  protected getInsertSql<D extends Domain, M extends DomainDbModel[D]>(
    domain: D,
    model: M,
    returnColumns: { column: DbModelColumn<D>, cast: string }[] = [],
    options?: {
      conflictColumns?: DbModelColumn<D>[]
      conflictAction?: string
    }
  ): { sql: string, values: any[] } {
    const schema = schemas[domain]
    const columns = (Object.keys(model) as DbModelColumn<D>[]).filter(
      (c): c is DbModelColumn<D> => model[c] !== undefined
    )
    const values = columns.map((c) => model[c])
    const placeholders = columns.map((c, i) => {
      const sqlType = (schema as any)[c]
      return `$${i + 1}::${sqlType}`
    })

    const columnsString = columns.map((k) => k).join(', ')
    const placeholdersString = placeholders.join(', ')
    let sql = `INSERT INTO ${domain} (${columnsString}) VALUES (${placeholdersString})`

    if (options?.conflictColumns != null && options.conflictColumns.length > 0) {
      const cols = options.conflictColumns.join(', ')
      const action = options.conflictAction ?? 'DO NOTHING'
      sql += ` ON CONFLICT (${cols}) ${action}`
    }

    if (returnColumns.length > 0) {
      sql += ` RETURNING ${returnColumns.map((c) => `${c.column}::${c.cast}`).join(', ')}`
    }

    return { sql, values }
  }

  protected getBatchInsertSql<D extends Domain, M extends DomainDbModel[D]>(
    domain: D,
    models: M[],
    returnColumns: { column: DbModelColumn<D>, cast: string }[] = [],
    options?: {
      conflictColumns?: DbModelColumn<D>[]
      conflictAction?: string
    }
  ): { sql: string, values: any[] } {
    if (models.length === 0) throw new Error('models must not be empty')

    const columns = Object.keys(models[0]) as Array<keyof M>
    const schema = schemas[domain]

    const values: any[] = []
    const placeholders = models.map((model, i) => {
      const rowPlaceholders = columns.map((k, j) => {
        values.push(model[k])
        return `$${i * columns.length + j + 1}::${(schema as any)[k]}`
      })
      return `(${rowPlaceholders.join(', ')})`
    })

    let sql = `INSERT INTO ${domain} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`.trim()

    if (options?.conflictColumns != null && options.conflictColumns.length > 0) {
      const cols = options.conflictColumns.join(', ')
      const action = options.conflictAction ?? 'DO NOTHING'
      sql += ` ON CONFLICT (${cols}) ${action}`
    }

    if (returnColumns.length > 0) {
      sql += ` RETURNING ${returnColumns.map((c) => `${c.column}::${c.cast}`).join(', ')}`
    }

    return { sql, values }
  }

  protected getDeleteSql<D extends Domain>(domain: D, filter: DbModelFilter<D>): { sql: string, values: any[] } {
    if (filter.length === 0) {
      throw new Error('getDeleteSql requires at least one filter')
    }
    const schema = schemas[domain]
    const placeholders: string[] = []
    const values: any[] = []

    filter.forEach((f, i) => {
      if (!Array.isArray(f.value)) {
        const idx = values.push(f.value)
        placeholders.push(`${f.column} = $${idx}::${(schema as any)[f.column]}`)
      } else {
        const idx = values.push(f.value)
        placeholders.push(`${f.column} = ANY($${idx}::${(schema as any)[f.column]}[])`)
      }
    })

    const sql = `DELETE FROM ${domain} WHERE ${placeholders.join(' AND ')}`.trim()

    return { sql, values }
  }

  protected getUpdateSql<D extends Domain>(
    domain: D,
    filter: DbModelFilter<D>,
    updates: DbModelUpdate<D>
  ): { sql: string, values: any[] } {
    if (filter.length === 0) {
      throw new Error('Filter must not be empty')
    }
    if (updates.length === 0) {
      throw new Error('Updates must not be empty')
    }
    const schema = schemas[domain]
    const values: any[] = []
    const whereClauses: string[] = []
    const setClauses: string[] = []

    for (const { column, value } of filter) {
      const idx = values.push(value)
      const cast = (schema as any)[column]
      if (Array.isArray(value)) {
        whereClauses.push(`${column} = ANY($${idx}::${cast}[])`)
      } else {
        whereClauses.push(`${column} = $${idx}::${cast}`)
      }
    }

    updates
      .filter((u) => u.innerKey == null)
      .forEach((u) => {
        const idx = values.push(u.value)
        const cast = (schema as any)[u.column]
        setClauses.push(`${u.column} = $${idx}::${cast}`)
      })

    const jsonGroups: Record<string, Array<{ key: string, value: any }>> = {}
    updates
      .filter((u) => u.innerKey != null)
      .forEach((u) => {
        const col = u.column
        jsonGroups[col] = jsonGroups[col] ?? []
        jsonGroups[col].push({ key: u.innerKey as string, value: u.value })
      })
    for (const [col, items] of Object.entries(jsonGroups)) {
      const parts = items.map((item) => {
        const idx = values.push(item.value)
        return `'${item.key}', $${idx}`
      })
      setClauses.push(`${col} = ${col} || jsonb_build_object(${parts.join(', ')})`)
    }

    const sql = `
    UPDATE ${domain} AS u
    SET ${setClauses.join(', ')}
    WHERE ${whereClauses.join(' AND ')}
  `.trim()

    return { sql, values }
  }

  protected getBatchUpdateSql<D extends Domain>(
    domain: D,
    keyColumn: DbModelColumn<D>,
    filter: DbModelFilter<D>,
    updates: DbModelBatchUpdate<D>
  ): { sql: string, values: any[] } {
    if (filter.length === 0) throw new Error('Batch update requires at least one filter')
    if (updates.length === 0) throw new Error('Batch update requires at least one update')

    const schema = schemas[domain]
    const values: any[] = []
    const whereClauses: string[] = []
    const setClauses: string[] = []

    for (const { column, value } of filter) {
      const idx = values.push(value)
      const cast = (schema as any)[column]
      whereClauses.push(
        Array.isArray(value) ? `u.${column} = ANY($${idx}::${cast}[])` : `u.${column} = $${idx}::${cast}`
      )
    }

    const rowsByKey = new Map<DbModelColumnType<D>, typeof updates>()
    for (const u of updates) {
      if (!rowsByKey.has(u.key)) {
        rowsByKey.set(u.key, [])
      }
      ;(rowsByKey.get(u.key) ?? []).push(u)
    }

    const allCols = Array.from(rowsByKey.values())
      .flat()
      .map((u) => u.column)
      .filter((c, i, a) => a.indexOf(c) === i)

    const tuples = Array.from(rowsByKey.entries()).map(([key, ups]) => {
      const rowVals = [
        key,
        ...allCols.map((col) => {
          const f = ups.find((u) => u.column === col)
          if (f == null) return null
          return f.innerKey != null ? { [f.innerKey]: f.value } : f.value
        })
      ]
      const placeholders = rowVals.map((v, j) => {
        const idx = values.push(v)
        const colName = j === 0 ? keyColumn : allCols[j - 1]
        const cast = (schema as any)[colName]
        return `$${idx}::${cast}`
      })
      return `(${placeholders.join(',')})`
    })

    for (const col of allCols) {
      if (filter.some((f) => f.column === col) || col === keyColumn) continue
      setClauses.push(`${col} = v.${col}`)
    }

    for (const col of allCols) {
      if ((schema as any)[col] === 'jsonb') {
        const idx = setClauses.findIndex((s) => s.startsWith(`${col} = v.${col}`))
        if (idx >= 0) setClauses[idx] = `${col} = u.${col} || v.${col}`
      }
    }

    const sql = `
    UPDATE ${domain} AS u
    SET ${setClauses.join(', ')}
    FROM (
      VALUES
        ${tuples.join(',\n        ')}
    ) AS v(${[keyColumn, ...allCols].join(', ')})
    WHERE ${whereClauses.join(' AND ')}
      AND u.${keyColumn} = v.${keyColumn}
  `.trim()

    return { sql, values }
  }

  protected buildOrderBy (order: SortingOrder | null | undefined, column: string): string {
    return order != null ? `ORDER BY ${column} ${order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''
  }

  protected buildLimit (limit: number | null | undefined): string {
    return limit != null ? `LIMIT ${limit}` : ''
  }

  protected async execute<T extends SqlRow>(
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
