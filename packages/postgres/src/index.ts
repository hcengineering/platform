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

import { getDBClient, retryTxn } from '@hcengineering/postgres-base'
import type { WorkspaceDestroyAdapter } from '@hcengineering/server-core'
import { domainSchemas } from './schemas'

export { getDocFieldsByDomains, translateDomain } from './schemas'
export * from './storage'
export { convertDoc, createTables } from './utils'

export * from '@hcengineering/postgres-base'

export function createPostgreeDestroyAdapter (url: string): WorkspaceDestroyAdapter {
  return {
    deleteWorkspace: async (ctx, workspaceUuid): Promise<void> => {
      const client = getDBClient(url)
      try {
        if (workspaceUuid == null) {
          throw new Error('Workspace uuid is not defined')
        }
        const connection = await client.getClient()

        await ctx.with(
          'delete-workspace',
          {},
          async (ctx) => {
            // We need to clear information about workspace from all collections in schema
            for (const [domain] of Object.entries(domainSchemas)) {
              await ctx.with(
                'delete-workspace-domain',
                {},
                async (ctx) => {
                  await retryTxn(connection, async (client) => {
                    await client.unsafe(`delete from ${domain} where "workspaceId" = $1::uuid`, [workspaceUuid])
                  })
                },
                { domain }
              )
            }
          },
          { url: workspaceUuid }
        )
      } catch (err: any) {
        ctx.error('failed to clean workspace data', { err })
        throw err
      } finally {
        client.close()
      }
    }
  }
}
