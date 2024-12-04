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

import core, {
  AccountRole,
  type Class,
  type Doc,
  type DocInfo,
  type DocumentQuery,
  type DocumentUpdate,
  type Domain,
  DOMAIN_MODEL,
  DOMAIN_MODEL_TX,
  DOMAIN_SPACE,
  DOMAIN_TX,
  type FindOptions,
  type FindResult,
  generateId,
  groupByArray,
  type Hierarchy,
  isOperator,
  type Iterator,
  type Lookup,
  type MeasureContext,
  type ModelDb,
  type ObjQueryType,
  type Projection,
  type Ref,
  type ReverseLookups,
  type SessionData,
  type SortingQuery,
  type StorageIterator,
  systemAccountUuid,
  toFindResult,
  type Tx,
  type TxCreateDoc,
  type TxCUD,
  type TxMixin,
  TxProcessor,
  type TxRemoveDoc,
  type TxResult,
  type TxUpdateDoc,
  withContext,
  type WithLookup,
  type WorkspaceUuid
} from '@hcengineering/core'
import {
  type DbAdapter,
  type DbAdapterHandler,
  type DomainHelperOperations,
  estimateDocSize,
  type ServerFindOptions,
  toDocInfo,
  type TxAdapter
} from '@hcengineering/server-core'
import type postgres from 'postgres'
import { getDocFieldsByDomains, getSchema, type Schema, translateDomain } from './schemas'
import { type ValueType } from './types'
import {
  convertDoc,
  createTables,
  DBCollectionHelper,
  type DBDoc,
  escapeBackticks,
  getDBClient,
  inferType,
  isDataField,
  isOwner,
  type JoinProps,
  parseDoc,
  parseDocWithProjection,
  parseUpdate,
  type PostgresClientReference
} from './utils'

async function * createCursorGenerator (
  client: postgres.ReservedSql,
  sql: string,
  schema: Schema,
  bulkSize = 50
): AsyncGenerator<Doc[]> {
  const cursor = client.unsafe(sql).cursor(bulkSize)
  try {
    let docs: Doc[] = []
    for await (const part of cursor) {
      docs.push(...part.filter((it) => it != null).map((it) => parseDoc(it as any, schema)))
      if (docs.length > 0) {
        yield docs
        docs = []
      }
    }
    if (docs.length > 0) {
      yield docs
      docs = []
    }
  } catch (err: any) {
    console.error('failed to recieve data', { err })
  }
}

class ConnectionInfo {
  // It should preserve at least one available connection in pool, other connection should be closed
  available: postgres.ReservedSql[] = []

  released: boolean = false

  constructor (
    readonly mgrId: string,
    readonly connectionId: string,
    protected readonly client: postgres.Sql,
    readonly managed: boolean
  ) {}

  async withReserve (
    reserveOrPool: boolean,
    action: (reservedClient: postgres.ReservedSql | postgres.Sql) => Promise<any>
  ): Promise<any> {
    let reserved: postgres.ReservedSql | undefined

    // Check if we have at least one available connection and reserve one more if required.
    if (this.available.length === 0) {
      if (reserveOrPool) {
        reserved = await this.client.reserve()
      }
    } else {
      reserved = this.available.shift() as postgres.ReservedSql
    }

    try {
      // Use reserved or pool
      return await action(reserved ?? this.client)
    } catch (err: any) {
      console.error(err)
      throw err
    } finally {
      if (this.released) {
        reserved?.release()
      } else {
        // after use we put into available
        if (reserved !== undefined) {
          this.available.push(reserved)
        }

        if (this.available.length > 1) {
          // We need to release any >= 1
          const toRelease = this.available.splice(1, this.available.length - 1)

          for (const r of toRelease) {
            r.release()
          }
        }
      }
    }
  }

  release (): void {
    for (const c of this.available) {
      c.release()
    }
    this.available = []
  }
}

const connections = new Map<string, ConnectionInfo>()

class ConnectionMgr {
  constructor (
    protected readonly client: postgres.Sql,
    readonly mgrId: string
  ) {}

  async write (
    id: string | undefined,
    fn: (client: postgres.Sql | postgres.ReservedSql) => Promise<any>
  ): Promise<void> {
    const backoffInterval = 25 // millis
    const maxTries = 5
    let tries = 0

    const realId = id ?? generateId()

    const connection = this.getConnection(realId, false)

    try {
      while (true) {
        const retry: boolean | Error = await connection.withReserve(true, async (client) => {
          tries++
          try {
            await client.unsafe('BEGIN;')
            await fn(client)
            await client.unsafe('COMMIT;')
            return true
          } catch (err: any) {
            await client.unsafe('ROLLBACK;')

            if (err.code !== '40001' || tries === maxTries) {
              return err
            } else {
              console.log('Transaction failed. Retrying.')
              console.log(err.message)
              return false
            }
          }
        })
        if (retry === true) {
          break
        }
        if (retry instanceof Error) {
          // Pass it to exit
          throw retry
        }
        // Retry for a timeout
        await new Promise((resolve) => setTimeout(resolve, backoffInterval))
      }
    } finally {
      if (!connection.managed) {
        // We need to relase in case it temporaty connection was used
        connection.release()
      }
    }
  }

  async read (id: string | undefined, fn: (client: postgres.Sql | postgres.ReservedSql) => Promise<any>): Promise<any> {
    const backoffInterval = 25 // millis
    const maxTries = 5
    let tries = 0

    const realId = id ?? generateId()
    // Will reuse reserved if had and use new one if not
    const connection = this.getConnection(realId, false)

    try {
      while (true) {
        const retry: false | { result: any } | Error = await connection.withReserve(false, async (client) => {
          tries++
          try {
            return { result: await fn(client) }
          } catch (err: any) {
            if (err.code !== '40001' || tries === maxTries) {
              return err
            } else {
              console.log('Read Transaction failed. Retrying.')
              console.log(err.message)
              return false
            }
          }
        })
        if (retry instanceof Error) {
          // Pass it to exit
          throw retry
        }
        if (retry === false) {
          // Retry for a timeout
          await new Promise((resolve) => setTimeout(resolve, backoffInterval))
          continue
        }
        return retry.result
      }
    } finally {
      if (!connection.managed) {
        // We need to relase in case it temporaty connection was used
        connection.release()
      }
    }
  }

  release (id: string): void {
    const conn = connections.get(id)
    if (conn !== undefined) {
      conn.released = true
      connections.delete(id) // We need to delete first
      conn.release()
    } else {
      console.log('wrne')
    }
  }

  close (): void {
    for (const [k, conn] of Array.from(connections.entries()).filter(
      ([, it]: [string, ConnectionInfo]) => it.mgrId === this.mgrId
    )) {
      connections.delete(k)
      conn.release()
    }
  }

  getConnection (id: string, managed: boolean = true): ConnectionInfo {
    let conn = connections.get(id)
    if (conn === undefined) {
      conn = new ConnectionInfo(this.mgrId, id, this.client, managed)
    }
    if (managed) {
      connections.set(id, conn)
    }
    return conn
  }
}

abstract class PostgresAdapterBase implements DbAdapter {
  protected readonly _helper: DBCollectionHelper
  protected readonly tableFields = new Map<string, string[]>()

  mgr: ConnectionMgr

  constructor (
    protected readonly client: postgres.Sql,
    protected readonly refClient: PostgresClientReference,
    protected readonly workspaceId: WorkspaceUuid,
    protected readonly hierarchy: Hierarchy,
    protected readonly modelDb: ModelDb,
    readonly mgrId: string
  ) {
    this._helper = new DBCollectionHelper(this.client, this.workspaceId)
    this.mgr = new ConnectionMgr(client, mgrId)
  }

