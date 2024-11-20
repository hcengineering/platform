//
// Copyright © 2024 Hardcore Engineering Inc.
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
import type postgres from 'postgres'
import communication, {
  type Class,
  type Obj,
  type Options,
  type Query,
  SortingOrder,
  type SortingQuery,
  type Message,
  type Ref
} from '@hcengineering/communication'

import { type Schema, schemaByClass, tableNameByClass } from './schemas'
import { createTables, toDbObject } from './utils'

export interface PostgresWorker {
  insertOne: <T extends Obj>(object: T) => Promise<void>
  findAll: <T extends Obj>(_class: Ref<Class<T>>, query: Query<T>, options?: Options<T>) => Promise<T[]>
}

export class PostgresWorkerImpl implements PostgresWorker {
  constructor (
    readonly client: postgres.Sql,
    private readonly workspaceId: string
  ) {}

  async init (): Promise<void> {
    await createTables(this.client)
  }

  async insertOne<T extends Obj>(data: T): Promise<any> {
    const table = tableNameByClass[data._class]
    if (table == null) {
      throw new Error(`Unknown class ${data._class}`)
    }

    const obj = toDbObject(data)

    const keys: string[] = ['workspaceId', ...Object.keys(obj)]
    const values: any[] = [this.workspaceId, ...Object.values(obj)]

    const sql = `INSERT INTO ${table} (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${keys.map((_, idx) => `$${idx + 1}`).join(', ')})`

    await this.client.begin(async (client) => {
      await client.unsafe(sql, values)
    })
  }

  async findAll<T extends Obj>(_class: Ref<Class<T>>, query: Query<T>, options?: Options<T>): Promise<T[]> {
    if (_class === communication.class.Message) {
      return (await this.findAllMessages(query as Query<Message>, options as Options<Message>)) as any as T[]
    }

    const table = tableNameByClass[_class]
    const schema = schemaByClass[_class]

    if (table == null || schema == null) {
      throw new Error(`Unknown class ${_class}`)
    }

    const select = `SELECT * FROM ${tableNameByClass[_class]}`
    const where = this.buildWhere(schema, { ...query, workspaceId: this.workspaceId })
    const sort = this.buildSort(options?.sort)
    const limit = this.buildLimit(options?.limit)

    const sql = [select, where, sort, limit].filter((it) => it !== '').join(' ')
    const result = await this.client.unsafe(sql)

    return result.map((row) => this.parseResult(row))
  }

  async findAllMessages (query: Query<Message>, options?: Options<Message>): Promise<Message[]> {
    const select = this.buildMessagesSelect()
    const where = this.buildWhere(schemaByClass[communication.class.Message], { ...query, workspaceId: this.workspaceId }, 'm.')
    const sort = this.buildSort(options?.sort, 'm.')
    const limit = this.buildLimit(options?.limit)
    const sql = [select, where, sort, limit].filter((it) => it !== '').join(' ')
    console.log(sql)
    const result = await this.client.unsafe(sql)

    return result.map((row) => this.parseResult(row))
  }

  buildMessagesSelect (): string {
    //      `SELECT m.*,
    //
    //     (
    //         SELECT jsonb_agg(p.*)
    //         FROM immut_patch p
    //         WHERE p."attachedTo" = m._id AND p."workspaceId" = m."workspaceId"
    //     ) AS patches,
    //
    //     (
    //         SELECT jsonb_agg(r.*)
    //         FROM immut_reaction r
    //         WHERE r."attachedTo" = m._id AND r."workspaceId" = m."workspaceId"
    //     ) AS reactions
    //
    // FROM
    //     immut_message m`

    const messageTable = tableNameByClass[communication.class.Message]
    const patchTable = tableNameByClass[communication.class.Patch]
    const reactionTable = tableNameByClass[communication.class.Reaction]

    return `WITH 
    aggregated_patches AS (
        SELECT
            p."attachedTo",
            p."workspaceId",
            jsonb_agg(to_jsonb(p)) AS patches
        FROM
            ${patchTable} p
        GROUP BY
            p."attachedTo", p."workspaceId"
    ),
     aggregated_reactions AS (
         SELECT
             r."attachedTo",
             r."workspaceId",
             jsonb_agg(to_jsonb(r)) AS reactions
         FROM
             ${reactionTable} r
         GROUP BY
             r."attachedTo", r."workspaceId"
     )
    SELECT
        m.*,
        COALESCE(ap.patches, '[]') AS patches,
        COALESCE(ar.reactions, '[]') AS reactions
    FROM
        ${messageTable} m
            LEFT JOIN
        aggregated_patches ap ON m._id = ap."attachedTo" AND m."workspaceId" = ap."workspaceId"
            LEFT JOIN
        aggregated_reactions ar ON m._id = ar."attachedTo" AND m."workspaceId" = ar."workspaceId"`
  }

  private buildWhere<T extends Obj>(schema: Schema, query: Query<T> & { workspaceId: string }, prefix: string = ''): string {
    if (Object.keys(query).length === 0) {
      return ''
    }

    const whereChunks: string[] = []

    for (const key of Object.keys(query)) {
      const qKey = (query as any)[key]
      const operator = typeof qKey === 'object' ? Object.keys(qKey)[0] : ''

      if (schema[key] === undefined) {
        continue
      }

      switch (operator) {
        case '$in': {
          const inVals = Object.values(qKey as object)[0].map((it: any) => `'${it}'`)

          if (inVals.length === 1) {
            whereChunks.push(`${prefix}"${key}" = ${inVals[0]}`)
          } else if (inVals.length > 1) {
            whereChunks.push(`${prefix}"${key}" IN (${inVals.join(', ')})`)
          }
          break
        }
        case '$lt': {
          const val = Object.values(qKey as object)[0]
          whereChunks.push(`${prefix}"${key}" < ${val}`)
          break
        }
        case '$lte': {
          const val = Object.values(qKey as object)[0]
          whereChunks.push(`${prefix}"${key}" <= ${val}`)
          break
        }
        case '$gt': {
          const val = Object.values(qKey as object)[0]
          whereChunks.push(`${prefix}"${key}" > ${val}`)
          break
        }
        case '$gte': {
          const val = Object.values(qKey as object)[0]
          whereChunks.push(`${prefix}"${key}" >= ${val}`)
          break
        }
        default: {
          whereChunks.push(`${prefix}"${key}" = '${qKey}'`)
        }
      }
    }

    return `WHERE ${whereChunks.join(' AND ')}`
  }

  buildSort<T extends Obj>(sort?: SortingQuery<T>, prefix: string = ''): string {
    if (sort == null) {
      return ''
    }

    const sortChunks: string[] = []

    for (const key of Object.keys(sort)) {
      const val = sort[key]
      sortChunks.push(`${prefix}"${key}" ${val === SortingOrder.Ascending ? 'ASC' : 'DESC'}`)
    }

    return `ORDER BY ${sortChunks.join(', ')}`
  }

  buildLimit (limit?: number): string {
    if (limit == null) {
      return ''
    }

    return `LIMIT ${limit}`
  }

  parseResult<T extends Obj>(result: any): T {
    const { workspaceId, ...data } = result

    for (const key in data) {
      if (data[key] === 'NULL') {
        data[key] = null
      }
    }

    return data as T
  }
}
