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
  type Account,
  AccountRole,
  type Class,
  type Doc,
  type DocumentUpdate,
  type Domain,
  type FieldIndexConfig,
  generateId,
  type MeasureContext,
  type MixinUpdate,
  platformNow,
  platformNowDiff,
  type Projection,
  type Ref,
  systemAccountUuid,
  type WorkspaceUuid
} from '@hcengineering/core'
import { PlatformError, unknownStatus } from '@hcengineering/platform'
import { type DomainHelperOperations } from '@hcengineering/server-core'
import postgres, { type Options, type ParameterOrJSON } from 'postgres'
import type { DBClient } from './client'
import {
  addSchema,
  type DataType,
  getDocFieldsByDomains,
  getIndex,
  getSchema,
  getSchemaAndFields,
  type Schema,
  type SchemaAndFields,
  translateDomain
} from './schemas'

const clientRefs = new Map<string, ClientRef>()
const loadedDomains = new Set<string>()

let loadedTables = new Set<string>()

export async function retryTxn (
  pool: postgres.Sql,
  operation: (client: postgres.TransactionSql) => Promise<any>
): Promise<any> {
  await pool.begin(async (client) => {
    const result = await operation(client)
    return result
  })
}

export const NumericTypes = [
  core.class.TypeNumber,
  core.class.TypeTimestamp,
  core.class.TypeDate,
  core.class.Collection
]

export async function createTables (
  ctx: MeasureContext,
  client: postgres.Sql,
  url: string,
  domains: string[]
): Promise<void> {
  const filtered = domains.filter((d) => !loadedDomains.has(url + translateDomain(d)))
  if (filtered.length === 0) {
    return
  }
  const mapped = filtered.map((p) => translateDomain(p))
  const t = platformNow()
  loadedTables =
    loadedTables.size === 0
      ? new Set(
        (
          await ctx.with('load-table', {}, () =>
            client.unsafe(`
    SELECT table_name 
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    AND table_name NOT LIKE 'pg_%'
    AND table_name NOT LIKE 'cluster_%'
    AND table_name NOT LIKE 'kv_%'
    AND table_name NOT LIKE 'node_%'`)
          )
        ).map((it) => it.table_name)
      )
      : loadedTables
  console.log('load-table', platformNowDiff(t))

  const domainsToLoad = mapped.filter((it) => loadedTables.has(it))
  if (domainsToLoad.length > 0) {
    await ctx.with('load-schemas', {}, () => getTableSchema(client, domainsToLoad))
  }
  const domainsToCreate: string[] = []
  for (const domain of mapped) {
    if (!loadedTables.has(domain)) {
      domainsToCreate.push(domain)
    } else {
      loadedDomains.add(url + domain)
    }
  }

  if (domainsToCreate.length > 0) {
    await retryTxn(client, async (client) => {
      for (const domain of domainsToCreate) {
        await ctx.with('create-table', {}, () => createTable(client, domain))
        loadedDomains.add(url + domain)
      }
    })
  }
}

async function getTableSchema (client: postgres.Sql, domains: string[]): Promise<void> {
  const res = await client.unsafe(`SELECT column_name::name, data_type::text, is_nullable::text, table_name::name
            FROM information_schema.columns
            WHERE table_name IN (${domains.map((it) => `'${it}'`).join(', ')}) and table_schema = 'public'::name  
            ORDER BY table_name::name, ordinal_position::int ASC;`)

  const schemas: Record<string, Schema> = {}
  for (const column of res) {
    if (column.column_name === 'workspaceId' || column.column_name === 'data') {
      continue
    }

    const schema = schemas[column.table_name] ?? {}
    schemas[column.table_name] = schema

    schema[column.column_name] = {
      type: parseDataType(column.data_type),
      notNull: column.is_nullable === 'NO',
      index: false
    }
  }
  for (const [domain, schema] of Object.entries(schemas)) {
    addSchema(domain, schema)
  }
}

function parseDataType (type: string): DataType {
  switch (type) {
    case 'text':
      return 'text'
    case 'bigint':
      return 'bigint'
    case 'boolean':
      return 'bool'
    case 'ARRAY':
      return 'text[]'
  }
  return 'text'
}