  reserveContext (id: string): () => void {
    const conn = this.mgr.getConnection(id, true)
    return () => {
      conn.released = true
      conn.release()
      connections.delete(id) // We need to delete first
    }
  }

  async traverse<T extends Doc>(
    _domain: Domain,
    query: DocumentQuery<T>,
    options?: Pick<FindOptions<T>, 'sort' | 'limit' | 'projection'>
  ): Promise<Iterator<T>> {
    const schema = getSchema(_domain)
    const client = await this.client.reserve()

    const tdomain = translateDomain(_domain)

    const sqlChunks: string[] = [`SELECT * FROM ${tdomain}`]
    sqlChunks.push(`WHERE ${this.buildRawQuery(tdomain, query, options)}`)
    if (options?.sort !== undefined) {
      sqlChunks.push(this.buildRawOrder(tdomain, options.sort))
    }
    if (options?.limit !== undefined) {
      sqlChunks.push(`LIMIT ${options.limit}`)
    }
    const finalSql: string = sqlChunks.join(' ')

    const cursor: AsyncGenerator<Doc[]> = createCursorGenerator(client, finalSql, schema)
    return {
      next: async (count: number): Promise<T[] | null> => {
        const result = await cursor.next()
        if (result.done === true || result.value.length === 0) {
          return null
        }
        return result.value as T[]
      },
      close: async () => {
        await cursor.return([])
        client.release()
      }
    }
  }

  helper (): DomainHelperOperations {
    return this._helper
  }

  on?: ((handler: DbAdapterHandler) => void) | undefined

  abstract init (): Promise<void>

  async close (): Promise<void> {
    this.mgr.close()
    this.refClient.close()
  }

  async rawFindAll<T extends Doc>(_domain: Domain, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<T[]> {
    const domain = translateDomain(_domain)
    const select = `SELECT * FROM ${domain}`
    const sqlChunks: string[] = []
    sqlChunks.push(`WHERE ${this.buildRawQuery(domain, query, options)}`)
    if (options?.sort !== undefined) {
      sqlChunks.push(this.buildRawOrder(domain, options.sort))
    }
    if (options?.limit !== undefined) {
      sqlChunks.push(`LIMIT ${options.limit}`)
    }
    const finalSql: string = [select, ...sqlChunks].join(' ')
    const result: DBDoc[] = await this.mgr.read(undefined, (client) => client.unsafe(finalSql))
    return result.map((p) => parseDocWithProjection(p, domain, options?.projection))
  }

  buildRawOrder<T extends Doc>(domain: string, sort: SortingQuery<T>): string {
    const res: string[] = []
    for (const key in sort) {
      const val = sort[key]
      if (val === undefined) {
        continue
      }
      if (typeof val === 'number') {
        res.push(`${this.transformKey(domain, core.class.Doc, key, false)} ${val === 1 ? 'ASC' : 'DESC'}`)
      } else {
        // todo handle custom sorting
      }
    }
    return `ORDER BY ${res.join(', ')}`
  }

  buildRawQuery<T extends Doc>(domain: string, query: DocumentQuery<T>, options?: FindOptions<T>): string {
    const res: string[] = []
    res.push(`"workspaceId" = '${this.workspaceId}'`)
    for (const key in query) {
      const value = query[key]
      const tkey = this.transformKey(domain, core.class.Doc, key, false)
      const translated = this.translateQueryValue(tkey, value, 'common')
      if (translated !== undefined) {
        res.push(translated)
      }
    }
    return res.join(' AND ')
  }

  async rawUpdate<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    operations: DocumentUpdate<T>
  ): Promise<void> {
    const translatedQuery = this.buildRawQuery(domain, query)
    if ((operations as any).$set !== undefined) {
      ;(operations as any) = { ...(operations as any).$set }
    }
    const isOps = isOperator(operations)
    if ((operations as any)['%hash%'] === undefined) {
      ;(operations as any)['%hash%'] = null
    }
    const domainFields = new Set(getDocFieldsByDomains(domain))
    if (isOps) {
      await this.mgr.write(undefined, async (client) => {
        const res = await client.unsafe(`SELECT * FROM ${translateDomain(domain)} WHERE ${translatedQuery} FOR UPDATE`)
        const schema = getSchema(domain)
        const docs = res.map((p) => parseDoc(p as any, schema))
        for (const doc of docs) {
          if (doc === undefined) continue
          const prevAttachedTo = (doc as any).attachedTo
          TxProcessor.applyUpdate(doc, operations)
          ;(doc as any)['%hash%'] = null
          const converted = convertDoc(domain, doc, this.workspaceId, domainFields)
          const params: any[] = [doc._id, this.workspaceId]
          let paramsIndex = params.length + 1
          const updates: string[] = []
          const { extractedFields, remainingData } = parseUpdate(operations, domainFields)
          const newAttachedTo = (doc as any).attachedTo
          if (Object.keys(extractedFields).length > 0) {
            for (const key in extractedFields) {
              const val = (extractedFields as any)[key]
              if (key === 'attachedTo' && val === prevAttachedTo) continue
              updates.push(`"${key}" = $${paramsIndex++}`)
              params.push(val)
            }
          } else if (prevAttachedTo !== undefined && prevAttachedTo !== newAttachedTo) {
            updates.push(`"attachedTo" = $${paramsIndex++}`)
            params.push(newAttachedTo)
          }

          if (Object.keys(remainingData).length > 0) {
            updates.push(`data = $${paramsIndex++}`)
            params.push(converted.data)
          }
          await client.unsafe(
            `UPDATE ${translateDomain(domain)} SET ${updates.join(', ')} WHERE _id = $1 AND "workspaceId" = $2`,
            params
          )
        }
      })
    } else {
      await this.rawUpdateDoc(domain, query, operations, domainFields)
    }
  }

