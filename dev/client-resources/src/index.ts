//
// Copyright © 2022 Hardcore Engineering Inc.
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

import clientPlugin from '@hcengineering/client'
import { AccountClient, createClient } from '@hcengineering/core'
import { migrateOperations } from '@hcengineering/model-all'
import { getMetadata, getResource } from '@hcengineering/platform'
import { connect } from './connection'

let client: AccountClient
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => {
  return {
    function: {
      GetClient: async (): Promise<AccountClient> => {
        if (client === undefined) {
          client = await createClient(connect)
          for (const op of migrateOperations) {
            console.log('Migrate', op[0])
            await op[1].upgrade(client)
          }
        }
        // Check if we had dev hook for client.
        const hook = getMetadata(clientPlugin.metadata.ClientHook)
        if (hook !== undefined) {
          const hookProc = await getResource(hook)
          client = await hookProc(client)
        }
        return client
      }
    }
  }
}
