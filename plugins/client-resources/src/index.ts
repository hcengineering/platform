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

import { createClient, Client, TxHander } from '@anticrm/core'

import { connect } from './connection'
import clientPlugin from '@anticrm/client'
import { getMetadata, getResource } from '@anticrm/platform'
export { connect }

/*!
 * Anticrm Platform™ Client Plugin
 * © 2020, 2021 Anticrm Platform Contributors. All Rights Reserved.
 * Licensed under the Eclipse Public License, Version 2.0
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => {
  let client: Client | undefined

  return {
    function: {
      GetClient: async (token: string, endpoint: string): Promise<Client> => {
        if (client === undefined) {
          client = await createClient((handler: TxHander) => {
            const url = new URL(`/${token}`, endpoint)
            console.log('connecting to', url.href)
            return connect(url.href, handler)
          })

          // Check if we had dev hook for client.
          const hook = getMetadata(clientPlugin.metadata.ClientHook)
          if (hook !== undefined) {
            const hookProc = await getResource(hook)
            client = await hookProc(client)
          }
        }
        return client
      }
    }
  }
}