  private async rawUpdateDoc<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    operations: DocumentUpdate<T>,
    domainFields: Set<string>
  ): Promise<void> {
    const translatedQuery = this.buildRawQuery(domain, query)
    const updates: string[] = []
    const params: any[] = []
    let paramsIndex = params.length + 1
    const { extractedFields, remainingData } = parseUpdate(operations, domainFields)
    const { space, attachedTo, ...ops } = operations as any
    for (const key in extractedFields) {
      updates.push(`"${key}" = $${paramsIndex++}`)
      params.push((extractedFields as any)[key])
    }
    let from = 'data'
    let dataUpdated = false
    for (const key in remainingData) {
      if (ops[key] === undefined) continue
      const val = (remainingData as any)[key]
      from = `jsonb_set(${from}, '{${key}}', coalesce(to_jsonb($${paramsIndex++}${inferType(val)}), 'null') , true)`
      params.push(val)
      dataUpdated = true
    }
    if (dataUpdated) {
      updates.push(`data = ${from}`)
    }
    await this.mgr.write(undefined, async (client) => {
      await client.unsafe(
        `UPDATE ${translateDomain(domain)} SET ${updates.join(', ')} WHERE ${translatedQuery}`,
        params
      )
    })
  }

  async rawDeleteMany<T extends Doc>(domain: Domain, query: DocumentQuery<T>): Promise<void> {
    const translatedQuery = this.buildRawQuery(domain, query)
    await this.mgr.write(undefined, async (client) => {
      await client.unsafe(`DELETE FROM ${translateDomain(domain)} WHERE ${translatedQuery}`)
    })
  }

  findAll<T extends Doc>(
    ctx: MeasureContext<SessionData>,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ): Promise<FindResult<T>> {
    return ctx.with('findAll', { _class }, async () => {
      try {
        const domain = translateDomain(options?.domain ?? this.hierarchy.getDomain(_class))
        const sqlChunks: string[] = []
        const joins = this.buildJoin(_class, options?.lookup)
        if (options?.domainLookup !== undefined) {
          const baseDomain = translateDomain(this.hierarchy.getDomain(_class))

          const domain = translateDomain(options.domainLookup.domain)
          const key = options.domainLookup.field
          const as = `dl_lookup_${domain}_${key}`
          joins.push({
            isReverse: false,
            table: domain,
            path: options.domainLookup.field,
            toAlias: as,
            toField: '_id',
            fromField: key,
            fromAlias: baseDomain,
            toClass: undefined
          })
        }
        const select = `SELECT ${this.getProjection(_class, domain, options?.projection, joins)} FROM ${domain}`
        const secJoin = this.addSecurity(query, domain, ctx.contextData)
        if (secJoin !== undefined) {
          sqlChunks.push(secJoin)
        }
        if (joins.length > 0) {
          sqlChunks.push(this.buildJoinString(joins))
        }
        sqlChunks.push(`WHERE ${this.buildQuery(_class, domain, query, joins, options)}`)

        const findId = ctx.id ?? generateId()

        return (await this.mgr.read(findId, async (connection) => {
          let total = options?.total === true ? 0 : -1
          if (options?.total === true) {
            const totalReq = `SELECT COUNT(${domain}._id) as count FROM ${domain}`
            const totalSql = [totalReq, ...sqlChunks].join(' ')
            const totalResult = await connection.unsafe(totalSql)
            const parsed = Number.parseInt(totalResult[0].count)
            total = Number.isNaN(parsed) ? 0 : parsed
          }
          if (options?.sort !== undefined) {
            sqlChunks.push(this.buildOrder(_class, domain, options.sort, joins))
          }
          if (options?.limit !== undefined) {
            sqlChunks.push(`LIMIT ${options.limit}`)
          }

          const finalSql: string = [select, ...sqlChunks].join(' ')
          const result = await connection.unsafe(finalSql)
          if (options?.lookup === undefined && options?.domainLookup === undefined) {
            return toFindResult(
              result.map((p) => parseDocWithProjection(p as any, domain, options?.projection)),
              total
            )
          } else {
            const res = this.parseLookup<T>(result, joins, options?.projection, domain)
            return toFindResult(res, total)
          }
        })) as FindResult<T>
      } catch (err) {
        ctx.error('Error in findAll', { err })
        throw err
      }
    })
  }

  addSecurity<T extends Doc>(query: DocumentQuery<T>, domain: string, sessionContext: SessionData): string | undefined {
    if (sessionContext !== undefined && sessionContext.isTriggerCtx !== true) {
      if (sessionContext.admin !== true && sessionContext.account !== undefined) {
        const acc = sessionContext.account
        if (acc.role === AccountRole.DocGuest || acc.uuid === systemAccountUuid) {
          return
        }
        if (query.space === acc.uuid) return // TODO: was it for private spaces? If so, need to fix it as they are not identified by acc.uuid now
        if (domain === DOMAIN_SPACE && isOwner(acc)) return
        const key = domain === DOMAIN_SPACE ? '_id' : domain === DOMAIN_TX ? "data ->> 'objectSpace'" : 'space'
        const privateCheck = domain === DOMAIN_SPACE ? ' OR sec.private = false' : ''
        // TODO: fixme! account for any user social ids, not only primary one!
        const q = `(sec.members @> '{"${acc.primarySocialId}"}' OR sec."_class" = '${core.class.SystemSpace}'${privateCheck})`
        return `INNER JOIN ${translateDomain(DOMAIN_SPACE)} AS sec ON sec._id = ${domain}.${key} AND sec."workspaceId" = '${this.workspaceId}' AND ${q}`
      }
    }
  }

  private parseLookup<T extends Doc>(
    rows: any[],
    joins: JoinProps[],
    projection: Projection<T> | undefined,
    domain: string
  ): WithLookup<T>[] {
    const map = new Map<Ref<T>, WithLookup<T>>()
    const modelJoins: JoinProps[] = []
    const reverseJoins: JoinProps[] = []
    const simpleJoins: JoinProps[] = []
    for (const join of joins) {
      if (join.table === DOMAIN_MODEL) {
        modelJoins.push(join)
      } else if (join.isReverse) {
        reverseJoins.push(join)
      } else {
        simpleJoins.push(join)
      }
    }
    for (const row of rows) {
      /* eslint-disable @typescript-eslint/consistent-type-assertions */
      let doc: WithLookup<T> = map.get(row._id) ?? ({ _id: row._id, $lookup: {} } as WithLookup<T>)
      const lookup: Record<string, any> = doc.$lookup as Record<string, any>
      let joinIndex: number | undefined
      let skip = false
      try {
        const schema = getSchema(domain)
        for (const column in row) {
          if (column.startsWith('reverse_lookup_')) {
            if (row[column] != null) {
              const join = reverseJoins.find((j) => j.toAlias === column)
              if (join === undefined) {
                continue
              }
              const res = this.getLookupValue(join.path, lookup, false)
              if (res === undefined) continue
              const { obj, key } = res

              const parsed = row[column].map((p: any) => parseDoc(p, schema))
              obj[key] = parsed
            }
          } else if (column.startsWith('lookup_')) {
            const keys = column.split('_')
            let key = keys[keys.length - 1]
            if (keys[keys.length - 2] === '') {
              key = '_' + key
            }

            if (key === 'workspaceId') {
              continue
            }

            if (key === '_id') {
              if (row[column] === null) {
                skip = true
                continue
              }
              joinIndex = joinIndex === undefined ? 0 : ++joinIndex
              skip = false
            }

            if (skip) {
              continue
            }

            const join = simpleJoins[joinIndex ?? 0]

            const res = this.getLookupValue(join.path, lookup)
            if (res === undefined) continue
            const { obj, key: p } = res

            if (key === 'data') {
              obj[p] = { ...obj[p], ...row[column] }
            } else {
              if (key === 'attachedTo' && row[column] === 'NULL') {
                continue
              } else {
                obj[p][key] = row[column] === 'NULL' ? null : row[column]
              }
            }
          } else {
            joinIndex = undefined
            if (!map.has(row._id)) {
              if (column === 'workspaceId') {
                continue
              }
              if (column === 'data') {
                const data = row[column]
                if (projection !== undefined) {
                  if (projection !== undefined) {
                    for (const key in data) {
                      if (!Object.prototype.hasOwnProperty.call(projection, key) || (projection as any)[key] === 0) {
                        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                        delete data[key]
                      }
                    }
                  }
                }
                doc = { ...doc, ...data }
              } else {
                if (column === 'createdOn' || column === 'modifiedOn') {
                  const val = Number.parseInt(row[column])
                  ;(doc as any)[column] = Number.isNaN(val) ? null : val
                } else {
                  ;(doc as any)[column] = row[column] === 'NULL' ? null : row[column]
                }
              }
            }
          }
        }
      } catch (err) {
        console.log(err)
        throw err
      }
      for (const modelJoin of modelJoins) {
        const res = this.getLookupValue(modelJoin.path, lookup)
        if (res === undefined) continue
        const { obj, key } = res
        const val = this.getModelLookupValue<T>(doc, modelJoin, simpleJoins)
        if (val !== undefined && modelJoin.toClass !== undefined) {
          const res = this.modelDb.findAllSync(modelJoin.toClass, {
            [modelJoin.toField]: (doc as any)[modelJoin.fromField]
          })
          obj[key] = modelJoin.isReverse ? res : res[0]
        }
      }
      map.set(row._id, doc)
    }
    return Array.from(map.values())
  }

  private getLookupValue (
    fullPath: string,
    obj: Record<string, any>,
    shouldCreate: boolean = true
  ):
    | {
      obj: any
      key: string
    }
    | undefined {
    const path = fullPath.split('.')
    for (let i = 0; i < path.length; i++) {
      const p = path[i]
      if (i > 0) {
        if (obj.$lookup === undefined) {
          obj.$lookup = {}
        }
        obj = obj.$lookup
      }

      if (obj[p] === undefined) {
        if (!shouldCreate && i < path.length - 1) {
          return
        } else {
          obj[p] = {}
        }
      }
      if (i === path.length - 1) {
        return { obj, key: p }
      }
      obj = obj[p]
    }
  }

  private getModelLookupValue<T extends Doc>(doc: WithLookup<T>, join: JoinProps, simpleJoins: JoinProps[]): any {
    if (join.fromAlias.startsWith('lookup_')) {
      const simple = simpleJoins.find((j) => j.toAlias === join.fromAlias)
      if (simple !== undefined) {
        const val = this.getLookupValue(simple.path, doc.$lookup ?? {})
        if (val !== undefined) {
          const data = val.obj[val.key]
          return data[join.fromField]
        }
      }
    } else {
      return (doc as any)[join.fromField]
    }
  }

  private buildJoinString (value: JoinProps[]): string {
    const res: string[] = []
    for (const val of value) {
      if (val.isReverse) continue
      if (val.table === DOMAIN_MODEL) continue
      res.push(
        `LEFT JOIN ${val.table} AS ${val.toAlias} ON ${val.fromAlias}.${val.fromField} = ${val.toAlias}."${val.toField}" AND ${val.toAlias}."workspaceId" = '${this.workspaceId}'`
      )
      if (val.classes !== undefined) {
        if (val.classes.length === 1) {
          res.push(`AND ${val.toAlias}._class = '${val.classes[0]}'`)
        } else {
          res.push(`AND ${val.toAlias}._class IN (${val.classes.map((c) => `'${c}'`).join(', ')})`)
        }
      }
    }
    return res.join(' ')
  }

  private buildJoin<T extends Doc>(clazz: Ref<Class<T>>, lookup: Lookup<T> | undefined): JoinProps[] {
    const res: JoinProps[] = []
    if (lookup !== undefined) {
      this.buildJoinValue(clazz, lookup, res)
    }
    return res
  }

  private buildJoinValue<T extends Doc>(
    clazz: Ref<Class<T>>,
    lookup: Lookup<T>,
    res: JoinProps[],
    parentKey?: string,
    parentAlias?: string
  ): void {
    const baseDomain = parentAlias ?? translateDomain(this.hierarchy.getDomain(clazz))
    for (const key in lookup) {
      if (key === '_id') {
        this.getReverseLookupValue(baseDomain, lookup, res, parentKey)
        continue
      }
      const value = (lookup as any)[key]
      const _class = Array.isArray(value) ? value[0] : value
      const nested = Array.isArray(value) ? value[1] : undefined
      const domain = translateDomain(this.hierarchy.getDomain(_class))
      const tkey = domain === DOMAIN_MODEL ? key : this.transformKey(baseDomain, clazz, key)
      const as = `lookup_${domain}_${parentKey !== undefined ? parentKey + '_lookup_' + key : key}`
      res.push({
        isReverse: false,
        table: domain,
        path: parentKey !== undefined ? `${parentKey}.${key}` : key,
        toAlias: as,
        toField: '_id',
        fromField: tkey,
        fromAlias: baseDomain,
        toClass: _class
      })
      if (nested !== undefined) {
        this.buildJoinValue(_class, nested, res, key, as)
      }
    }
  }

  private getReverseLookupValue (
    parentDomain: string,
    lookup: ReverseLookups,
    result: JoinProps[],
    parent?: string
  ): void {
    const lid = lookup?._id ?? {}
    for (const key in lid) {
      const value = lid[key]

      let _class: Ref<Class<Doc>>
      let attr = 'attachedTo'

      if (Array.isArray(value)) {
        _class = value[0]
        attr = value[1]
      } else {
        _class = value
      }
      const domain = translateDomain(this.hierarchy.getDomain(_class))
      const desc = this.hierarchy
        .getDescendants(this.hierarchy.getBaseClass(_class))
        .filter((it) => !this.hierarchy.isMixin(it))
      const as = `reverse_lookup_${domain}_${parent !== undefined ? parent + '_lookup_' + key : key}`
      result.push({
        isReverse: true,
        table: domain,
        toAlias: as,
        toField: attr,
        classes: desc,
        path: parent !== undefined ? `${parent}.${key}` : key,
        fromAlias: parentDomain,
        toClass: _class,
        fromField: '_id'
      })
    }
  }

  private buildOrder<T extends Doc>(
    _class: Ref<Class<T>>,
    baseDomain: string,
    sort: SortingQuery<T>,
    joins: JoinProps[]
  ): string {
    const res: string[] = []
    for (const key in sort) {
      const val = sort[key]
      if (val === undefined) {
        continue
      }
      if (typeof val === 'number') {
        res.push(`${this.getKey(_class, baseDomain, key, joins)} ${val === 1 ? 'ASC' : 'DESC'}`)
      } else {
        // todo handle custom sorting
      }
    }
    return `ORDER BY ${res.join(', ')}`
  }

  private buildQuery<T extends Doc>(
    _class: Ref<Class<T>>,
    baseDomain: string,
    _query: DocumentQuery<T>,
    joins: JoinProps[],
    options?: ServerFindOptions<T>
  ): string {
    const res: string[] = []
    const query = { ..._query }
    res.push(`${baseDomain}."workspaceId" = '${this.workspaceId}'`)
    if (options?.skipClass !== true) {
      query._class = this.fillClass(_class, query) as any
    }
    for (const key in query) {
      if (options?.skipSpace === true && key === 'space') {
        continue
      }
      if (options?.skipClass === true && key === '_class') {
        continue
      }
      const value = query[key]
      if (value === undefined) continue
      const valueType = this.getValueType(_class, key)
      const tkey = this.getKey(_class, baseDomain, key, joins, valueType === 'dataArray')
      const translated = this.translateQueryValue(tkey, value, valueType)
      if (translated !== undefined) {
        res.push(translated)
      }
    }
    return res.join(' AND ')
  }

  private getValueType<T extends Doc>(_class: Ref<Class<T>>, key: string): ValueType {
    const splitted = key.split('.')
    const mixinOrKey = splitted[0]
    const domain = this.hierarchy.getDomain(_class)
    if (this.hierarchy.isMixin(mixinOrKey as Ref<Class<Doc>>)) {
      key = splitted.slice(1).join('.')
      const attr = this.hierarchy.findAttribute(mixinOrKey as Ref<Class<Doc>>, key)
      if (attr !== undefined && attr.type._class === core.class.ArrOf) {
        return isDataField(domain, key) ? 'dataArray' : 'array'
      }
      return 'common'
    } else {
      const attr = this.hierarchy.findAttribute(_class, key)
      if (attr !== undefined && attr.type._class === core.class.ArrOf) {
        return isDataField(domain, key) ? 'dataArray' : 'array'
      }
      return 'common'
    }
  }

  private fillClass<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>
  ): ObjQueryType<Doc['_class']> | undefined {
    let value: any = query._class
    const baseClass = this.hierarchy.getBaseClass(_class)
    if (baseClass !== core.class.Doc) {
      const classes = this.hierarchy.getDescendants(baseClass).filter((it) => !this.hierarchy.isMixin(it))

      // Only replace if not specified
      if (value === undefined) {
        value = { $in: classes }
      } else if (typeof value === 'string') {
        if (!classes.includes(value as Ref<Class<T>>)) {
          value = classes.length === 1 ? classes[0] : { $in: classes }
        }
      } else if (typeof value === 'object' && value !== null) {
        let descendants: Ref<Class<Doc>>[] = classes

        if (Array.isArray(value.$in)) {
          const classesIds = new Set(classes)
          descendants = value.$in.filter((c: Ref<Class<Doc>>) => classesIds.has(c))
        }

        if (value != null && Array.isArray(value.$nin)) {
          const excludedClassesIds = new Set<Ref<Class<Doc>>>(value.$nin)
          descendants = descendants.filter((c) => !excludedClassesIds.has(c))
        }

        if (value.$ne != null) {
          descendants = descendants.filter((c) => c !== value?.$ne)
        }

        const desc = descendants.filter((it: any) => !this.hierarchy.isMixin(it as Ref<Class<Doc>>))
        value = desc.length === 1 ? desc[0] : { $in: desc }
      }

      if (baseClass !== _class) {
        // Add an mixin to be exists flag
        ;(query as any)[_class] = { $exists: true }
      }
    } else {
      // No need to pass _class in case of fixed domain search.
      return undefined
    }
    if (value?.$in?.length === 1 && value?.$nin === undefined) {
      value = value.$in[0]
    }
    return value
  }

  private getKey<T extends Doc>(
    _class: Ref<Class<T>>,
    baseDomain: string,
    key: string,
    joins: JoinProps[],
    isDataArray: boolean = false
  ): string {
    if (key.startsWith('$lookup')) {
      return this.transformLookupKey(baseDomain, key, joins, isDataArray)
    }
    return `${baseDomain}.${this.transformKey(baseDomain, _class, key, isDataArray)}`
  }

  private transformLookupKey (domain: string, key: string, joins: JoinProps[], isDataArray: boolean = false): string {
    const arr = key.split('.').filter((p) => p !== '$lookup')
    const tKey = arr.pop() ?? ''
    const path = arr.join('.')
    const join = joins.find((p) => p.path === path)
    if (join === undefined) {
      throw new Error(`Can't fined join for path: ${path}`)
    }
    if (join.isReverse) {
      return `${join.toAlias}->'${tKey}'`
    }
    const res = isDataField(domain, tKey) ? (isDataArray ? `data->'${tKey}'` : `data#>>'{${tKey}}'`) : key
    return `${join.toAlias}.${res}`
  }

  private transformKey<T extends Doc>(
    domain: string,
    _class: Ref<Class<T>>,
    key: string,
    isDataArray: boolean = false
  ): string {
    if (!isDataField(domain, key)) return `"${key}"`
    const arr = key.split('.').filter((p) => p)
    let tKey = ''
    let isNestedField = false

    for (let i = 0; i < arr.length; i++) {
      const element = arr[i]
      if (element === '$lookup') {
        tKey += arr[++i] + '_lookup'
      } else if (this.hierarchy.isMixin(element as Ref<Class<Doc>>)) {
        isNestedField = true
        tKey += `${element}`
        if (i !== arr.length - 1) {
          tKey += "'->'"
        }
      } else {
        tKey += arr[i]
        if (i !== arr.length - 1) {
          tKey += ','
        }
      }
      // Check if key is belong to mixin class, we need to add prefix.
      tKey = this.checkMixinKey<T>(tKey, _class, isDataArray)
    }

    return isDataArray || isNestedField ? `data->'${tKey}'` : `data#>>'{${tKey}}'`
  }

  private checkMixinKey<T extends Doc>(key: string, _class: Ref<Class<T>>, isDataArray: boolean): string {
    if (!key.includes('.')) {
      try {
        const attr = this.hierarchy.findAttribute(_class, key)
        if (attr !== undefined && this.hierarchy.isMixin(attr.attributeOf)) {
          // It is mixin
          if (isDataArray) {
            key = `${attr.attributeOf}'->'${key}`
          } else {
            key = `${attr.attributeOf},${key}`
          }
        }
      } catch (err: any) {
        // ignore, if
      }
    }
    return key
  }

  private translateQueryValue (tkey: string, value: any, type: ValueType): string | undefined {
    if (value === null) {
      return `${tkey} IS NULL`
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // we can have multiple criteria for one field
      const res: string[] = []
      for (const operator in value) {
        const val = value[operator]
        switch (operator) {
          case '$ne':
            if (val === null) {
              res.push(`${tkey} IS NOT NULL`)
            } else {
              res.push(`${tkey} != '${val}'`)
            }
            break
          case '$gt':
            res.push(`${tkey} > '${val}'`)
            break
          case '$gte':
            res.push(`${tkey} >= '${val}'`)
            break
          case '$lt':
            res.push(`${tkey} < '${val}'`)
            break
          case '$lte':
            res.push(`${tkey} <= '${val}'`)
            break
          case '$in':
            switch (type) {
              case 'common':
                res.push(`${tkey} IN (${val.length > 0 ? val.map((v: any) => `'${v}'`).join(', ') : 'NULL'})`)
                break
              case 'array':
                res.push(`${tkey} && array[${val.length > 0 ? val.map((v: any) => `'${v}'`).join(', ') : 'NULL'}]`)
                break
              case 'dataArray':
                res.push(`${tkey} ?| array[${val.length > 0 ? val.map((v: any) => `'${v}'`).join(', ') : 'NULL'}]`)
                break
            }
            break
          case '$nin':
            if (val.length > 0) {
              res.push(`${tkey} NOT IN (${val.map((v: any) => `'${v}'`).join(', ')})`)
            }
            break
          case '$like':
            res.push(`${tkey} ILIKE '${escapeBackticks(val)}'`)
            break
          case '$exists':
            res.push(`${tkey} IS ${val === true ? 'NOT NULL' : 'NULL'}`)
            break
          case '$regex':
            res.push(`${tkey} SIMILAR TO '${escapeBackticks(val)}'`)
            break
          case '$options':
            break
          case '$all':
            res.push(`${tkey} @> ARRAY[${value}]`)
            break
          default:
            res.push(`${tkey} @> '[${JSON.stringify(value)}]'`)
            break
        }
      }
      return res.length === 0 ? undefined : res.join(' AND ')
    }
    return type === 'common'
      ? `${tkey} = '${escapeBackticks(value)}'`
      : type === 'array'
        ? `${tkey} @> '${typeof value === 'string' ? '{"' + value + '"}' : value}'`
        : `${tkey} @> '${typeof value === 'string' ? '"' + value + '"' : value}'`
  }

  private getProjectionsAliases (join: JoinProps): string[] {
    if (join.table === DOMAIN_MODEL) return []
    if (join.isReverse) {
      let classsesQuery = ''
      if (join.classes !== undefined) {
        if (join.classes.length === 1) {
          classsesQuery = ` AND ${join.toAlias}._class = '${join.classes[0]}'`
        } else {
          classsesQuery = ` AND ${join.toAlias}._class IN (${join.classes.map((c) => `'${c}'`).join(', ')})`
        }
      }
      return [
        `(SELECT jsonb_agg(${join.toAlias}.*) FROM ${join.table} AS ${join.toAlias} WHERE ${join.fromAlias}.${join.fromField} = ${join.toAlias}."${join.toField}" ${classsesQuery}) AS ${join.toAlias}`
      ]
    }
    const fields = getDocFieldsByDomains(join.table)
    const res: string[] = []
    for (const key of [...fields, 'data']) {
      res.push(`${join.toAlias}."${key}" as "lookup_${join.path.replaceAll('.', '_')}_${key}"`)
    }
    return res
  }

  private getProjection<T extends Doc>(
    _class: Ref<Class<T>>,
    baseDomain: string,
    projection: Projection<T> | undefined,
    joins: JoinProps[]
  ): string | '*' {
    if (projection === undefined && joins.length === 0) return `${baseDomain}.*`
    const res: string[] = []
    let dataAdded = false
    if (projection === undefined) {
      res.push(`${baseDomain}.*`)
    } else {
      if (projection._id === undefined) {
        res.push(`${baseDomain}."_id" AS "_id"`)
      }
      if (projection._class === undefined) {
        res.push(`${baseDomain}."_class" AS "_class"`)
      }
      for (const key in projection) {
        if (isDataField(baseDomain, key)) {
          if (!dataAdded) {
            res.push(`${baseDomain}.data as data`)
            dataAdded = true
          }
        } else {
          res.push(`${baseDomain}."${key}" AS "${key}"`)
        }
      }
    }
    for (const join of joins) {
      res.push(...this.getProjectionsAliases(join))
    }
    return res.join(', ')
  }

  async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    return []
  }

  find (_ctx: MeasureContext, domain: Domain, recheck?: boolean): StorageIterator {
    const ctx = _ctx.newChild('find', { domain })

    let initialized: boolean = false
    let client: postgres.ReservedSql
    let mode: 'hashed' | 'non_hashed' = 'hashed'
    const bulkUpdate = new Map<Ref<Doc>, string>()

    const tdomain = translateDomain(domain)
    const schema = getSchema(domain)

    const findId = generateId()

    const flush = async (flush = false): Promise<void> => {
      if (bulkUpdate.size > 1000 || flush) {
        if (bulkUpdate.size > 0) {
          const entries = Array.from(bulkUpdate.entries())
          bulkUpdate.clear()
          try {
            while (entries.length > 0) {
              const part = entries.splice(0, 200)
              const data: string[] = part.flat()
              const indexes = part.map((val, idx) => `($${2 * idx + 1}::text, $${2 * idx + 2}::text)`).join(', ')
              await ctx.with('bulk-write-find', {}, () => {
                return this.mgr.write(
                  findId,
                  async (client) =>
                    await client.unsafe(
                      `
                UPDATE ${tdomain} SET "%hash%" = update_data.hash
                FROM (values ${indexes}) AS update_data(_id, hash)
                WHERE ${tdomain}."workspaceId" = '${this.workspaceId}' AND ${tdomain}."_id" = update_data._id
              `,
                      data
                    )
                )
              })
            }
          } catch (err: any) {
            ctx.error('failed to update hash', { err })
          }
        }
      }
    }

    const workspaceId = this.workspaceId

    function createBulk (projection: string, query: string, limit = 50): AsyncGenerator<Doc[]> {
      const sql = `SELECT ${projection} FROM ${tdomain} WHERE "workspaceId" = '${workspaceId}' AND ${query}`

      return createCursorGenerator(client, sql, schema, limit)
    }
    let bulk: AsyncGenerator<Doc[]>
    let forcedRecheck = false

    return {
      next: async () => {
        if (!initialized) {
          if (client === undefined) {
            client = await this.client.reserve()
          }

          if (recheck === true) {
            await this.mgr.write(
              findId,
              async (client) =>
                await client`UPDATE ${client(tdomain)} SET "%hash%" = NULL WHERE "workspaceId" = ${this.workspaceId} AND "%hash%" IS NOT NULL`
            )
          }

          initialized = true
          await flush(true) // We need to flush, so wrong id documents will be updated.
          bulk = createBulk('_id, "%hash%"', '"%hash%" IS NOT NULL AND "%hash%" <> \'\'')
        }

        let docs = await ctx.with('next', { mode }, () => bulk.next())

        if (!forcedRecheck && docs.done !== true && docs.value?.length > 0) {
          // Check if we have wrong hash stored, and update all of them.
          forcedRecheck = true

          for (const d of docs.value) {
            const digest: string | null = (d as any)['%hash%']

            const pos = (digest ?? '').indexOf('|')
            if (pos === -1) {
              await bulk.return([]) // We need to close generator
              docs = { done: true, value: undefined }
              await this.mgr.write(
                findId,
                async (client) =>
                  await client`UPDATE ${client(tdomain)} SET "%hash%" = NULL WHERE "workspaceId" = ${this.workspaceId} AND "%hash%" IS NOT NULL`
              )
              break
            }
          }
        }

        if ((docs.done === true || docs.value.length === 0) && mode === 'hashed') {
          forcedRecheck = true
          mode = 'non_hashed'
          bulk = createBulk('*', '"%hash%" IS NULL OR "%hash%" = \'\'')
          docs = await ctx.with('next', { mode }, () => bulk.next())
        }
        if (docs.done === true || docs.value.length === 0) {
          return []
        }
        const result: DocInfo[] = []
        for (const d of docs.value) {
          result.push(toDocInfo(d, bulkUpdate))
        }
        await ctx.with('flush', {}, () => flush())
        return result
      },
      close: async () => {
        await ctx.with('flush', {}, () => flush(true))
        await bulk.return([]) // We need to close generator, just in case
        client?.release()
        ctx.end()
      }
    }
  }

  load (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return ctx.with('load', { domain }, async () => {
      if (docs.length === 0) {
        return []
      }

      return await this.mgr.read('', async (client) => {
        const res =
          await client`SELECT * FROM ${client(translateDomain(domain))} WHERE _id = ANY(${docs}) AND "workspaceId" = ${this.workspaceId}`
        return res.map((p) => parseDocWithProjection(p as any, domain))
      })
    })
  }

  upload (ctx: MeasureContext, domain: Domain, docs: Doc[]): Promise<void> {
    return ctx.with('upload', { domain }, async (ctx) => {
      const fields = getDocFieldsByDomains(domain)
      const filedsWithData = [...fields, 'data']
      const insertFields: string[] = []
      const onConflict: string[] = []
      for (const field of filedsWithData) {
        insertFields.push(`"${field}"`)
        onConflict.push(`"${field}" = EXCLUDED."${field}"`)
      }
      const insertStr = insertFields.join(', ')
      const onConflictStr = onConflict.join(', ')

      try {
        const domainFields = new Set(getDocFieldsByDomains(domain))
        const toUpload = [...docs]
        const tdomain = translateDomain(domain)
        while (toUpload.length > 0) {
          const part = toUpload.splice(0, 200)
          const values: any[] = []
          const vars: string[] = []
          let index = 1
          for (let i = 0; i < part.length; i++) {
            const doc = part[i]
            const variables: string[] = []

            const digest: string | null = (doc as any)['%hash%']
            if ('%hash%' in doc) {
              delete doc['%hash%']
            }
            const size = digest != null ? estimateDocSize(doc) : 0
            ;(doc as any)['%hash%'] = digest == null ? null : `${digest}|${size.toString(16)}`
            const d = convertDoc(domain, doc, this.workspaceId, domainFields)

            values.push(d.workspaceId)
            variables.push(`$${index++}`)
            for (const field of fields) {
              values.push(d[field])
              variables.push(`$${index++}`)
            }
            values.push(d.data)
            variables.push(`$${index++}`)
            vars.push(`(${variables.join(', ')})`)
          }

          const vals = vars.join(',')
          await this.mgr.write(
            ctx.id,
            async (client) =>
              await client.unsafe(
                `INSERT INTO ${tdomain} ("workspaceId", ${insertStr}) VALUES ${vals} 
              ON CONFLICT ("workspaceId", _id) DO UPDATE SET ${onConflictStr};`,
                values
              )
          )
        }
      } catch (err: any) {
        ctx.error('failed to upload', { err })
        throw err
      }
    })
  }

  async clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    const tdomain = translateDomain(domain)
    const toClean = [...docs]
    while (toClean.length > 0) {
      const part = toClean.splice(0, 200)
      await ctx.with('clean', {}, () => {
        return this.mgr.write(
          ctx.id,
          (client) =>
            client`DELETE FROM ${client(tdomain)} WHERE _id = ANY(${part}) AND "workspaceId" = ${this.workspaceId}`
        )
      })
    }
  }

  groupBy<T, P extends Doc>(
    ctx: MeasureContext,
    domain: Domain,
    field: string,
    query?: DocumentQuery<P>
  ): Promise<Map<T, number>> {
    const key = isDataField(domain, field) ? `data ->> '${field}'` : `"${field}"`
    return ctx.with('groupBy', { domain }, async (ctx) => {
      try {
        return await this.mgr.read(ctx.id ?? generateId(), async (connection) => {
          const result = await connection.unsafe(
            `SELECT DISTINCT ${key} as ${field}, Count(*) AS count FROM ${translateDomain(domain)} WHERE ${this.buildRawQuery(domain, query ?? {})} GROUP BY ${key}`
          )
          return new Map(result.map((r) => [r[field.toLocaleLowerCase()], parseInt(r.count)]))
        })
      } catch (err) {
        ctx.error('Error while grouping by', { domain, field })
        throw err
      }
    })
  }

  update (ctx: MeasureContext, domain: Domain, operations: Map<Ref<Doc>, DocumentUpdate<Doc>>): Promise<void> {
    const ids = Array.from(operations.keys())
    return this.mgr.write(ctx.id, async (client) => {
      try {
        const res: DBDoc[] =
          await client`SELECT * FROM ${client(translateDomain(domain))} WHERE _id = ANY(${ids}) AND "workspaceId" = ${this.workspaceId} FOR UPDATE`
        const schema = getSchema(domain)
        const docs = res.map((p) => parseDoc(p, schema))
        const map = new Map(docs.map((d) => [d._id, d]))
        const domainFields = new Set(getDocFieldsByDomains(domain))
        for (const [_id, ops] of operations) {
          const doc = map.get(_id)
          if (doc === undefined) continue
          const op = { ...ops }
          if ((op as any)['%hash%'] === undefined) {
            ;(op as any)['%hash%'] = null
          }
          TxProcessor.applyUpdate(doc, op)
          const converted = convertDoc(domain, doc, this.workspaceId, domainFields)

          const columns: string[] = []
          const { extractedFields, remainingData } = parseUpdate(op, domainFields)
          for (const key in extractedFields) {
            columns.push(key)
          }
          if (Object.keys(remainingData).length > 0) {
            columns.push('data')
          }
          columns.push('modifiedBy')
          columns.push('modifiedOn')
          await client`UPDATE ${client(translateDomain(domain))} SET ${client(
            converted,
            columns
          )} WHERE _id = ${doc._id} AND "workspaceId" = ${this.workspaceId}`
        }
      } catch (err) {
        ctx.error('Error while updating', { domain, operations, err })
        throw err
      }
    })
  }

  @withContext('insert')
  async insert (ctx: MeasureContext, domain: string, docs: Doc[]): Promise<TxResult> {
    const schema = getSchema(domain)
    const fields = Object.keys(schema)
    const filedsWithData = [...fields, 'data']
    const columns: string[] = ['workspaceId']
    for (const field of filedsWithData) {
      columns.push(field)
    }
    const domainFields = new Set(fields)
    while (docs.length > 0) {
      const part = docs.splice(0, 500)
      const values: DBDoc[] = []
      for (let i = 0; i < part.length; i++) {
        const doc = part[i]
        const d = convertDoc(domain, doc, this.workspaceId, domainFields)
        values.push(d)
      }
      await this.mgr.write(ctx.id, async (client) => {
        try {
          await client`INSERT INTO ${client(translateDomain(domain))} ${client(values, columns)}`
        } catch (err: any) {
          console.error('inserting error', err)
        }
      })
    }
    return {}
  }
}

