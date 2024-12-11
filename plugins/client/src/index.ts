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

import type { Client, ClientConnectEvent, MeasureContext, TxPersistenceStore } from '@hcengineering/core'
import { type Plugin, type Resource, type Metadata, plugin } from '@hcengineering/platform'

/**
 * @public
 */
export const clientId = 'client' as Plugin

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

  bufferedAmount?: number
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

export interface ClientFactoryOptions {
  socketFactory?: ClientSocketFactory
  useBinaryProtocol?: boolean
  useProtocolCompression?: boolean
  connectionTimeout?: number
  onHello?: (serverVersion?: string) => boolean
  onUpgrade?: () => void
  onUnauthorized?: () => void
  onArchived?: () => void
  onConnect?: (event: ClientConnectEvent, data: any) => Promise<void>
  ctx?: MeasureContext
  onDialTimeout?: () => void | Promise<void>
}

/**
 * @public
 */
export type ClientFactory = (token: string, endpoint: string, opt?: ClientFactoryOptions) => Promise<Client>

// client - will filter out all server model elements
// It will also filter out all UI Elements, like Actions, View declarations etc.
// ui - will filter out all server element's and all UI disabled elements.
export type FilterMode = 'none' | 'client' | 'ui'

export default plugin(clientId, {
  metadata: {
    ClientSocketFactory: '' as Metadata<ClientSocketFactory>,
    FilterModel: '' as Metadata<FilterMode>,
    ExtraPlugins: '' as Metadata<Plugin[]>,
    UseBinaryProtocol: '' as Metadata<boolean>,
    UseProtocolCompression: '' as Metadata<boolean>,
    ConnectionTimeout: '' as Metadata<number>,
    OverridePersistenceStore: '' as Metadata<TxPersistenceStore>
  },
  function: {
    GetClient: '' as Resource<ClientFactory>
  },
  event: {
    NetworkRequests: '' as Metadata<string>
  }
})
