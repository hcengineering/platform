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

import postgres, { type Options, type ParameterOrJSON } from 'postgres'

const clientRefs = new Map<number, ClientRef>()

let clId = 0

export type DBResult = any[] & { count: number }
export interface DBClient {
  execute: (query: string, parameters?: ParameterOrJSON<any>[] | undefined) => Promise<DBResult>

  release: () => void

  reserve: () => Promise<DBClient>

  raw: () => postgres.Sql
}

export function createDBClient (client: postgres.Sql, release: () => void = () => {}): DBClient {
  return {
    execute: (query, parameters) =>
      client.unsafe(query, doFetchTypes ? parameters : convertArrayParams(parameters), getPrepare()),
    release,
    reserve: async () => {
      const reserved = await client.reserve()
      return createDBClient(reserved, () => {
        reserved.release()
      })
    },
    raw: () => client
  }
}

export function convertArrayParams (params?: unknown[]): any[] | undefined {
  if (params === undefined) return undefined

  return params.map((param) => {
    if (!Array.isArray(param)) return param

    if (param.length === 0) return '{}'

    const sanitized = param.map((item) => {
      if (item === null || item === undefined) return 'NULL'

      if (typeof item === 'number' || typeof item === 'boolean') {
        return String(item)
      }

      if (typeof item === 'string') {
        const escaped = item.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        return `"${escaped}"`
      }

      const json = JSON.stringify(item)
      const escapedJson = json.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      return `"${escapedJson}"`
    })

    return `{${sanitized.join(',')}}`
  })
}

export async function retryTxn (
  pool: postgres.Sql,
  operation: (client: postgres.TransactionSql) => Promise<any>
): Promise<any> {
  await pool.begin(async (client) => {
    const result = await operation(client)
    return result
  })
}

/**
 * @public
 */
export async function shutdownPostgres (): Promise<void> {
  for (const c of connections.values()) {
    c.close(true)
  }
  connections.clear()
}

export interface PostgresClientReference {
  getClient: () => Promise<postgres.Sql>

  mgr: ConnectionMgr
  close: () => void
  url: () => string
}

class PostgresClientReferenceImpl {
  count: number
  client: postgres.Sql

  mgr: ConnectionMgr

  constructor (
    readonly connectionString: string,
    client: postgres.Sql,
    readonly onclose: () => void
  ) {
    this.count = 0
    this.client = client
    this.mgr = new ConnectionMgr(createDBClient(this.client))
  }

  url (): string {
    return this.connectionString
  }

  getClient (): postgres.Sql {
    return this.client
  }

  close (force: boolean = false): void {
    this.count--
    if (this.count === 0 || force) {
      if (force) {
        this.count = 0
      }
      void (async () => {
        this.mgr.close()
        this.onclose()
        const cl = this.client
        await cl.end({ timeout: 1 })
      })()
    }
  }

  addRef (): void {
    this.count++
  }
}
export class ClientRef implements PostgresClientReference {
  id = ++clId
  constructor (
    readonly client: PostgresClientReferenceImpl,
    readonly mgr: ConnectionMgr
  ) {
    clientRefs.set(this.id, this)
  }

  url (): string {
    return this.client.url()
  }

