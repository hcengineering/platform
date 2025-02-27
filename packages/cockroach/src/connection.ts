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

// Full copy from @hcengineering/postgres
import postgres from 'postgres'
import { v4 as uuid } from 'uuid'

const connections = new Map<string, PostgresClientReferenceImpl>()
const clientRefs = new Map<string, ClientRef>()

export interface PostgresClientReference {
  getClient: () => Promise<postgres.Sql>
  close: () => void
}

class PostgresClientReferenceImpl {
  count: number
  client: postgres.Sql | Promise<postgres.Sql>

  constructor(
    client: postgres.Sql | Promise<postgres.Sql>,
    readonly onclose: () => void
  ) {
    this.count = 0
    this.client = client
  }

  async getClient(): Promise<postgres.Sql> {
    if (this.client instanceof Promise) {
      this.client = await this.client
    }
    return this.client
  }

  close(force: boolean = false): void {
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

  addRef(): void {
    this.count++
    console.log('Add postgres connection', this.count)
  }
}

export class ClientRef implements PostgresClientReference {
  id = uuid()
  constructor(readonly client: PostgresClientReferenceImpl) {
    clientRefs.set(this.id, this)
  }

  closed = false
  async getClient(): Promise<postgres.Sql> {
    if (!this.closed) {
      return await this.client.getClient()
    } else {
      throw new Error('DB client-query is already closed')
    }
  }

  close(): void {
    // Do not allow double close of connection client-query
    if (!this.closed) {
      clientRefs.delete(this.id)
      this.closed = true
      this.client.close()
    }
  }
}

export function connect(connectionString: string, database?: string): PostgresClientReference {
  const extraOptions = JSON.parse(process.env.POSTGRES_OPTIONS ?? '{}')
  const key = `${connectionString}${extraOptions}`
  let existing = connections.get(key)

  if (existing === undefined) {
    const sql = postgres(connectionString, {
      connection: {
        application_name: 'communication'
      },
      database,
      max: 5,
      fetch_types: false,
      prepare: true,
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