interface OperationBulk {
  add: Doc[]
  updates: TxUpdateDoc<Doc>[]

  removes: TxRemoveDoc<Doc>[]

  mixins: TxMixin<Doc, Doc>[]
}

class PostgresAdapter extends PostgresAdapterBase {
  async init (domains?: string[], excludeDomains?: string[]): Promise<void> {
    let resultDomains = domains ?? this.hierarchy.domains()
    if (excludeDomains !== undefined) {
      resultDomains = resultDomains.filter((it) => !excludeDomains.includes(it))
    }
    await createTables(this.client, resultDomains)
    this._helper.domains = new Set(resultDomains as Domain[])
  }

  private process (ops: OperationBulk, tx: Tx): void {
    switch (tx._class) {
      case core.class.TxCreateDoc:
        ops.add.push(TxProcessor.createDoc2Doc(tx as TxCreateDoc<Doc>))
        break
      case core.class.TxUpdateDoc:
        ops.updates.push(tx as TxUpdateDoc<Doc>)
        break
      case core.class.TxRemoveDoc:
        ops.removes.push(tx as TxRemoveDoc<Doc>)
        break
      case core.class.TxMixin:
        ops.mixins.push(tx as TxMixin<Doc, Doc>)
        break
      case core.class.TxApplyIf:
        return undefined
      default:
        console.error('Unknown/Unsupported operation:', tx._class, tx)
        break
    }
  }

