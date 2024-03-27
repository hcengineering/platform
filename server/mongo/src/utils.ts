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

import { toWorkspaceString, type WorkspaceId } from '@hcengineering/core'
import { type Db, MongoClient, type MongoClientOptions } from 'mongodb'

const connections = new Map<string, MongoClientReference>()

// Register mongo close on process exit.
process.on('exit', () => {
  shutdown().catch((err) => {
    console.error(err)
  })
})

/**
 * @public
 */
export async function shutdown (): Promise<void> {
  for (const c of connections.values()) {
    await c.close(true)
  }
  connections.clear()
}

export class MongoClientReference {
  count: number
  client: MongoClient | Promise<MongoClient>

  constructor (client: MongoClient | Promise<MongoClient>) {
    this.count = 1
    this.client = client
  }

  async getClient (): Promise<MongoClient> {
    if (this.client instanceof Promise) {
      this.client = await this.client
    }
    return this.client
  }

  async close (force: boolean = false): Promise<void> {
    this.count--
    if (this.count === 0 || force) {
      if (force) {
        this.count = 0
      }
      await (await this.client).close()
    }
  }

  addRef (): void {
    this.count++
  }
}

/**
 * Initialize a workspace connection to DB
 * @public
 */
export function getMongoClient (uri: string, options?: MongoClientOptions): MongoClientReference {
  const extraOptions = JSON.parse(process.env.MONGO_OPTIONS ?? '{}')
  const key = `${uri}${process.env.MONGO_OPTIONS}`
  let existing = connections.get(key)

  // If not created or closed
  if (existing === undefined || existing.count === 0) {
    existing = new MongoClientReference(
      MongoClient.connect(uri, {
        ...options,
        enableUtf8Validation: false,
        maxConnecting: 1024,
        ...extraOptions
      })
    )
    connections.set(key, existing)
  } else {
    existing.addRef()
  }
  return existing
}

/**
 * @public
 *
 * Construct MongoDB table from workspace.
 */
export function getWorkspaceDB (client: MongoClient, workspaceId: WorkspaceId): Db {
  return client.db(toWorkspaceString(workspaceId))
}
