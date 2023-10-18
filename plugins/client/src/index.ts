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

import type { AccountClient, ClientConnectEvent } from '@hcengineering/core'
import type { Plugin, Resource } from '@hcengineering/platform'
import { Metadata, plugin } from '@hcengineering/platform'
// import type { LiveQuery } from '@hcengineering/query'

// export type Connection = Client & LiveQuery & TxOperations

/**
 * @public
 */
export const clientId = 'client' as Plugin

/**
 * @public
 */
export type ClientHook = (client: AccountClient) => Promise<AccountClient>

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

  close: (code?: number) => void

  readyState: ClientSocketReadyState
}

/**
 * @public
 */
export enum ClientSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3
}

/**
 * @public
 */
export type ClientFactory = (
  token: string,
  endpoint: string,
  onUpgrade?: () => void,
  onUnauthorized?: () => void,
  onConnect?: (event: ClientConnectEvent) => void
) => Promise<AccountClient>

export default plugin(clientId, {
  metadata: {
    ClientHook: '' as Metadata<Resource<ClientHook>>,
    ClientSocketFactory: '' as Metadata<ClientSocketFactory>,
    FilterModel: '' as Metadata<boolean>,
    ExtraPlugins: '' as Metadata<Plugin[]>,
    UseBinaryProtocol: '' as Metadata<boolean>,
    UseProtocolCompression: '' as Metadata<boolean>
  },
  function: {
    GetClient: '' as Resource<ClientFactory>
  },
  event: {
    NetworkRequests: '' as Metadata<string>
  }
})
