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

import { Metadata, plugin } from '@hcengineering/platform'
import type { Plugin, Resource } from '@hcengineering/platform'
import type { Client } from '@hcengineering/core'
// import type { LiveQuery } from '@hcengineering/query'

// export type Connection = Client & LiveQuery & TxOperations

/**
 * @public
 */
export const clientId = 'client' as Plugin

/**
 * @public
 */
export type ClientHook = (client: Client) => Promise<Client>

/**
 * @public
 */
export type ClientSocketFactory = (url: string) => ClientSocket

/**
 * @public
 */
export interface ClientSocket {
  onmessage?: ((this: ClientSocket, ev: MessageEvent) => any) | null
  onclose?: ((this: ClientSocket, ev: CloseEvent) => any) | null
  onopen?: ((this: ClientSocket, ev: Event) => any) | null
  onerror?: ((this: ClientSocket, ev: Event) => any) | null

  send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void

  close: () => void
}

/**
 * @public
 */
export type ClientFactory = (
  token: string,
  endpoint: string,
  onUpgrade?: () => void,
  onUnauthorized?: () => void,
  onConnect?: () => void
) => Promise<Client>

export default plugin(clientId, {
  metadata: {
    ClientHook: '' as Metadata<Resource<ClientHook>>,
    ClientSocketFactory: '' as Metadata<ClientSocketFactory>,
    FilterModel: '' as Metadata<boolean>
  },
  function: {
    GetClient: '' as Resource<ClientFactory>
  }
})
