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
  type MixinUpdate,
  type Projection,
  type Ref,
  type WorkspaceId
} from '@hcengineering/core'
import { PlatformError, unknownStatus } from '@hcengineering/platform'
import { type DomainHelperOperations } from '@hcengineering/server-core'
import postgres from 'postgres'
import {
  addSchema,
  type DataType,
  getDocFieldsByDomains,
  getIndex,
  getSchema,
  type Schema,
  translateDomain
} from './schemas'

const connections = new Map<string, PostgresClientReferenceImpl>()

// Register close on process exit.
process.on('exit', () => {
  shutdown().catch((err) => {
    console.error(err)
  })
})

const clientRefs = new Map<string, ClientRef>()
const loadedDomains = new Set<string>()

export async function retryTxn (
  pool: postgres.Sql,
  operation: (client: postgres.TransactionSql) => Promise<any>
): Promise<any> {
  await pool.begin(async (client) => {
    const result = await operation(client)
    return result
  })
}

export async function createTables (client: postgres.Sql, domains: string[]): Promise<void> {
  const filtered = domains.filter((d) => !loadedDomains.has(d))
  if (filtered.length === 0) {
    return
  }
  const mapped = filtered.map((p) => translateDomain(p))
  const inArr = mapped.map((it) => `'${it}'`).join(', ')
  const tables = await client.unsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name IN (${inArr})
  `)

  const exists = new Set(tables.map((it) => it.table_name))

  await retryTxn(client, async (client) => {
    for (const domain of mapped) {
      if (exists.has(domain)) {
        await getTableSchema(client, domain)
      } else {
        await createTable(client, domain)
      }
      loadedDomains.add(domain)
    }
  })
}

async function getTableSchema (client: postgres.Sql, domain: string): Promise<void> {
  const res = await client.unsafe(`SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = '${domain}' and table_schema = 'public' ORDER BY ordinal_position ASC;
  `)

  const schema: Schema = {}
  for (const column of res) {
    if (column.column_name === 'workspaceId' || column.column_name === 'data') {
      continue
    }
    schema[column.column_name] = {
      type: parseDataType(column.data_type),
      notNull: column.is_nullable === 'NO',
      index: false
    }
  }

  addSchema(domain, schema)
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
      "workspaceId" text NOT NULL,
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
export async function shutdown (): Promise<void> {
  for (const c of connections.values()) {
    c.close(true)
  }
  connections.clear()
}

export interface PostgresClientReference {
  getClient: () => Promise<postgres.Sql>
  close: () => void
}

class PostgresClientReferenceImpl {
  count: number
  client: postgres.Sql | Promise<postgres.Sql>

  constructor (
    client: postgres.Sql | Promise<postgres.Sql>,
    readonly onclose: () => void
  ) {
    this.count = 0
    this.client = client
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

/**
 * Initialize a workspace connection to DB
 * @public
 */
export function getDBClient (connectionString: string, database?: string): PostgresClientReference {
  const extraOptions = JSON.parse(process.env.POSTGRES_OPTIONS ?? '{}')
  const key = `${connectionString}${extraOptions}`
  let existing = connections.get(key)

  if (existing === undefined) {
    const sql = postgres(connectionString, {
      connection: {
        application_name: 'transactor'
      },
      database,
      max: 10,
      transform: {
        undefined: null
      },
      ...extraOptions
    })

    existing = new PostgresClientReferenceImpl(sql, () => {
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
  workspaceId: string,
  domainFields?: Set<string>
): DBDoc {
  const extractedFields: Doc & Record<string, any> = {
    _id: doc._id,
    space: doc.space,
    createdBy: doc.createdBy,
    modifiedBy: doc.modifiedBy,
    modifiedOn: doc.modifiedOn,
    createdOn: doc.createdOn,
    _class: doc._class
  }
  const remainingData: Partial<T> = {}

  const extractedFieldsKeys = new Set(Object.keys(extractedFields))

  domainFields = domainFields ?? new Set(getDocFieldsByDomains(domain))

  for (const key in doc) {
    if (extractedFieldsKeys.has(key)) {
      continue
    }
    if (domainFields.has(key)) {
      extractedFields[key] = doc[key]
    } else {
      remainingData[key] = doc[key]
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
    const type = inferType(val[0])
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
  domain: string,
  ops: DocumentUpdate<T> | MixinUpdate<Doc, T>
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
        if (getDocFieldsByDomains(domain).includes(k)) {
          ;(extractedFields as any)[k] = val[key]
        } else {
          ;(remainingData as any)[k] = val[key]
        }
      }
    } else {
      if (getDocFieldsByDomains(domain).includes(key)) {
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
  return account.role === AccountRole.Owner || account._id === core.account.System
}

export class DBCollectionHelper implements DomainHelperOperations {
  constructor (
    protected readonly client: postgres.Sql,
    protected readonly workspaceId: WorkspaceId
  ) {}

  async dropIndex (domain: Domain, name: string): Promise<void> {}

  domains = new Set<Domain>()
  async create (domain: Domain): Promise<void> {}

  async exists (domain: Domain): Promise<boolean> {
    const exists = await this.client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = '${this.client(translateDomain(domain))}'
    `
    return exists.length > 0
  }

  async listDomains (): Promise<Set<Domain>> {
    return this.domains
  }

  async createIndex (domain: Domain, value: string | FieldIndexConfig<Doc>, options?: { name: string }): Promise<void> {}

  async listIndexes (domain: Domain): Promise<{ name: string }[]> {
    return []
  }

  async estimatedCount (domain: Domain): Promise<number> {
    const res = await this
      .client`SELECT COUNT(_id) FROM ${this.client(translateDomain(domain))} WHERE "workspaceId" = ${this.workspaceId.name}`

    return res.count
  }
}

export function parseDocWithProjection<T extends Doc> (
  doc: DBDoc,
  domain: string,
  projection?: Projection<T> | undefined
): T {
  const { workspaceId, data, ...rest } = doc
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
    }
  }
  if (projection !== undefined) {
    for (const key in data) {
      if (!Object.prototype.hasOwnProperty.call(projection, key) || (projection as any)[key] === 0) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete data[key]
      }
    }
  }
  const res = {
    ...data,
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
    }
  }
  const res = {
    ...data,
    ...rest
  } as any as T

  return res
}

export interface DBDoc extends Doc {
  workspaceId: string
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