  closed = false
  async getClient (): Promise<postgres.Sql> {
    if (!this.closed) {
      return this.client.getClient()
    } else {
      throw Error('DB client is already closed')
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

const connections = new Map<string, PostgresClientReferenceImpl>()

/**
 * Initialize a connection to DB
 * @public
 */
export function getDBClient (
  connectionString: string,
  database?: string,
  serviceName: string = 'transactor'
): PostgresClientReference {
  const extraOptions = JSON.parse(process.env.POSTGRES_OPTIONS ?? '{}')
  const key = `${connectionString}${extraOptions}`

  let existing = connections.get(key)

  if (existing === undefined) {
    const sql = postgres(connectionString, {
      connection: {
        application_name: serviceName
      },
      database,
      max: 10,
      min: 2,
      connect_timeout: 30,
      idle_timeout: 0,
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
  return new ClientRef(existing, existing.mgr)
}

class ConnectionInfo {
  // It should preserve at least one available connection in pool, other connection should be closed
  available: DBClient[] = []

  released: boolean = false

  constructor (
    readonly connectionId: string,
    protected readonly client: DBClient,
    readonly managed: boolean,
    readonly mgrId: string
  ) {}

  async withReserve (action: (reservedClient: DBClient) => Promise<any>, forced: boolean = false): Promise<any> {
    let reserved: DBClient | undefined

    // Check if we have at least one available connection and reserve one more if required.
    if (this.available.length === 0) {
      if (this.managed || forced) {
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
      } else if (reserved !== undefined) {
        if (this.available.length > 0) {
          reserved?.release()
        } else {
          this.available.push(reserved)
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

export class ConnectionMgr {
  private readonly connections = new Map<string, ConnectionInfo>()
  constructor (protected readonly client: DBClient) {}

  async write (id: string | undefined, mgrId: string, fn: (client: DBClient) => Promise<any>): Promise<void> {
    const backoffInterval = 25 // millis
    const maxTries = 5
    let tries = 0

    const realId = id ?? `${++clId}`

    const connection = this.getConnection(realId, mgrId, false)

    try {
      while (true) {
        const retry: boolean | Error = await connection.withReserve(async (client) => {
          tries++
          try {
            await client.execute('BEGIN;')
            await fn(client)
            await client.execute('COMMIT;')
            return true
          } catch (err: any) {
            await client.execute('ROLLBACK;')
            console.error({ message: 'failed to process tx', error: err.message, cause: err })

            if (!this.isRetryableError(err) || tries === maxTries) {
              return err
            } else {
              console.log('Transaction failed. Retrying.')
              console.log(err.message)
              return false
            }
          }
        }, true)
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

  async retry (id: string | undefined, mgrId: string, fn: (client: DBClient) => Promise<any>): Promise<any> {
    const backoffInterval = 25 // millis
    const maxTries = 5
    let tries = 0

    const realId = id ?? `${++clId}`
    // Will reuse reserved if had and use new one if not
    const connection = this.getConnection(realId, mgrId, false)

    try {
      while (true) {
        const retry: false | { result: any } | Error = await connection.withReserve(async (client) => {
          tries++
          try {
            return { result: await fn(client) }
          } catch (err: any) {
            console.error({ message: 'failed to process sql', error: err.message, cause: err })
            if (!this.isRetryableError(err) || tries === maxTries) {
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
    const conn = this.connections.get(id)
    if (conn !== undefined) {
      conn.released = true
      this.connections.delete(id) // We need to delete first
      conn.release()
    }
  }

  close (mgrId?: string): void {
    const cnts = this.connections
    for (const [k, conn] of Array.from(cnts.entries())) {
      if (mgrId !== undefined && conn.mgrId !== mgrId) {
        continue
      }
      cnts.delete(k)
      try {
        conn.release()
      } catch (err: any) {
        console.error('failed to release connection')
      }
    }
  }

  getConnection (id: string, mgrId: string, managed: boolean = true): ConnectionInfo {
    let conn = this.connections.get(id)
    if (conn === undefined) {
      conn = new ConnectionInfo(id, this.client, managed, mgrId)
    }
    if (managed) {
      this.connections.set(id, conn)
    }
    return conn
  }

  private isRetryableError (err: any): boolean {
    const msg: string = err?.message ?? ''

    return (
      err.code === '40001' || // Retry transaction
      err.code === '55P03' || // Lock not available
      err.code === 'CONNECTION_CLOSED' || // This error is thrown if the connection was closed without an error.
      err.code === 'CONNECTION_DESTROYED' || // This error is thrown for any queries that were pending when the timeout to sql.end({ timeout: X }) was reached. If the DB client is being closed completely retry will result in CONNECTION_ENDED which is not retried so should be fine.
      msg.includes('RETRY_SERIALIZABLE')
    )
  }
}
