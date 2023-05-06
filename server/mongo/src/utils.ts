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

import { toWorkspaceString, WorkspaceId } from '@hcengineering/core'
import { Db, MongoClient, MongoClientOptions } from 'mongodb'

let connections: MongoClient[] = []

// Register mongo close on process exit.
process.on('exit', () => {
  shutdown().catch((err) => console.error(err))
})

/**
 * @public
 */
export async function shutdown (): Promise<void> {
  for (const c of connections.values()) {
    await (await c).close()
  }
  connections = []
}
/**
 * Initialize a workspace connection to DB
 * @public
 */
export async function getMongoClient (uri: string, options?: MongoClientOptions): Promise<MongoClient> {
  const client = await MongoClient.connect(uri, {
    ...options,
    enableUtf8Validation: false,
    maxConnecting: 1024
  })
  connections.push(client)
  return client
}

/**
 * @public
 *
 * Construct MongoDB table from workspace.
 */
export function getWorkspaceDB (client: MongoClient, workspaceId: WorkspaceId): Db {
  return client.db(toWorkspaceString(workspaceId))
}
