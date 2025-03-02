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
  type AssociationQuery,
  type Class,
  type Doc,
  type DocInfo,
  type DocumentQuery,
  type DocumentUpdate,
  type Domain,
  DOMAIN_MODEL,
  DOMAIN_MODEL_TX,
  DOMAIN_RELATION,
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
  RateLimiter,
  type Ref,
  type ReverseLookups,
  type SessionData,
  shouldShowArchived,
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
  type WorkspaceIds,
  type WorkspaceUuid
} from '@hcengineering/core'
import {
  calcHashHash,
  type DbAdapter,
  type DbAdapterHandler,
  type DomainHelperOperations,
  type ServerFindOptions,
  type TxAdapter
} from '@hcengineering/server-core'
import type postgres from 'postgres'
import { createDBClient, createGreenDBClient, type DBClient } from './client'
import {
  getDocFieldsByDomains,
  getSchema,
  getSchemaAndFields,
  type Schema,
  type SchemaAndFields,
  translateDomain
} from './schemas'
import { type ValueType } from './types'
import {
  convertArrayParams,
  convertDoc,
  createTables,
  DBCollectionHelper,
  type DBDoc,
  doFetchTypes,
  getDBClient,
  inferType,
  isDataField,
  isOwner,
  type JoinProps,
  NumericTypes,
  parseDoc,
  parseDocWithProjection,
  parseUpdate
} from './utils'
async function * createCursorGenerator (
  client: postgres.Sql,
  sql: string,
  params: any,
  schema: Schema,
  bulkSize = 1000
): AsyncGenerator<Doc[]> {
  const cursor = client.unsafe(sql, doFetchTypes ? params : convertArrayParams(params)).cursor(bulkSize)
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
    throw err // Rethrow the error after logging
  }
}

class ConnectionInfo {
  // It should preserve at least one available connection in pool, other connection should be closed
  available: DBClient[] = []

  released: boolean = false

  constructor (
    readonly mgrId: string,
    readonly connectionId: string,
    protected readonly client: DBClient,
    readonly managed: boolean
  ) {}

  async withReserve (reserveOrPool: boolean, action: (reservedClient: DBClient) => Promise<any>): Promise<any> {
    let reserved: DBClient | undefined

    // Check if we have at least one available connection and reserve one more if required.
    if (this.available.length === 0) {
      if (reserveOrPool) {
        reserved = await this.client.reserve()
      }
    } else {
      reserved = this.available.shift() as DBClient
    }

    try {
      // Use reserved or pool
      return await action(reserved ?? this.client)
    } catch (err: any) {
      console.error(err)
      throw err
    } finally {
      if (this.released) {
        try {
          reserved?.release()
        } catch (err: any) {
          console.error('failed to release', err)
        }
      } else {
        // after use we put into available
        if (reserved !== undefined) {
          this.available.push(reserved)
        }

        if (this.available.length > 1) {
          // We need to release any >= 1
          const toRelease = this.available.splice(1, this.available.length - 1)

          for (const r of toRelease) {
            try {
              r.release()
            } catch (err: any) {
              console.error('failed to relase', err)
            }
          }
        }
      }
    }
  }

  release (): void {
    for (const c of [...this.available]) {
      c.release()
    }
    this.available = []
  }
}

class ConnectionMgr {
  constructor (
    protected readonly client: DBClient,
    protected readonly connections: () => Map<string, ConnectionInfo>,
    readonly mgrId: string
  ) {}

  async write (id: string | undefined, fn: (client: DBClient) => Promise<any>): Promise<void> {
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
            await client.execute('BEGIN;')
            await fn(client)
            await client.execute('COMMIT;')
            return true
          } catch (err: any) {
            await client.execute('ROLLBACK;')
            console.error({ message: 'failed to process tx', error: err.message, cause: err })

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

  async retry (id: string | undefined, fn: (client: DBClient) => Promise<any>): Promise<any> {
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
            console.error({ message: 'failed to process sql', error: err.message, cause: err })
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
    const conn = this.connections().get(id)
    if (conn !== undefined) {
      conn.released = true
      this.connections().delete(id) // We need to delete first
      conn.release()
    } else {
      console.log('wrne')
    }
  }

  close (): void {
    const cnts = this.connections()
    for (const [k, conn] of Array.from(cnts.entries()).filter(
      ([, it]: [string, ConnectionInfo]) => it.mgrId === this.mgrId
    )) {
      cnts.delete(k)
      try {
        conn.release()
      } catch (err: any) {
        console.error('failed to release connection')
      }
    }
  }

  getConnection (id: string, managed: boolean = true): ConnectionInfo {
    let conn = this.connections().get(id)
    if (conn === undefined) {
      conn = new ConnectionInfo(this.mgrId, id, this.client, managed)
    }
    if (managed) {
      this.connections().set(id, conn)
    }
    return conn
  }
}

class ValuesVariables {
  index: number = 1
  values: any[] = []

  valueHashes = new Map<string, string>()

  add (value: any, type: string = ''): string {
    // Compact value if string and same
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const vkey = `${value}:${type}`
      const v = this.valueHashes.get(vkey)
      if (v !== undefined) {
        return v
      }
      this.values.push(value)
      const idx = type !== '' ? `$${this.index++}${type}` : `$${this.index++}`
      this.valueHashes.set(vkey, idx)
      return idx
    } else {
      this.values.push(value)
      return type !== '' ? `$${this.index++}${type}` : `$${this.index++}`
    }
  }

  getValues (): any[] {
    return this.values
  }

  addArray (value: any[], type: string = ''): string {
    return this.add(
      value.filter((it) => it != null),
      type
    )
  }

  addArrayI (value: any[], type: string = ''): string {
    const vals = value.filter((it) => it != null)
    if (vals.length === 0) {
      return "array['NULL']"
    }
    return this.add(vals, type)
  }