  private async txMixin (ctx: MeasureContext, tx: TxMixin<Doc, Doc>, domainFields: Set<string>): Promise<TxResult> {
    await ctx.with('tx-mixin', { _class: tx.objectClass, mixin: tx.mixin }, async (ctx) => {
      await this.mgr.write(ctx.id, async (client) => {
        const doc = await this.findDoc(ctx, client, tx.objectClass, tx.objectId, true)
        if (doc === undefined) return
        TxProcessor.updateMixin4Doc(doc, tx)
        ;(doc as any)['%hash%'] = null
        const domain = this.hierarchy.getDomain(tx.objectClass)
        const converted = convertDoc(domain, doc, this.workspaceId, domainFields)
        const { extractedFields } = parseUpdate(tx.attributes as Partial<Doc>, domainFields)
        const columns = new Set<string>()
        for (const key in extractedFields) {
          columns.add(key)
        }
        columns.add('modifiedBy')
        columns.add('modifiedOn')
        columns.add('data')
        await client`UPDATE ${client(translateDomain(domain))} SET ${client(converted, Array.from(columns))} WHERE _id = ${tx.objectId} AND "workspaceId" = ${this.workspaceId}`
      })
    })
    return {}
  }

  async tx (ctx: MeasureContext, ...txes: Tx[]): Promise<TxResult[]> {
    const result: TxResult[] = []

    const h = this.hierarchy
    const byDomain = groupByArray(txes, (it) => {
      if (TxProcessor.isExtendsCUD(it._class)) {
        return h.findDomain((it as TxCUD<Doc>).objectClass)
      }
      return undefined
    })
    for (const [domain, txs] of byDomain) {
      if (domain === undefined) {
        continue
      }
      const ops: OperationBulk = {
        add: [],
        mixins: [],
        removes: [],
        updates: []
      }
      for (const tx of txs) {
        this.process(ops, tx)
      }

      const domainFields = new Set(getDocFieldsByDomains(domain))
      if (ops.add.length > 0) {
        const res = await this.insert(ctx, domain, ops.add)
        if (Object.keys(res).length > 0) {
          result.push(res)
        }
      }
      // TODO: Optimize updates
      if (ops.updates.length > 0) {
        for (const upd of ops.updates) {
          const res = await this.txUpdateDoc(ctx, upd, domainFields)
          if (Object.keys(res).length > 0) {
            result.push(res)
          }
        }
      }
      // TODO: Optimize mixins
      for (const mix of ops.mixins) {
        const res = await this.txMixin(ctx, mix, domainFields)
        if (Object.keys(res).length > 0) {
          result.push(res)
        }
      }
      if (ops.removes.length > 0) {
        await this.clean(
          ctx,
          domain,
          ops.removes.map((it) => it.objectId)
        )
      }
    }

    return result
  }