async function createTable (client: postgres.Sql, domain: string): Promise<void> {
  const schema = getSchema(domain)
  const fields: string[] = []
  for (const key in schema) {
    const val = schema[key]
    fields.push(`"${key}" ${val.type} ${val.notNull ? 'NOT NULL' : ''}`)
  }
  const colums = fields.join(', ')
  const res = await client.unsafe(`CREATE TABLE IF NOT EXISTS ${domain} (
      "workspaceId" uuid NOT NULL,
      ${colums}, 
      data JSONB NOT NULL,
      PRIMARY KEY("workspaceId", _id)
    )`)
  if (res.count > 0) {
    for (const key in schema) {
      const val = schema[key]
      if (val.index) {
        await client.unsafe(`
          CREATE INDEX ${domain}_${key} ON ${domain} ${getIndex(val)} ("${key}")
        `)
      }
      fields.push(`"${key}" ${val.type} ${val.notNull ? 'NOT NULL' : ''}`)
    }
  }
}

/**
 * @public
 */
export async function shutdownPostgres (contextVars: Record<string, any>): Promise<void> {
  const connections: Map<string, PostgresClientReferenceImpl> | undefined =
    contextVars.pgConnections ?? new Map<string, PostgresClientReferenceImpl>()
  if (connections === undefined) {
    return
  }
  for (const c of connections.values()) {
    c.close(true)
  }
  connections.clear()
}

export interface PostgresClientReference {
  getClient: () => Promise<postgres.Sql>
  close: () => void

  url: () => string
}

class PostgresClientReferenceImpl {
  count: number
  client: postgres.Sql | Promise<postgres.Sql>

  constructor (
    readonly connectionString: string,
    client: postgres.Sql | Promise<postgres.Sql>,
    readonly onclose: () => void
  ) {
    this.count = 0
    this.client = client
  }

  url (): string {
    return this.connectionString
  }

  async getClient (): Promise<postgres.Sql> {
    if (this.client instanceof Promise) {
      this.client = await this.client
    }
    return this.client
  }

  close (force: boolean = false): void {
    this.count--
    if (this.count === 0 || force) {
      if (force) {
        this.count = 0
      }
      void (async () => {
        this.onclose()
        const cl = await this.client
        await cl.end({ timeout: 1 })
      })()
    }
  }

  addRef (): void {
    this.count++
  }
}
export class ClientRef implements PostgresClientReference {
  id = generateId()
  constructor (readonly client: PostgresClientReferenceImpl) {
    clientRefs.set(this.id, this)
  }

  url (): string {
    return this.client.url()
  }

  closed = false
  async getClient (): Promise<postgres.Sql> {
    if (!this.closed) {
      return await this.client.getClient()
    } else {
      throw new PlatformError(unknownStatus('DB client is already closed'))
    }
  }

  close (): void {
    // Do not allow double close of mongo connection client
    if (!this.closed) {
      clientRefs.delete(this.id)
      this.closed = true
      this.client.close()
    }
  }
}

export let dbExtraOptions: Partial<Options<any>> = {}
export function setDBExtraOptions (options: Partial<Options<any>>): void {
  dbExtraOptions = options
}

export function getPrepare (): { prepare: boolean } {
  return { prepare: dbExtraOptions.prepare ?? false }
}

export const doFetchTypes = true

/**
 * Initialize a workspace connection to DB
 * @public
 */
export function getDBClient (
  contextVars: Record<string, any>,
  connectionString: string,
  database?: string
): PostgresClientReference {
  const extraOptions = JSON.parse(process.env.POSTGRES_OPTIONS ?? '{}')
  const key = `${connectionString}${extraOptions}`
  const connections = contextVars.pgConnections ?? new Map<string, PostgresClientReferenceImpl>()
  contextVars.pgConnections = connections

  let existing = connections.get(key)

  if (existing === undefined) {
    const sql = postgres(connectionString, {
      connection: {
        application_name: 'transactor'
      },
      database,
      max: 10,
      min: 2,
      connect_timeout: 10,
      idle_timeout: 30,
      max_lifetime: 300,
      transform: {
        undefined: null
      },
      debug: false,
      notice: false,
      onnotice (notice) {},
      onparameter (key, value) {},
      ...dbExtraOptions,
      ...extraOptions,
      fetch_types: doFetchTypes
    })

    existing = new PostgresClientReferenceImpl(connectionString, sql, () => {
      connections.delete(key)
    })
    connections.set(key, existing)
  }
  // Add reference and return once closable
  existing.addRef()
  return new ClientRef(existing)
}

