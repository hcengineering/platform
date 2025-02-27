//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import type { WorkspaceDestroyAdapter } from '@hcengineering/server-core'
import { getMongoClient, getWorkspaceMongoDB } from './utils'

export * from './storage'
export * from './utils'

export function createMongoDestroyAdapter (url: string): WorkspaceDestroyAdapter {
  return {
    deleteWorkspace: async (ctx, contextVars, workspace, dataId): Promise<void> => {
      const client = getMongoClient(url)
      try {
        await ctx.with('delete-workspace', {}, async () => {
          const dbClient = await client.getClient()
          const db = getWorkspaceMongoDB(dbClient, dataId ?? workspace)
          await db.dropDatabase()
        })
      } catch (err) {
        console.error('Failed to delete workspace', err)
      } finally {
        client.close()
      }
    }
  }
}
