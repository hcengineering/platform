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
import { Pool, type PoolClient } from 'pg'
import { defaultSchema, domainSchemas, getSchema } from './schemas'

const connections = new Map<string, PostgresClientReferenceImpl>()

// Register close on process exit.
process.on('exit', () => {
  shutdown().catch((err) => {
    console.error(err)
  })
})

const clientRefs = new Map<string, ClientRef>()

export async function retryTxn (pool: Pool, operation: (client: PoolClient) => Promise<any>): Promise<any> {
  const backoffInterval = 100 // millis
  const maxTries = 5
  let tries = 0
  const client = await pool.connect()

  try {
    while (true) {
      await client.query('BEGIN;')
      tries++

      try {
        const result = await operation(client)
        await client.query('COMMIT;')
        return result
      } catch (err: any) {
        await client.query('ROLLBACK;')

        if (err.code !== '40001' || tries === maxTries) {
          throw err
        } else {
          console.log('Transaction failed. Retrying.')
          console.log(err.message)
          await new Promise((resolve) => setTimeout(resolve, tries * backoffInterval))
        }
      }
    }
  } finally {
    client.release()
  }
}

export async function createTable (client: Pool, domains: string[]): Promise<void> {
  if (domains.length === 0) {
    return
  }
  const mapped = domains.map((p) => translateDomain(p))
  const inArr = mapped.map((it) => `'${it}'`).join(', ')
  const exists = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name IN (${inArr})
  `)

  const toCreate = mapped.filter((it) => !exists.rows.map((it) => it.table_name).includes(it))
  await retryTxn(client, async (client) => {
    for (const domain of toCreate) {
      const schema = getSchema(domain)
      const fields: string[] = []
      for (const key in schema) {
        const val = schema[key]
        fields.push(`"${key}" ${val[0]} ${val[1] ? 'NOT NULL' : ''}`)
      }
      const colums = fields.join(', ')
      await client.query(
        `CREATE TABLE ${domain} (
          "workspaceId" text NOT NULL,
          ${colums}, 
          data JSONB NOT NULL,
          PRIMARY KEY("workspaceId", _id)
        )`
      )
      if (schema.attachedTo !== undefined) {
        await client.query(`
          CREATE INDEX ${domain}_attachedTo ON ${domain} ("attachedTo")
        `)
      }
      await client.query(`
        CREATE INDEX ${domain}_class ON ${domain} (_class)
      `)
      await client.query(`
        CREATE INDEX ${domain}_space ON ${domain} (space)
      `)
      await client.query(`
        CREATE INDEX ${domain}_idxgin ON ${domain} USING GIN (data)
      `)
    }
  })
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
  getClient: () => Promise<Pool>
  close: () => void
}

class PostgresClientReferenceImpl {
  count: number
  client: Pool | Promise<Pool>

  constructor (
    client: Pool | Promise<Pool>,
    readonly onclose: () => void
  ) {
    this.count = 0
    this.client = client
  }

  async getClient (): Promise<Pool> {
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
        await cl.end()
        console.log('Closed postgres connection')
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
  async getClient (): Promise<Pool> {
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
  const key = `${connectionString}${process.env.postgree_OPTIONS ?? '{}'}`
  let existing = connections.get(key)

  if (existing === undefined) {
    const pool = new Pool({
      connectionString,
      application_name: 'transactor',
      database
    })

    existing = new PostgresClientReferenceImpl(pool, () => {
      connections.delete(key)
    })
    connections.set(key, existing)
  }
  // Add reference and return once closable
  existing.addRef()
  return new ClientRef(existing)
}

export function convertDoc<T extends Doc> (domain: string, doc: T, workspaceId: string): DBDoc {
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

  for (const key in doc) {
    if (Object.keys(extractedFields).includes(key)) continue
    if (getDocFieldsByDomains(domain).includes(key)) {
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
    if (key === '$push' || key === '$pull') {
      const val = (ops as any)[key]
      for (const k in val) {
        if (getDocFieldsByDomains(domain).includes(k)) {
          ;(extractedFields as any)[k] = val[key]
        } else {
          ;(remainingData as any)[k] = val[key]
        }
      }
    } else {
      if (getDocFieldsByDomains(domain).includes(key)) {
        ;(extractedFields as any)[key] = (ops as any)[key]
      } else {
        ;(remainingData as any)[key] = (ops as any)[key]
      }
    }
  }

  return {
    extractedFields,
    remainingData
  }
}

export function escapeBackticks (str: string): string {
  return str.replaceAll("'", "''")
}

export function isOwner (account: Account): boolean {
  return account.role === AccountRole.Owner || account._id === core.account.System
}

export class DBCollectionHelper implements DomainHelperOperations {
  constructor (
    protected readonly client: Pool,
    protected readonly workspaceId: WorkspaceId
  ) {}

  domains = new Set<Domain>()
  async create (domain: Domain): Promise<void> {}

  async exists (domain: Domain): Promise<boolean> {
    const exists = await this.client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = '${translateDomain(domain)}'
    `)
    return exists.rows.length > 0
  }

  async listDomains (): Promise<Set<Domain>> {
    return this.domains
  }

  async createIndex (domain: Domain, value: string | FieldIndexConfig<Doc>, options?: { name: string }): Promise<void> {}

  async dropIndex (domain: Domain, name: string): Promise<void> {}

  async listIndexes (domain: Domain): Promise<{ name: string }[]> {
    return []
  }

  async estimatedCount (domain: Domain): Promise<number> {
    const res = await this.client.query(`SELECT COUNT(_id) FROM ${translateDomain(domain)} WHERE "workspaceId" = $1`, [
      this.workspaceId.name
    ])
    return res.rows[0].count
  }
}

export function translateDomain (domain: string): string {
  return domain.replaceAll('-', '_')
}

export function parseDocWithProjection<T extends Doc> (doc: DBDoc, projection: Projection<T> | undefined): T {
  const { workspaceId, data, ...rest } = doc
  for (const key in rest) {
    if ((rest as any)[key] === 'NULL' || (rest as any)[key] === null) {
      if (key === 'attachedTo') {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete rest[key]
      } else {
        ;(rest as any)[key] = null
      }
    }
    if (key === 'modifiedOn' || key === 'createdOn') {
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

export function parseDoc<T extends Doc> (doc: DBDoc): T {
  const { workspaceId, data, ...rest } = doc
  for (const key in rest) {
    if ((rest as any)[key] === 'NULL' || (rest as any)[key] === null) {
      if (key === 'attachedTo') {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete rest[key]
      } else {
        ;(rest as any)[key] = null
      }
    }
    if (key === 'modifiedOn' || key === 'createdOn') {
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

export function getDocFieldsByDomains (domain: string): string[] {
  const schema = domainSchemas[domain] ?? defaultSchema
  return Object.keys(schema)
}

export interface JoinProps {
  table: string // table to join
  path: string // _id.roles, attachedTo.attachedTo, space...
  fromAlias: string
  fromField: string
  toAlias: string // alias for the table
  toField: string // field to join on
  isReverse: boolean
  toClass: Ref<Class<Doc>>
  classes?: Ref<Class<Doc>>[] // filter by classes
}
