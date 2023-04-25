//
// Copyright © 2020 Anticrm Platform Contributors.
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
import core, { Client, createClient, TxHandler, TxWorkspaceEvent, WorkspaceEvent } from '@hcengineering/core'
import { getMetadata, getPlugins, getResource } from '@hcengineering/platform'
import { connect } from './connection'

export { connect }

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => {
  return {
    function: {
      GetClient: async (
        token: string,
        endpoint: string,
        onUpgrade?: () => void,
        onUnauthorized?: () => void,
        onConnect?: (apply: boolean) => void
      ): Promise<Client> => {
        const filterModel = getMetadata(clientPlugin.metadata.FilterModel) ?? false

        let client = createClient(
          (handler: TxHandler) => {
            const url = new URL(`/${token}`, endpoint)
            console.log('connecting to', url.href)
            const upgradeHandler: TxHandler = (tx) => {
              if (tx?._class === core.class.TxWorkspaceEvent) {
                if ((tx as TxWorkspaceEvent).event === WorkspaceEvent.Upgrade) {
                  onUpgrade?.()
                }
              }
              handler(tx)
            }

            return connect(url.href, upgradeHandler, onUpgrade, onUnauthorized, onConnect)
          },
          filterModel ? [...getPlugins(), ...(getMetadata(clientPlugin.metadata.ExtraPlugins) ?? [])] : undefined
        )
        // Check if we had dev hook for client.
        client = hookClient(client)
        return await client
      }
    }
  }
}
async function hookClient (client: Promise<Client>): Promise<Client> {
  const hook = getMetadata(clientPlugin.metadata.ClientHook)
  if (hook !== undefined) {
    const hookProc = await getResource(hook)
    const _client = client
    client = new Promise((resolve, reject) => {
      _client
        .then((res) => {
          resolve(hookProc(res))
        })
        .catch((err) => reject(err))
    })
  }
  return await client
}
