//
// Copyright © 2021 Anticrm Platform Contributors.
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

import {
  generateId,
  toWorkspaceString,
  type Doc,
  type Domain,
  type FieldIndexConfig,
  type WorkspaceId
} from '@hcengineering/core'
import { PlatformError, unknownStatus } from '@hcengineering/platform'
import { type DomainHelperOperations } from '@hcengineering/server-core'
import { MongoClient, type Collection, type Db, type Document } from 'mongodb'

const connections = new Map<string, MongoClientReferenceImpl>()

// Register mongo close on process exit.
process.on('exit', () => {
  shutdown().catch((err) => {
    console.error(err)
  })
})

const clientRefs = new Map<string, ClientRef>()

/**
 * @public
 */
export async function shutdown (): Promise<void> {
  for (const it of Array.from(clientRefs.values())) {
    console.error((it as any).stack)
  }
  for (const c of connections.values()) {
    c.close(true)
  }
  connections.clear()
}

export interface MongoClientReference {
  getClient: () => Promise<MongoClient>
  close: () => void
}

class MongoClientReferenceImpl {
  count: number
  client: MongoClient | Promise<MongoClient>

  constructor (
    client: MongoClient | Promise<MongoClient>,
    readonly onclose: () => void
  ) {
    this.count = 0
    this.client = client
  }

  async getClient (): Promise<MongoClient> {
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
      this.onclose()
      void (async () => {
        let cl = this.client
        if (cl instanceof Promise) {
          cl = await cl
        }
        await cl.close()
      })()
    }
  }

  addRef (): void {
    this.count++
  }
}
export class ClientRef implements MongoClientReference {
  id = generateId()
  stack = new Error().stack
  constructor (readonly client: MongoClientReferenceImpl) {
    clientRefs.set(this.id, this)
  }

  closed = false
  async getClient (): Promise<MongoClient> {
    if (!this.closed) {
      return await this.client.getClient()
    } else {
      throw new PlatformError(unknownStatus('Mongo client is already closed'))
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
export function getMongoClient (uri: string): MongoClientReference {
  const extraOptions = JSON.parse(process.env.MONGO_OPTIONS ?? '{}')
  const key = `${uri}${process.env.MONGO_OPTIONS ?? '{}'}`
  let existing = connections.get(key)

  // If not created or closed
  if (existing === undefined) {
    existing = new MongoClientReferenceImpl(
      MongoClient.connect(uri, {
        retryReads: true,
        appName: 'transactor',
        enableUtf8Validation: false,

        ...extraOptions
      }),
      () => {
        connections.delete(key)
      }
    )
    connections.set(key, existing)
  }
  // Add reference and return once closable
  existing.addRef()
  return new ClientRef(existing)
}

/**
 * @public
 *
 * Construct MongoDB table from workspace.
 */
export function getWorkspaceDB (client: MongoClient, workspaceId: WorkspaceId): Db {
  return client.db(toWorkspaceString(workspaceId))
}

export class DBCollectionHelper implements DomainHelperOperations {
  collections = new Map<string, Collection<any>>()
  constructor (readonly db: Db) {}

  async listDomains (): Promise<Set<Domain>> {
    const collections = await this.db.listCollections({}, { nameOnly: true }).toArray()
    return new Set(collections.map((it) => it.name as unknown as Domain))
  }

  async init (domain?: Domain): Promise<void> {
    if (domain === undefined) {
      // Init existing collecfions
      for (const c of (await this.db.listCollections({}, { nameOnly: true }).toArray()).map((it) => it.name)) {
        this.collections.set(c, this.db.collection(c))
      }
    } else {
      this.collections.set(domain, this.db.collection(domain))
    }
  }

  collection<TSchema extends Document = Document>(domain: Domain): Collection<TSchema> {
    let info = this.collections.get(domain)
    if (info === undefined) {
      info = this.db.collection(domain as string)
      this.collections.set(domain, info)
    }
    return info
  }

  async create (domain: Domain): Promise<void> {
    if (this.collections.get(domain) === undefined) {
      const coll = this.db.collection(domain as string)
      this.collections.set(domain, coll)

      while (true) {
        const exists = await this.db.listCollections({ name: domain }).next()
        if (exists === undefined) {
          console.log('check connection to be created', domain)
          await new Promise<void>((resolve) => {
            setTimeout(resolve)
          })
        } else {
          break
        }
      }
    }
  }

  async exists (domain: Domain): Promise<boolean> {
    return this.collections.has(domain)
  }

  async createIndex (domain: Domain, value: string | FieldIndexConfig<Doc>, options?: { name: string }): Promise<void> {
    if (typeof value === 'string') {
      await this.collection(domain).createIndex(value, options)
    } else {
      if (value.filter !== undefined) {
        await this.collection(domain).createIndex(value.keys, {
          ...options,
          partialFilterExpression: value.filter
        })
      } else {
        await this.collection(domain).createIndex(value.keys, { ...options, sparse: value.sparse ?? false })
      }
    }
  }

  async dropIndex (domain: Domain, name: string): Promise<void> {
    await this.collection(domain).dropIndex(name)
  }

  async listIndexes (domain: Domain): Promise<{ name: string }[]> {
    return await this.collection(domain).listIndexes().toArray()
  }

  async estimatedCount (domain: Domain): Promise<number> {
    if (await this.exists(domain)) {
      const c = this.collection(domain)
      return await c.estimatedDocumentCount()
    }
    return 0
  }
}