  protected txUpdateDoc (ctx: MeasureContext, tx: TxUpdateDoc<Doc>, domainFields: Set<string>): Promise<TxResult> {
    return ctx.with('tx-update-doc', { _class: tx.objectClass }, (_ctx) => {
      if (isOperator(tx.operations)) {
        let doc: Doc | undefined
        const ops: any = { '%hash%': null, ...tx.operations }
        return _ctx.with(
          'update with operations',
          { operations: JSON.stringify(Object.keys(tx.operations)) },
          async (ctx) => {
            await this.mgr.write(ctx.id, async (client) => {
              doc = await this.findDoc(ctx, client, tx.objectClass, tx.objectId, true)
              if (doc === undefined) return {}
              ops.modifiedBy = tx.modifiedBy
              ops.modifiedOn = tx.modifiedOn
              TxProcessor.applyUpdate(doc, ops)
              ;(doc as any)['%hash%'] = null
              const domain = this.hierarchy.getDomain(tx.objectClass)
              const converted = convertDoc(domain, doc, this.workspaceId, domainFields)
              const columns: string[] = []
              const { extractedFields, remainingData } = parseUpdate(ops, domainFields)
              for (const key in extractedFields) {
                columns.push(key)
              }
              if (Object.keys(remainingData).length > 0) {
                columns.push('data')
              }
              await client`UPDATE ${client(translateDomain(domain))} SET ${client(converted, columns)} WHERE _id = ${tx.objectId} AND "workspaceId" = ${this.workspaceId}`
            })
            if (tx.retrieve === true && doc !== undefined) {
              return { object: doc }
            }
            return {}
          }
        )
      } else {
        return this.updateDoc(_ctx, tx, tx.retrieve ?? false, domainFields)
      }
    })
  }