export function convertDoc<T extends Doc> (
  domain: string,
  doc: T,
  workspaceId: WorkspaceUuid,
  schemaAndFields?: SchemaAndFields
): DBDoc {
  const extractedFields: Doc & Record<string, any> = {
    _id: doc._id,
    space: doc.space,
    createdBy: doc.createdBy,
    modifiedBy: doc.modifiedBy,
    modifiedOn: doc.modifiedOn,
    createdOn: doc.createdOn ?? doc.modifiedOn,
    _class: doc._class,
    '%hash%': (doc as any)['%hash%'] ?? Date.now().toString(16)
  }
  const remainingData: Partial<T> = {}

  const extractedFieldsKeys = new Set(Object.keys(extractedFields))

  schemaAndFields = schemaAndFields ?? getSchemaAndFields(domain)

  for (const key in doc) {
    if (extractedFieldsKeys.has(key)) {
      continue
    }
    if (schemaAndFields.domainFields.has(key)) {
      extractedFields[key] = doc[key]
    } else {
      remainingData[key] = doc[key]
    }
  }

  // Check if some fields are missing
  for (const [key, _type] of Object.entries(schemaAndFields.schema)) {
    if (_type.notNull) {
      if (!(key in doc) || (doc as any)[key] == null) {
        // We missing required field, and we need to add a dummy value for it.
        // Null value is not allowed
        switch (_type.type) {
          case 'bigint':
            extractedFields[key] = 0
            break
          case 'bool':
            extractedFields[key] = false
            break
          case 'text':
            extractedFields[key] = ''
            break
          case 'text[]':
            extractedFields[key] = []
            break
        }
      }
    }
  }

  const res: any = {
    ...extractedFields,
    workspaceId,
    data: remainingData
  }
  return res
}

export function inferType (val: any): string {
  if (typeof val === 'string') {
    return '::text'
  }
  if (typeof val === 'number') {
    return '::numeric'
  }
  if (typeof val === 'boolean') {
    return '::boolean'
  }
  if (Array.isArray(val)) {
    const type = inferType(val[0] ?? val[1])
    if (type !== '') {
      return type + '[]'
    }
  }
  if (typeof val === 'object') {
    if (val instanceof Date) {
      return '::text'
    }
    return '::jsonb'
  }
  return ''
}

export function parseUpdate<T extends Doc> (
  ops: DocumentUpdate<T> | MixinUpdate<Doc, T>,
  schemaFields: SchemaAndFields
): {
    extractedFields: Partial<T>
    remainingData: Partial<T>
  } {
  const extractedFields: Partial<T> = {}
  const remainingData: Partial<T> = {}

  for (const key in ops) {
    const val = (ops as any)[key]
    if (key.startsWith('$')) {
      for (const k in val) {
        if (schemaFields.domainFields.has(k)) {
          ;(extractedFields as any)[k] = val[key]
        } else {
          ;(remainingData as any)[k] = val[key]
        }
      }
    } else {
      if (schemaFields.domainFields.has(key)) {
        ;(extractedFields as any)[key] = val
      } else {
        ;(remainingData as any)[key] = val
      }
    }
  }

  return {
    extractedFields,
    remainingData
  }
}

export function escapeBackticks (str: string): string {
  if (typeof str !== 'string') return str
  return str.replaceAll("'", "''")
}

export function isOwner (account: Account): boolean {
  return account.role === AccountRole.Owner || account.uuid === systemAccountUuid
}

export class DBCollectionHelper implements DomainHelperOperations {
  constructor (
    protected readonly client: DBClient,
    protected readonly workspaceId: WorkspaceUuid
  ) {}

  async dropIndex (domain: Domain, name: string): Promise<void> {}

  domains = new Set<Domain>()
  async create (domain: Domain): Promise<void> {}

  async exists (domain: Domain): Promise<boolean> {
    // Always exists. We don't need to check for index existence
    return true
  }

  async listDomains (): Promise<Set<Domain>> {
    return this.domains
  }

  async createIndex (domain: Domain, value: string | FieldIndexConfig<Doc>, options?: { name: string }): Promise<void> {}

  async listIndexes (domain: Domain): Promise<{ name: string }[]> {
    return []
  }

  async estimatedCount (domain: Domain): Promise<number> {
    // We should always return 0, since no controlled index stuff is required for postgres driver
    return 0
  }
}