  injectVars (sql: string): string {
    const escQuote = (d: any | any[]): string => {
      if (d == null) {
        return 'NULL'
      }
      if (Array.isArray(d)) {
        return 'ARRAY[' + d.map(escQuote).join(',') + ']'
      }
      switch (typeof d) {
        case 'number':
          if (isNaN(d) || !isFinite(d)) {
            throw new Error('Invalid number value')
          }
          return d.toString()
        case 'boolean':
          return d ? 'TRUE' : 'FALSE'
        case 'string':
          return `'${d.replace(/'/g, "''")}'`
        default:
          throw new Error(`Unsupported value type: ${typeof d}`)
      }
    }
    return sql.replaceAll(/(\$\d+)/g, (_, v) => {
      return escQuote(this.getValues()[parseInt(v.substring(1)) - 1] ?? v)
    })
  }
}

abstract class PostgresAdapterBase implements DbAdapter {
  protected readonly _helper: DBCollectionHelper
  protected readonly tableFields = new Map<string, string[]>()

  protected connections = new Map<string, ConnectionInfo>()

  mgr: ConnectionMgr

  constructor (
    protected readonly client: DBClient,
    protected readonly refClient: {
      url: () => string
      close: () => void
    },
    protected readonly workspaceId: WorkspaceUuid,
    protected readonly hierarchy: Hierarchy,
    protected readonly modelDb: ModelDb,
    readonly mgrId: string
  ) {
    this._helper = new DBCollectionHelper(this.client, this.workspaceId)
    this.mgr = new ConnectionMgr(client, () => this.connections, mgrId)
  }