  private updateDoc<T extends Doc>(
    ctx: MeasureContext,
    tx: TxUpdateDoc<T>,
    retrieve: boolean,
    domainFields: Set<string>
  ): Promise<TxResult> {
    return ctx.with('update jsonb_set', {}, async (_ctx) => {
      const updates: string[] = ['"modifiedBy" = $1', '"modifiedOn" = $2']
      const params: any[] = [tx.modifiedBy, tx.modifiedOn, tx.objectId, this.workspaceId]
      let paramsIndex = params.length + 1
      const { extractedFields, remainingData } = parseUpdate(tx.operations, domainFields)
      const { space, attachedTo, ...ops } = tx.operations as any
      if (ops['%hash%'] === undefined) {
        ops['%hash%'] = null
      }
      for (const key in extractedFields) {
        updates.push(`"${key}" = $${paramsIndex++}`)
        params.push((extractedFields as any)[key])
      }
      let from = 'data'
      let dataUpdated = false
      for (const key in remainingData) {
        if (ops[key] === undefined) continue
        const val = (remainingData as any)[key]
        from = `jsonb_set(${from}, '{${key}}', coalesce(to_jsonb($${paramsIndex++}${inferType(val)}), 'null') , true)`
        params.push(val)
        dataUpdated = true
      }
      if (dataUpdated) {
        updates.push(`data = ${from}`)
      }
      try {
        await this.mgr.write(ctx.id, async (client) => {
          await client.unsafe(
            `UPDATE ${translateDomain(this.hierarchy.getDomain(tx.objectClass))} SET ${updates.join(', ')} WHERE _id = $3 AND "workspaceId" = $4`,
            params
          )
        })
        if (retrieve) {
          return await this.mgr.read(ctx.id, async (client) => {
            const object = await this.findDoc(_ctx, client, tx.objectClass, tx.objectId)
            return { object }
          })
        }
      } catch (err) {
        console.error(err, { tx, params, updates })
      }
      return {}
    })
  }