export function decodeArray (value: string): string[] {
  if (value === 'NULL') return []
  // Remove first and last character (the array brackets)
  const inner = value.substring(1, value.length - 1)
  const items = inner.split(',')
  return items.map((item) => {
    // Remove quotes at start/end if they exist
    let result = item
    if (result.startsWith('"')) {
      result = result.substring(1)
    }
    if (result.endsWith('"')) {
      result = result.substring(0, result.length - 1)
    }
    // Replace escaped quotes with regular quotes
    let final = ''
    for (let i = 0; i < result.length; i++) {
      if (result[i] === '\\' && result[i + 1] === '"') {
        final += '"'
        i++ // Skip next char
      } else {
        final += result[i]
      }
    }
    return final
  })
}

export function convertArrayParams (parameters?: ParameterOrJSON<any>[]): any[] | undefined {
  if (parameters === undefined) return undefined
  return parameters.map((param) => {
    if (Array.isArray(param)) {
      if (param.length === 0) return '{}'
      const sanitized = param.map((item) => {
        if (item === null) return 'NULL'
        if (typeof item === 'string') return `"${item.replace(/"/g, '\\"')}"`
        return String(item)
      })
      return `{${sanitized.join(',')}}`
    }
    return param
  })
}

export function filterProjection<T extends Doc> (data: any, projection: Projection<T> | undefined): any {
  for (const key in data) {
    if (!Object.prototype.hasOwnProperty.call(projection, key) || (projection as any)[key] === 0) {
      // check nested projections in case of object
      let value = data[key]
      if (typeof value === 'object' && !Array.isArray(value) && value != null) {
        // We need to filter projection for nested objects
        const innerP = Object.entries(projection as any)
          .filter((it) => it[0].startsWith(key))
          .map((it) => [it[0].substring(key.length + 1), it[1]])
        if (innerP.length > 0) {
          value = filterProjection(value, Object.fromEntries(innerP))
          data[key] = value
          continue
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete data[key]
    }
  }
  return data
}

export function parseDocWithProjection<T extends Doc> (
  doc: DBDoc,
  domain: string,
  projection?: Projection<T> | undefined
): T {
  const { workspaceId, data, '%hash%': hash, ...rest } = doc
  const schema = getSchema(domain)
  for (const key in rest) {
    if ((rest as any)[key] === 'NULL' || (rest as any)[key] === null) {
      if (key === 'attachedTo') {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete rest[key]
      } else {
        ;(rest as any)[key] = null
      }
    } else if (schema[key] !== undefined && schema[key].type === 'bigint') {
      ;(rest as any)[key] = Number.parseInt((rest as any)[key])
    } else if (schema[key] !== undefined && schema[key].type === 'text[]' && typeof (rest as any)[key] === 'string') {
      ;(rest as any)[key] = decodeArray((rest as any)[key])
    }
  }
  let resultData = data
  if (projection !== undefined) {
    resultData = filterProjection(data, projection)
  }
  const res = {
    ...resultData,
    ...rest
  } as any as T

  return res
}

export function parseDoc<T extends Doc> (doc: DBDoc, schema: Schema): T {
  const { workspaceId, data, ...rest } = doc
  for (const key in rest) {
    if ((rest as any)[key] === 'NULL' || (rest as any)[key] === null) {
      if (key === 'attachedTo') {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete rest[key]
      } else {
        ;(rest as any)[key] = null
      }
    } else if (schema[key] !== undefined && schema[key].type === 'bigint') {
      ;(rest as any)[key] = Number.parseInt((rest as any)[key])
    } else if (schema[key] !== undefined && schema[key].type === 'text[]' && typeof (rest as any)[key] === 'string') {
      ;(rest as any)[key] = decodeArray((rest as any)[key])
    }
  }
  const res = {
    ...data,
    ...rest
  } as any as T

  return res
}

export interface DBDoc extends Doc {
  workspaceId: WorkspaceUuid
  data: Record<string, any>
  [key: string]: any
}

export function isDataField (domain: string, field: string): boolean {
  return !getDocFieldsByDomains(domain).includes(field)
}

export interface JoinProps {
  table: string // table to join
  path: string // _id.roles, attachedTo.attachedTo, space...
  fromAlias: string
  fromField: string
  toAlias: string // alias for the table
  toField: string // field to join on
  isReverse: boolean
  toClass?: Ref<Class<Doc>>
  classes?: Ref<Class<Doc>>[] // filter by classes
}