  reserveContext (id: string): () => void {
    if (greenURL != null) {
      // Do not reserve connection if using green
      return () => {}
    }
    const conn = this.mgr.getConnection(id, true)
    return () => {
      conn.released = true
      conn.release()
      this.connections.delete(id) // We need to delete first
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

    const vars = new ValuesVariables()
    const sqlChunks: string[] = [`SELECT * FROM ${tdomain}`]
    sqlChunks.push(`WHERE ${this.buildRawQuery(vars, tdomain, query, options)}`)
    if (options?.sort !== undefined) {
      sqlChunks.push(this.buildRawOrder(tdomain, options.sort))
    }
    if (options?.limit !== undefined) {
      sqlChunks.push(`LIMIT ${options.limit}`)
    }
    const finalSql: string = sqlChunks.join(' ')

    const rawClient = client.raw()

    const cursor: AsyncGenerator<Doc[]> = createCursorGenerator(rawClient, finalSql, vars.getValues(), schema)
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

  abstract init (
    ctx: MeasureContext,
    contextVars: Record<string, any>,
    domains?: string[],
    excludeDomains?: string[]
  ): Promise<void>

  async close (): Promise<void> {
    this.mgr.close()
    this.refClient.close()
  }

  async rawFindAll<T extends Doc>(_domain: Domain, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<T[]> {
    const domain = translateDomain(_domain)
    const vars = new ValuesVariables()
    const select = `SELECT ${this.getProjection(vars, domain, options?.projection, [], options?.associations)} FROM ${domain}`
    const sqlChunks: string[] = []
    sqlChunks.push(`WHERE ${this.buildRawQuery(vars, domain, query, options)}`)
    if (options?.sort !== undefined) {
      sqlChunks.push(this.buildRawOrder(domain, options.sort))
    }
    if (options?.limit !== undefined) {
      sqlChunks.push(`LIMIT ${options.limit}`)
    }
    const finalSql: string = [select, ...sqlChunks].join(' ')
    const result: DBDoc[] = await this.mgr.retry(undefined, (client) => client.execute(finalSql, vars.getValues()))
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

  buildRawQuery<T extends Doc>(
    vars: ValuesVariables,
    domain: string,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): string {
    const res: string[] = []
    res.push(`"workspaceId" = ${vars.add(this.workspaceId, '::uuid')}`)
    for (const key in query) {
      const value = query[key]
      const tkey = this.transformKey(domain, core.class.Doc, key, false)
      const translated = this.translateQueryValue(vars, tkey, value, 'common')
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
    const vars = new ValuesVariables()
    const translatedQuery = this.buildRawQuery(vars, domain, query)
    if ((operations as any).$set !== undefined) {
      ;(operations as any) = { ...(operations as any).$set }
    }
    const isOps = isOperator(operations)
    if ((operations as any)['%hash%'] == null) {
      ;(operations as any)['%hash%'] = this.curHash()
    }
    const schemaFields = getSchemaAndFields(domain)
    if (isOps) {
      await this.mgr.write(undefined, async (client) => {
        const res = await client.execute(
          `SELECT * FROM ${translateDomain(domain)} WHERE ${translatedQuery} FOR UPDATE`,
          vars.getValues()
        )
        const docs = res.map((p) => parseDoc(p, schemaFields.schema))
        for (const doc of docs) {
          if (doc === undefined) continue
          const prevAttachedTo = (doc as any).attachedTo
          TxProcessor.applyUpdate(doc, operations)
          ;(doc as any)['%hash%'] = this.curHash()
          const converted = convertDoc(domain, doc, this.workspaceId, schemaFields)
          const params = new ValuesVariables()
          const updates: string[] = []
          const { extractedFields, remainingData } = parseUpdate(operations, schemaFields)
          const newAttachedTo = (doc as any).attachedTo
          if (Object.keys(extractedFields).length > 0) {
            for (const key in extractedFields) {
              const val = (extractedFields as any)[key]
              if (key === 'attachedTo' && val === prevAttachedTo) continue
              updates.push(`"${key}" = ${params.add(val)}`)
            }
          } else if (prevAttachedTo !== undefined && prevAttachedTo !== newAttachedTo) {
            updates.push(`"attachedTo" = ${params.add(newAttachedTo)}`)
          }

          if (Object.keys(remainingData).length > 0) {
            updates.push(`data = ${params.add(converted.data, '::json')}`)
          }
          await client.execute(
            `UPDATE ${translateDomain(domain)} 
                    SET ${updates.join(', ')} 
                    WHERE "workspaceId" = ${params.add(this.workspaceId, '::uuid')} 
                      AND _id = ${params.add(doc._id, '::text')}`,
            params.getValues()
          )
        }
      })
    } else {
      await this.rawUpdateDoc(domain, query, operations, schemaFields)
    }
  }

  private async rawUpdateDoc<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    operations: DocumentUpdate<T>,
    schemaFields: SchemaAndFields
  ): Promise<void> {
    const vars = new ValuesVariables()
    const translatedQuery = this.buildRawQuery(vars, domain, query)
    const updates: string[] = []
    const { extractedFields, remainingData } = parseUpdate(operations, schemaFields)
    const { space, attachedTo, ...ops } = operations as any
    for (const key in extractedFields) {
      updates.push(`"${key}" = ${vars.add((extractedFields as any)[key])}`)
    }
    let from = 'data'
    let dataUpdated = false
    for (const key in remainingData) {
      if (ops[key] === undefined) continue
      const val = (remainingData as any)[key]
      from = `jsonb_set(${from}, '{${key}}', coalesce(to_jsonb(${vars.add(val)}${inferType(val)}), 'null') , true)`
      dataUpdated = true
    }
    if (dataUpdated) {
      updates.push(`data = ${from}`)
    }
    await this.mgr.retry(undefined, async (client) => {
      await client.execute(
        `UPDATE ${translateDomain(domain)} SET ${updates.join(', ')} WHERE ${translatedQuery};`,
        vars.getValues()
      )
    })
  }

  async rawDeleteMany<T extends Doc>(domain: Domain, query: DocumentQuery<T>): Promise<void> {
    const vars = new ValuesVariables()
    const translatedQuery = this.buildRawQuery(vars, domain, query)
    await this.mgr.retry(undefined, async (client) => {
      await client.execute(`DELETE FROM ${translateDomain(domain)} WHERE ${translatedQuery}`, vars.getValues())
    })
  }

  findAll<T extends Doc>(
    ctx: MeasureContext<SessionData>,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ): Promise<FindResult<T>> {
    let fquery: any = ''
    const vars = new ValuesVariables()
    return ctx.with(
      'findAll',
      {},
      async () => {
        try {
          const domain = translateDomain(options?.domain ?? this.hierarchy.getDomain(_class))
          const sqlChunks: string[] = []

          const joins = this.buildJoins<T>(_class, options)
          // Add workspace name as $1

          const select = `SELECT ${this.getProjection(vars, domain, options?.projection, joins, options?.associations)} FROM ${domain}`

          const showArchived = shouldShowArchived(query, options)
          const secJoin = this.addSecurity(vars, query, showArchived, domain, ctx.contextData)
          if (secJoin !== undefined) {
            sqlChunks.push(secJoin)
          }
          if (joins.length > 0) {
            sqlChunks.push(this.buildJoinString(vars, joins))
          }
          sqlChunks.push(`WHERE ${this.buildQuery(vars, _class, domain, query, joins, options)}`)

          if (options?.sort !== undefined) {
            sqlChunks.push(this.buildOrder(_class, domain, options.sort, joins))
          }
          if (options?.limit !== undefined) {
            sqlChunks.push(`LIMIT ${options.limit}`)
          }

          return (await this.mgr.retry(ctx.id, async (connection) => {
            let total = options?.total === true ? 0 : -1
            if (options?.total === true) {
              const pvars = new ValuesVariables()
              const showArchived = shouldShowArchived(query, options)
              const secJoin = this.addSecurity(pvars, query, showArchived, domain, ctx.contextData)
              const totalChunks: string[] = []
              if (secJoin !== undefined) {
                totalChunks.push(secJoin)
              }
              const joins = this.buildJoin(_class, options?.lookup)
              if (joins.length > 0) {
                totalChunks.push(this.buildJoinString(pvars, joins))
              }
              totalChunks.push(`WHERE ${this.buildQuery(pvars, _class, domain, query, joins, options)}`)

              const totalReq = `SELECT COUNT(${domain}._id) as count FROM ${domain}`
              const totalSql = [totalReq, ...totalChunks].join(' ')
              const totalResult = await connection.execute(totalSql, pvars.getValues())
              const parsed = Number.parseInt(totalResult[0].count)
              total = Number.isNaN(parsed) ? 0 : parsed
            }

            const finalSql: string = [select, ...sqlChunks].join(' ')
            fquery = finalSql

            const result = await connection.execute(finalSql, vars.getValues())
            if (
              options?.lookup === undefined &&
              options?.domainLookup === undefined &&
              options?.associations === undefined
            ) {
              return toFindResult(
                result.map((p) => parseDocWithProjection(p, domain, options?.projection)),
                total
              )
            } else {
              const res = this.parseLookup<T>(result, joins, options?.projection, domain)
              return toFindResult(res, total)
            }
          })) as FindResult<T>
        } catch (err) {
          const sqlFull = vars.injectVars(fquery)
          ctx.error('Error in findAll', { err, sql: fquery, sqlFull })
          throw err
        }
      },
      () => ({
        query,
        psql: fquery
          .replace(/\s+/g, ' ')
          .replace(/(FROM|WHERE|ORDER BY|GROUP BY|LIMIT|OFFSET|LEFT JOIN|RIGHT JOIN|INNER JOIN|JOIN)/gi, '\n$1')
          .split('\n'),
        sql: vars.injectVars(fquery)
      })
    )
  }

  private buildJoins<T extends Doc>(_class: Ref<Class<T>>, options: ServerFindOptions<T> | undefined): JoinProps[] {
    const joins = this.buildJoin(_class, options?.lookup)
    if (options?.domainLookup !== undefined) {
      const baseDomain = translateDomain(this.hierarchy.getDomain(_class))

      const domain = translateDomain(options.domainLookup.domain)
      const key = options.domainLookup.field
      const as = `lookup_${domain}_${key}`
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
    return joins
  }

  addSecurity<T extends Doc>(
    vars: ValuesVariables,
    query: DocumentQuery<T>,
    showArchived: boolean,
    domain: string,
    sessionContext: SessionData
  ): string | undefined {
    if (sessionContext !== undefined && sessionContext.isTriggerCtx !== true) {
      if (sessionContext.admin !== true && sessionContext.account !== undefined) {
        const acc = sessionContext.account
        if (acc.role === AccountRole.DocGuest || acc.uuid === systemAccountUuid) {
          return
        }
        if (query.space === acc.uuid) return // TODO: was it for private spaces? If so, need to fix it as they are not identified by acc.uuid now
        if (domain === DOMAIN_SPACE && isOwner(acc) && showArchived) return
        const key = domain === DOMAIN_SPACE ? '_id' : domain === DOMAIN_TX ? "data ->> 'objectSpace'" : 'space'
        const privateCheck = domain === DOMAIN_SPACE ? ' OR sec.private = false' : ''
        const archivedCheck = showArchived ? '' : ' AND sec.archived = false'
        const q = `(sec.members @> '{"${acc.uuid}"}' OR sec."_class" = '${core.class.SystemSpace}'${privateCheck})${archivedCheck}`
        return `INNER JOIN ${translateDomain(DOMAIN_SPACE)} AS sec ON sec._id = ${domain}.${key} AND sec."workspaceId" = ${vars.add(this.workspaceId, '::uuid')} AND ${q}`
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
      } else if (join.path !== '') {
        simpleJoins.push(join)
      }
    }
    for (const row of rows) {
      /* eslint-disable @typescript-eslint/consistent-type-assertions */
      let doc: WithLookup<T> = map.get(row._id) ?? ({ _id: row._id, $lookup: {}, $associations: {} } as WithLookup<T>)
      const associations: Record<string, any> = doc.$associations as Record<string, any>
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
            if (join === undefined) {
              continue
            }
            const res = this.getLookupValue(join.path, lookup)
            if (res === undefined) continue
            const { obj, key: p } = res

            if (key === 'data') {
              obj[p] = { ...obj[p], ...row[column] }
            } else {
              if (key === 'createdOn' || key === 'modifiedOn') {
                const val = Number.parseInt(row[column])
                obj[p][key] = Number.isNaN(val) ? null : val
              } else if (key === '%hash%') {
                continue
              } else if (key === 'attachedTo' && row[column] === 'NULL') {
                continue
              } else {
                obj[p][key] = row[column] === 'NULL' ? null : row[column]
              }
            }
          } else if (column.startsWith('assoc_')) {
            if (row[column] == null) continue
            const keys = column.split('_')
            const key = keys[keys.length - 1]
            const associationDomain = keys[1]
            const associationSchema = getSchema(associationDomain)
            const parsed = row[column].map((p: any) => parseDoc(p, associationSchema))
            associations[key] = parsed
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
                } else if (column === '%hash%') {
                  // Ignore
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

  private buildJoinString (vars: ValuesVariables, value: JoinProps[]): string {
    const res: string[] = []
    for (const val of value) {
      if (val.isReverse) continue
      if (val.table === DOMAIN_MODEL) continue
      res.push(
        `LEFT JOIN ${val.table} AS ${val.toAlias} ON ${val.fromAlias}.${val.fromField} = ${val.toAlias}."${val.toField}" AND ${val.toAlias}."workspaceId" = ${vars.add(this.workspaceId, '::uuid')}`
      )
      if (val.classes !== undefined) {
        if (val.classes.length === 1) {
          res.push(`AND ${val.toAlias}._class = ${vars.add(val.classes[0], '::text')}`)
        } else {
          res.push(`AND ${val.toAlias}._class = ANY (${vars.addArray(val.classes, '::text[]')})`)
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
        const attr = this.hierarchy.findAttribute(_class, key)
        if (attr !== undefined && NumericTypes.includes(attr.type._class)) {
          res.push(`(${this.getKey(_class, baseDomain, key, joins)})::numeric ${val === 1 ? 'ASC' : 'DESC'}`)
        } else {
          res.push(`${this.getKey(_class, baseDomain, key, joins)} ${val === 1 ? 'ASC' : 'DESC'}`)
        }
      } else {
        // todo handle custom sorting
      }
    }
    return `ORDER BY ${res.join(', ')}`
  }

  private buildQuery<T extends Doc>(
    vars: ValuesVariables,
    _class: Ref<Class<T>>,
    baseDomain: string,
    _query: DocumentQuery<T>,
    joins: JoinProps[],
    options?: ServerFindOptions<T>
  ): string {
    const res: string[] = []
    const query = { ..._query }
    res.push(`${baseDomain}."workspaceId" = ${vars.add(this.workspaceId, '::uuid')}`)
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
      const translated = this.translateQueryValue(vars, tkey, value, valueType)
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
    if (isDataField(domain, tKey)) {
      if (isDataArray) {
        return `${join.toAlias}."data"->'${tKey}'`
      }
      return `${join.toAlias}."data"#>>'{${tKey}}'`
    }
    return `${join.toAlias}."${tKey}"`
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

  private translateQueryValue (vars: ValuesVariables, tkey: string, value: any, type: ValueType): string | undefined {
    const tkeyData = tkey.includes('data') && (tkey.includes('->') || tkey.includes('#>>'))
    if (tkeyData && (Array.isArray(value) || (typeof value !== 'object' && typeof value !== 'string'))) {
      value = Array.isArray(value) ? value.map((it) => (it == null ? null : `${it}`)) : `${value}`
    }

    if (value === null) {
      return `${tkey} IS NULL`
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // we can have multiple criteria for one field
      const res: string[] = []
      for (const operator in value) {
        let val = value[operator]
        if (tkeyData && (Array.isArray(val) || (typeof val !== 'object' && typeof val !== 'string'))) {
          val = Array.isArray(val) ? val.map((it) => (it == null ? null : `${it}`)) : `${val}`
        }
        switch (operator) {
          case '$ne':
            if (val === null) {
              res.push(`${tkey} IS NOT NULL`)
            } else {
              res.push(`${tkey} != ${vars.add(val, inferType(val))}`)
            }
            break
          case '$gt':
            res.push(`${tkey} > ${vars.add(val, inferType(val))}`)
            break
          case '$gte':
            res.push(`${tkey} >= ${vars.add(val, inferType(val))}`)
            break
          case '$lt':
            res.push(`${tkey} < ${vars.add(val, inferType(val))}`)
            break
          case '$lte':
            res.push(`${tkey} <= ${vars.add(val, inferType(val))}`)
            break
          case '$in':
            switch (type) {
              case 'common':
                if (Array.isArray(val) && val.includes(null)) {
                  const vv = vars.addArray(val, inferType(val))
                  res.push(`(${tkey} = ANY(${vv}) OR ${tkey} IS NULL)`)
                } else {
                  if (val.length > 0) {
                    res.push(`${tkey} = ANY(${vars.addArray(val, inferType(val))})`)
                  } else {
                    res.push(`${tkey} IN ('NULL')`)
                  }
                }
                break
              case 'array':
                {
                  const vv = vars.addArrayI(val, inferType(val))
                  res.push(`${tkey} && ${vv}`)
                }
                break
              case 'dataArray':
                {
                  const vv = vars.addArrayI(val, inferType(val))
                  res.push(`${tkey} ?| ${vv}`)
                }
                break
            }
            break
          case '$nin':
            if (Array.isArray(val) && val.includes(null)) {
              res.push(`(${tkey} != ALL(${vars.addArray(val, inferType(val))}) AND ${tkey} IS NOT NULL)`)
            } else if (Array.isArray(val) && val.length > 0) {
              res.push(`${tkey} != ALL(${vars.addArray(val, inferType(val))})`)
            }
            break
          case '$like':
            res.push(`${tkey} ILIKE ${vars.add(val, inferType(val))}`)
            break
          case '$exists':
            res.push(`${tkey} IS ${val === true || val === 'true' ? 'NOT NULL' : 'NULL'}`)
            break
          case '$regex':
            res.push(`${tkey} SIMILAR TO ${vars.add(val, inferType(val))}`)
            break
          case '$options':
            break
          case '$all':
            res.push(`${tkey} @> ${vars.addArray(value, inferType(value))}`)
            break
          default:
            res.push(`${tkey} @> '[${JSON.stringify(value)}]'`)
            break
        }
      }
      return res.length === 0 ? undefined : res.join(' AND ')
    }

    return type === 'common'
      ? `${tkey} = ${vars.add(value, inferType(value))}`
      : type === 'array'
        ? `${tkey} @> '${typeof value === 'string' ? '{"' + value + '"}' : value}'`
        : `${tkey} @> '${typeof value === 'string' ? '"' + value + '"' : value}'`
  }

  private getReverseProjection (vars: ValuesVariables, join: JoinProps): string[] {
    let classsesQuery = ''
    if (join.classes !== undefined) {
      if (join.classes.length === 1) {
        classsesQuery = ` AND ${join.toAlias}._class = ${vars.add(join.classes[0])}`
      } else {
        classsesQuery = ` AND ${join.toAlias}._class = ANY (${vars.add(join.classes, '::text[]')})`
      }
    }
    return [
      `(SELECT jsonb_agg(${join.toAlias}.*) FROM ${join.table} AS ${join.toAlias} WHERE ${join.fromAlias}.${join.fromField} = ${join.toAlias}."${join.toField}" ${classsesQuery}) AS ${join.toAlias}`
    ]
  }

  private getProjectionsAliases (vars: ValuesVariables, join: JoinProps): string[] {
    if (join.table === DOMAIN_MODEL) return []
    if (join.path === '') return []
    if (join.isReverse) return this.getReverseProjection(vars, join)
    const fields = getDocFieldsByDomains(join.table)
    const res: string[] = []
    for (const key of [...fields, 'data']) {
      res.push(`${join.toAlias}."${key}" as "${join.toAlias}_${key}"`)
    }
    return res
  }

  getAssociationsProjections (vars: ValuesVariables, baseDomain: string, associations: AssociationQuery[]): string[] {
    const res: string[] = []
    for (const association of associations) {
      const _id = association[0]
      const assoc = this.modelDb.findObject(_id)
      if (assoc === undefined) {
        continue
      }
      const isReverse = association[1] === -1
      const _class = isReverse ? assoc.classA : assoc.classB
      const tagetDomain = translateDomain(this.hierarchy.getDomain(_class))
      const keyA = isReverse ? 'docB' : 'docA'
      const keyB = isReverse ? 'docA' : 'docB'
      const wsId = vars.add(this.workspaceId, '::uuid')
      res.push(
        `(SELECT jsonb_agg(assoc.*) 
          FROM ${tagetDomain} AS assoc 
          JOIN ${translateDomain(DOMAIN_RELATION)} as relation 
          ON relation."${keyB}" = assoc."_id" 
          AND relation."workspaceId" = ${wsId}
          WHERE relation."${keyA}" = ${translateDomain(baseDomain)}."_id" 
          AND assoc."workspaceId" = ${wsId}) AS assoc_${tagetDomain}_${association[0]}`
      )
    }
    return res
  }

  @withContext('get-domain-hash')
  async getDomainHash (ctx: MeasureContext, domain: Domain): Promise<string> {
    return await calcHashHash(ctx, domain, this)
  }

  curHash (): string {
    return Date.now().toString(16) // Current hash value
  }

  private getProjection<T extends Doc>(
    vars: ValuesVariables,
    baseDomain: string,
    projection: Projection<T> | undefined,
    joins: JoinProps[],
    associations: AssociationQuery[] | undefined
  ): string | '*' {
    if (projection === undefined && joins.length === 0 && associations === undefined) return `${baseDomain}.*`
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
      res.push(...this.getProjectionsAliases(vars, join))
    }
    if (associations !== undefined) {
      res.push(...this.getAssociationsProjections(vars, baseDomain, associations))
    }
    return res.join(', ')
  }

  async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    return []
  }

  stripHash<T extends Doc>(docs: T | T[]): T | T[] {
    if (Array.isArray(docs)) {
      docs.forEach((it) => {
        if ('%hash%' in it) {
          delete it['%hash%']
        }
        return it
      })
    } else if (typeof docs === 'object' && docs != null) {
      if ('%hash%' in docs) {
        delete docs['%hash%']
      }
    }
    return docs
  }

  strimSize (str?: string): string {
    if (str == null) {
      return ''
    }
    const pos = str.indexOf('|')
    if (pos > 0) {
      return str.substring(0, pos)
    }
    return str
  }

  find (_ctx: MeasureContext, domain: Domain): StorageIterator {
    const ctx = _ctx.newChild('find', { domain })

    let initialized: boolean = false
    let client: DBClient

    const tdomain = translateDomain(domain)
    const schema = getSchema(domain)

    const workspaceId = this.workspaceId

    function createBulk (projection: string, limit = 50000): AsyncGenerator<Doc[]> {
      const sql = `
        SELECT ${projection}
        FROM ${tdomain}
        WHERE "workspaceId" = '${workspaceId}'
      `

      return createCursorGenerator(client.raw(), sql, undefined, schema, limit)
    }
    let bulk: AsyncGenerator<Doc[]>

    return {
      next: async () => {
        if (!initialized) {
          if (client === undefined) {
            client = await this.client.reserve()
          }
          initialized = true
          bulk = createBulk('_id, "%hash%"')
        }

        const docs = await ctx.with('next', {}, () => bulk.next())
        if (docs.done === true || docs.value.length === 0) {
          return []
        }
        const result: DocInfo[] = []
        for (const d of docs.value) {
          result.push({
            id: d._id,
            hash: this.strimSize((d as any)['%hash%'])
          })
        }
        return result
      },
      close: async () => {
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

      return await this.mgr.retry('', async (client) => {
        const res = await client.execute(
          `SELECT * 
          FROM ${translateDomain(domain)}
          WHERE "workspaceId" = $1::uuid 
                    AND _id = ANY($2::text[])`,
          [this.workspaceId, docs]
        )
        return res.map((p) => parseDocWithProjection(p, domain))
      })
    })
  }

  upload (ctx: MeasureContext, domain: Domain, docs: Doc[], handleConflicts: boolean = true): Promise<void> {
    return ctx.with('upload', { domain }, async (ctx) => {
      const schemaFields = getSchemaAndFields(domain)
      const filedsWithData = [...schemaFields.fields, 'data']

      const insertFields = filedsWithData.map((field) => `"${field}"`)
      const onConflict = handleConflicts ? filedsWithData.map((field) => `"${field}" = EXCLUDED."${field}"`) : []

      const insertStr = insertFields.join(', ')
      const onConflictStr = onConflict.join(', ')

      try {
        const tdomain = translateDomain(domain)
        const batchSize = 200
        for (let i = 0; i < docs.length; i += batchSize) {
          const part = docs.slice(i, i + batchSize)
          const values = new ValuesVariables()
          const vars: string[] = []
          const wsId = values.add(this.workspaceId, '::uuid')
          for (const doc of part) {
            if (!('%hash%' in doc) || doc['%hash%'] === '' || doc['%hash%'] == null) {
              ;(doc as any)['%hash%'] = this.curHash() // We need to set current hash
            }
            const d = convertDoc(domain, doc, this.workspaceId, schemaFields)
            const variables = [
              wsId,
              ...schemaFields.fields.map((field) => values.add(d[field], `::${schemaFields.schema[field].type}`)),
              values.add(d.data, '::json')
            ]
            vars.push(`(${variables.join(', ')})`)
          }

          const vals = vars.join(',')
          const query = `INSERT INTO ${tdomain} ("workspaceId", ${insertStr}) VALUES ${vals} ${
            handleConflicts ? `ON CONFLICT ("workspaceId", _id) DO UPDATE SET ${onConflictStr}` : ''
          };`
          await this.mgr.retry(ctx.id, async (client) => await client.execute(query, values.getValues()))
        }
      } catch (err: any) {
        ctx.error('failed to upload', { err })
        throw err
      }
    })
  }

  async clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    const tdomain = translateDomain(domain)
    const batchSize = 2500
    const query = `DELETE FROM ${tdomain} WHERE "workspaceId" = $1 AND _id = ANY($2::text[])`

    for (let i = 0; i < docs.length; i += batchSize) {
      const part = docs.slice(i, i + batchSize)
      await ctx.with('clean', {}, () => {
        const params = [this.workspaceId, part]
        return this.mgr.retry(ctx.id, (client) => client.execute(query, params))
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
        const vars = new ValuesVariables()
        const sqlChunks: string[] = [
          `SELECT ${key} as _${field}, Count(*) AS count`,
          `FROM ${translateDomain(domain)}`,
          `WHERE ${this.buildRawQuery(vars, domain, query ?? {})}`,
          `GROUP BY _${field}`
        ]
        const finalSql = sqlChunks.join(' ')
        return await this.mgr.retry(ctx.id, async (connection) => {
          const result = await connection.execute(finalSql, vars.getValues())
          return new Map(result.map((r) => [r[`_${field.toLowerCase()}`], r.count]))
        })
      } catch (err) {
        ctx.error('Error while grouping by', { domain, field })
        throw err
      }
    })
  }

  @withContext('insert')
  async insert (ctx: MeasureContext, domain: string, docs: Doc[]): Promise<TxResult> {
    await this.upload(ctx, domain as Domain, docs, false)
    return {}
  }
}

interface OperationBulk {
  add: Doc[]
  updates: TxUpdateDoc<Doc>[]

  removes: TxRemoveDoc<Doc>[]

  mixins: TxMixin<Doc, Doc>[]
}

const initRateLimit = new RateLimiter(1)

export class PostgresAdapter extends PostgresAdapterBase {
  async init (
    ctx: MeasureContext,
    contextVars: Record<string, any>,
    domains?: string[],
    excludeDomains?: string[]
  ): Promise<void> {
    this.connections = contextVars.cntInfoPG ?? new Map<string, ConnectionInfo>()
    contextVars.cntInfoPG = this.connections
    let resultDomains = [...(domains ?? this.hierarchy.domains()), 'kanban']
    if (excludeDomains !== undefined) {
      resultDomains = resultDomains.filter((it) => !excludeDomains.includes(it))
    }
    const url = this.refClient.url()
    await initRateLimit.exec(async () => {
      await createTables(ctx, this.client.raw(), url, resultDomains)
    })
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

  private async txMixin (ctx: MeasureContext, tx: TxMixin<Doc, Doc>, schemaFields: SchemaAndFields): Promise<TxResult> {
    await ctx.with('tx-mixin', { _class: tx.objectClass, mixin: tx.mixin }, async (ctx) => {
      await this.mgr.write(ctx.id, async (client) => {
        const doc = await this.findDoc(ctx, client, tx.objectClass, tx.objectId, true)
        if (doc === undefined) return
        TxProcessor.updateMixin4Doc(doc, tx)
        ;(doc as any)['%hash%'] = this.curHash()
        const domain = this.hierarchy.getDomain(tx.objectClass)
        const converted = convertDoc(domain, doc, this.workspaceId, schemaFields)
        const { extractedFields } = parseUpdate(tx.attributes as Partial<Doc>, schemaFields)

        const params = new ValuesVariables()

        const wsId = params.add(this.workspaceId, '::uuid')
        const oId = params.add(tx.objectId, '::text')
        const updates: string[] = []
        for (const key of new Set([...Object.keys(extractedFields), ...['modifiedOn', 'modifiedBy', '%hash%']])) {
          const val = (doc as any)[key]
          updates.push(`"${key}" = ${params.add(val, `::${schemaFields.schema[key].type}`)}`)
        }
        updates.push(`data = ${params.add(converted.data, '::json')}`)
        await client.execute(
          `UPDATE ${translateDomain(domain)} 
          SET ${updates.join(', ')}  
          WHERE "workspaceId" = ${wsId} AND _id = ${oId}`,
          params.getValues()
        )
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

      const domainFields = getSchemaAndFields(domain)
      if (ops.add.length > 0) {
        const res = await this.insert(ctx, domain, ops.add)
        if (Object.keys(res).length > 0) {
          result.push(res)
        }
      }

      if (ops.updates.length > 0) {
        const res = await this.txUpdateDoc(ctx, domain, ops.updates, domainFields)
        for (const r of res) {
          if (Object.keys(r).length > 0) {
            result.push(r)
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

  protected async txUpdateDoc (
    ctx: MeasureContext,
    domain: Domain,
    txes: TxUpdateDoc<Doc>[],
    schemaFields: SchemaAndFields
  ): Promise<TxResult[]> {
    const byOperator = groupByArray(txes, (it) => isOperator(it.operations))

    const withOperator = byOperator.get(true)
    const withoutOperator = byOperator.get(false)

    const result: TxResult[] = []
    const tdomain = translateDomain(domain)
    for (const tx of withOperator ?? []) {
      let doc: Doc | undefined
      const ops: any = { '%hash%': this.curHash(), ...tx.operations }
      result.push(
        await ctx.with('tx-update-doc', { _class: tx.objectClass }, async (ctx) => {
          await this.mgr.write(ctx.id, async (client) => {
            doc = await this.findDoc(ctx, client, tx.objectClass, tx.objectId, true)
            if (doc === undefined) return {}
            ops.modifiedBy = tx.modifiedBy
            ops.modifiedOn = tx.modifiedOn
            TxProcessor.applyUpdate(doc, ops)
            ;(doc as any)['%hash%'] = this.curHash()
            const converted = convertDoc(domain, doc, this.workspaceId, schemaFields)
            const updates: string[] = []
            const params = new ValuesVariables()

            const { extractedFields, remainingData } = parseUpdate(ops, schemaFields)

            const wsId = params.add(this.workspaceId, '::uuid')
            const oId = params.add(tx.objectId, '::text')

            for (const key of new Set([...Object.keys(extractedFields), ...['modifiedOn', 'modifiedBy', '%hash%']])) {
              const val = (doc as any)[key]
              updates.push(`"${key}" = ${params.add(val, `::${schemaFields.schema[key].type}`)}`)
            }
            if (Object.keys(remainingData).length > 0) {
              updates.push(`data = ${params.add(converted.data, '::json')}`)
            }
            await client.execute(
              `UPDATE ${tdomain} 
              SET ${updates.join(', ')}  
              WHERE "workspaceId" = ${wsId} 
                AND _id = ${oId}`,
              params.getValues()
            )
          })
          if (tx.retrieve === true && doc !== undefined) {
            return { object: doc }
          }
          return {}
        })
      )
    }
    if ((withoutOperator ?? [])?.length > 0) {
      result.push(...(await this.updateDoc(ctx, domain, withoutOperator ?? [], schemaFields)))
    }
    return result
  }

  private updateDoc<T extends Doc>(
    ctx: MeasureContext,
    domain: Domain,
    txes: TxUpdateDoc<T>[],
    schemaFields: SchemaAndFields
  ): Promise<TxResult[]> {
    return ctx.with('update jsonb_set', {}, async (_ctx) => {
      const operations: {
        objectClass: Ref<Class<Doc>>
        objectId: Ref<Doc>
        updates: string[]
        fields: string[]
        params: any[]
        retrieve: boolean
      }[] = []

      for (const tx of txes) {
        const fields: string[] = ['modifiedBy', 'modifiedOn', '%hash%']
        const updates: string[] = ['"modifiedBy" = $2', '"modifiedOn" = $3', '"%hash%" = $4']
        const params: any[] = [tx.modifiedBy, tx.modifiedOn, this.curHash()]
        let paramsIndex = params.length
        const { extractedFields, remainingData } = parseUpdate(tx.operations, schemaFields)
        const { space, attachedTo, ...ops } = tx.operations as any
        for (const key in extractedFields) {
          fields.push(key)
          updates.push(`"${key}" = $${paramsIndex++}`)
          params.push((extractedFields as any)[key])
        }
        if (Object.keys(remainingData).length > 0) {
          const jsonData: Record<string, any> = {}
          // const vals: string[] = []
          for (const key in remainingData) {
            if (ops[key] === undefined) continue
            const val = (remainingData as any)[key]
            jsonData[key] = val
          }
          fields.push('data')
          params.push(jsonData)
          updates.push(`data = COALESCE(data || $${paramsIndex++}::jsonb)`)
        }
        operations.push({
          objectClass: tx.objectClass,
          objectId: tx.objectId,
          updates,
          fields,
          params,
          retrieve: tx.retrieve ?? false
        })
      }
      const tdomain = translateDomain(domain)
      const result: TxResult[] = []
      try {
        const schema = getSchema(domain)
        const groupedUpdates = groupByArray(operations, (it) => it.fields.join(','))
        for (const groupedOps of groupedUpdates.values()) {
          for (let i = 0; i < groupedOps.length; i += 200) {
            const part = groupedOps.slice(i, i + 200)
            let idx = 1
            const indexes: string[] = []
            const data: any[] = []
            data.push(this.workspaceId)
            for (const op of part) {
              indexes.push(
                `($${++idx}::${schema._id.type ?? 'text'}, ${op.fields.map((it) => (it === 'data' ? `$${++idx}::jsonb` : `$${++idx}::${schema[it].type ?? 'text'}`)).join(',')})`
              )
              data.push(op.objectId)
              data.push(...op.params)
            }
            const op = `UPDATE ${tdomain} SET ${part[0].fields.map((it) => (it === 'data' ? 'data = COALESCE(data || update_data._data)' : `"${it}" = update_data."_${it}"`)).join(', ')}
            FROM (values ${indexes.join(',')}) AS update_data(__id, ${part[0].fields.map((it) => `"_${it}"`).join(',')})
            WHERE "workspaceId" = $1::uuid AND "_id" = update_data.__id`

            await this.mgr.retry(ctx.id, (client) => ctx.with('bulk-update', {}, () => client.execute(op, data)))
          }
        }
        const toRetrieve = operations.filter((it) => it.retrieve)
        if (toRetrieve.length > 0) {
          await this.mgr.retry(ctx.id, async (client) => {
            for (const op of toRetrieve) {
              const object = await this.findDoc(_ctx, client, op.objectClass, op.objectId)
              result.push({ object })
            }
          })
        }
      } catch (err: any) {
        ctx.error('failed to update docs', { err })
      }
      return result
    })
  }

  private findDoc (
    ctx: MeasureContext,
    client: DBClient,
    _class: Ref<Class<Doc>>,
    _id: Ref<Doc>,
    forUpdate: boolean = false
  ): Promise<Doc | undefined> {
    const domain = this.hierarchy.getDomain(_class)
    return ctx.with('find-doc', { _class }, async () => {
      const res = await client.execute(
        `SELECT * FROM "${translateDomain(domain)}" WHERE "workspaceId" = $1::uuid AND _id = $2::text ${
          forUpdate ? ' FOR UPDATE' : ''
        }`,
        [this.workspaceId, _id]
      )
      const dbDoc = res[0]
      return dbDoc !== undefined ? parseDoc(dbDoc, getSchema(domain)) : undefined
    })
  }
}

class PostgresTxAdapter extends PostgresAdapterBase implements TxAdapter {
  async init (
    ctx: MeasureContext,
    contextVars: Record<string, any>,
    domains?: string[],
    excludeDomains?: string[]
  ): Promise<void> {
    this.connections = contextVars.cntInfoPG ?? new Map<string, ConnectionInfo>()
    contextVars.cntInfoPG = this.connections

    const resultDomains = domains ?? [DOMAIN_TX, DOMAIN_MODEL_TX]
    await initRateLimit.exec(async () => {
      const url = this.refClient.url()
      await createTables(ctx, this.client.raw(), url, resultDomains)
    })
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
    const res: DBDoc[] = await this.mgr.retry(undefined, (client) => {
      const query = `
        SELECT * 
        FROM "${translateDomain(DOMAIN_MODEL_TX)}" 
        WHERE "workspaceId" = $1::uuid 
        ORDER BY _id::text ASC, "modifiedOn"::bigint ASC
      `
      return client.execute(query, [this.workspaceId])
    })

    const model = res.map((p) => parseDoc<Tx>(p, getSchema(DOMAIN_MODEL_TX)))
    // We need to put all core.account.System transactions first
    const systemTx: Tx[] = []
    const userTx: Tx[] = []

    model.forEach((tx) => (tx.modifiedBy === core.account.System && !isPersonAccount(tx) ? systemTx : userTx).push(tx))
    return this.stripHash(systemTx.concat(userTx)) as Tx[]
  }
}
/**
 * @public
 */
export async function createPostgresAdapter (
  ctx: MeasureContext,
  contextVars: Record<string, any>,
  hierarchy: Hierarchy,
  url: string,
  wsIds: WorkspaceIds,
  modelDb: ModelDb
): Promise<DbAdapter> {
  const client = getDBClient(contextVars, url)
  const connection = await client.getClient()
  return new PostgresAdapter(
    greenURL !== undefined ? toGreenClient(greenURL, connection) : createDBClient(connection),
    client,
    wsIds.uuid,
    hierarchy,
    modelDb,
    'default-' + wsIds.url
  )
}

let greenDecoder: ((data: any) => Promise<any>) | undefined
let greenURL: string | undefined
let useGreenCompression: string | undefined

function toGreenClient (url: string, connection: postgres.Sql): DBClient {
  const originalUrl = new URL(url)

  // Extract components with default values if needed
  const token = originalUrl.searchParams.get('token') ?? 'secret'

  // Manually build the new URL components
  const newHost = originalUrl.host
  const newPathname = originalUrl.pathname

  console.warn('USE GREEN', newHost, newPathname)
  // Construct the new URL
  const newUrl = `${originalUrl.protocol}//${newHost}${newPathname}`
  return createGreenDBClient(
    newUrl,
    token,
    connection,
    useGreenCompression !== undefined && greenDecoder !== undefined
      ? { decoder: greenDecoder, compression: useGreenCompression }
      : undefined
  )
}
/**
 * @public
 */
export async function createPostgresTxAdapter (
  ctx: MeasureContext,
  contextVars: Record<string, any>,
  hierarchy: Hierarchy,
  url: string,
  wsIds: WorkspaceIds,
  modelDb: ModelDb
): Promise<TxAdapter> {
  const client = getDBClient(contextVars, url)
  const connection = await client.getClient()

  return new PostgresTxAdapter(
    greenURL !== undefined ? toGreenClient(greenURL, connection) : createDBClient(connection),
    client,
    wsIds.uuid,
    hierarchy,
    modelDb,
    'tx' + wsIds.url
  )
}

export function registerGreenDecoder (name: string, decoder: (data: any) => Promise<any>): void {
  greenDecoder = decoder
  useGreenCompression = name
}
export function registerGreenUrl (url?: string): void {
  greenURL = url
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