  private findDoc (
    ctx: MeasureContext,
    client: postgres.ReservedSql | postgres.Sql,
    _class: Ref<Class<Doc>>,
    _id: Ref<Doc>,
    forUpdate: boolean = false
  ): Promise<Doc | undefined> {
    const domain = this.hierarchy.getDomain(_class)
    return ctx.with('find-doc', { _class }, async () => {
      const res =
        await client`SELECT * FROM ${client(translateDomain(domain))} WHERE _id = ${_id} AND "workspaceId" = ${this.workspaceId} ${
          forUpdate ? client` FOR UPDATE` : client``
        }`
      const dbDoc = res[0] as any
      return dbDoc !== undefined ? parseDoc(dbDoc, getSchema(domain)) : undefined
    })
  }
}

class PostgresTxAdapter extends PostgresAdapterBase implements TxAdapter {
  async init (domains?: string[], excludeDomains?: string[]): Promise<void> {
    const resultDomains = domains ?? [DOMAIN_TX, DOMAIN_MODEL_TX]
    await createTables(this.client, resultDomains)
    this._helper.domains = new Set(resultDomains as Domain[])
  }

  override async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    if (tx.length === 0) {
      return []
    }
    try {
      const modelTxes: Tx[] = []
      const baseTxes: Tx[] = []
      for (const _tx of tx) {
        if (_tx.objectSpace === core.space.Model) {
          modelTxes.push(_tx)
        } else {
          baseTxes.push(_tx)
        }
      }
      if (modelTxes.length > 0) {
        await this.insert(ctx, DOMAIN_MODEL_TX, modelTxes)
      }
      if (baseTxes.length > 0) {
        await this.insert(ctx, DOMAIN_TX, baseTxes)
      }
    } catch (err) {
      console.error(err)
    }
    return []
  }

  async getModel (ctx: MeasureContext): Promise<Tx[]> {
    const res: DBDoc[] = await this.mgr.read(
      undefined,
      (client) =>
        client`SELECT * FROM ${client(translateDomain(DOMAIN_MODEL_TX))} WHERE "workspaceId" = ${this.workspaceId} ORDER BY _id ASC, "modifiedOn" ASC`
    )

    const model = res.map((p) => parseDoc<Tx>(p, getSchema(DOMAIN_MODEL_TX)))
    // We need to put all core.account.System transactions first
    const systemTx: Tx[] = []
    const userTx: Tx[] = []

    model.forEach((tx) => (tx.modifiedBy === core.account.System && !isPersonAccount(tx) ? systemTx : userTx).push(tx))
    return systemTx.concat(userTx)
  }
}
/**
 * @public
 */
export async function createPostgresAdapter (
  ctx: MeasureContext,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceUuid,
  modelDb: ModelDb
): Promise<DbAdapter> {
  const client = getDBClient(url)
  const connection = await client.getClient()
  const adapter = new PostgresAdapter(
    connection,
    client,
    workspaceId,
    hierarchy,
    modelDb,
    'default-' + workspaceId
  )
  return adapter
}

/**
 * @public
 */
export async function createPostgresTxAdapter (
  ctx: MeasureContext,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceUuid,
  modelDb: ModelDb
): Promise<TxAdapter> {
  const client = getDBClient(url)
  const connection = await client.getClient()
  const adapter = new PostgresTxAdapter(connection, client, workspaceId, hierarchy, modelDb, 'tx' + workspaceId)
  await adapter.init()
  return adapter
}

function isPersonAccount (tx: Tx): boolean {
  return (
    (tx._class === core.class.TxCreateDoc ||
      tx._class === core.class.TxUpdateDoc ||
      tx._class === core.class.TxRemoveDoc) &&
    ((tx as TxCUD<Doc>).objectClass === 'contact:class:PersonAccount' ||
      (tx as TxCUD<Doc>).objectClass === 'contact:class:EmployeeAccount')
  )
}
