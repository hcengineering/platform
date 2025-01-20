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

import type { WorkspaceDestroyAdapter } from '@hcengineering/server-core'
import { domainSchemas } from './schemas'
import { getDBClient, retryTxn } from './utils'

export { getDocFieldsByDomains, translateDomain } from './schemas'
export * from './storage'
export { convertDoc, createTables, getDBClient, retryTxn, setDBExtraOptions, setExtraOptions } from './utils'

export function createPostgreeDestroyAdapter (url: string): WorkspaceDestroyAdapter {
  return {
    deleteWorkspace: async (ctx, workspace): Promise<void> => {
      const client = getDBClient(url)
      try {
        const connection = await client.getClient()

        await ctx.with('delete-workspace', {}, async () => {
          // We need to clear information about workspace from all collections in schema
          for (const [domain] of Object.entries(domainSchemas)) {
            await ctx.with('delete-workspace-domain', {}, async () => {
              await retryTxn(connection, async (client) => {
                await client.unsafe(`delete from ${domain} where "workspaceId" = $1::uuid`, [
                  workspace.uuid ?? workspace.name
                ])
              })
            })
          }
        })
      } catch (err: any) {
        ctx.error('failed to clean workspace data', { err })
      } finally {
        client.close()
      }
    }
  }
}
