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

import { BackupClient } from '../backup'
import { Class, Doc, Ref, Timestamp, type Account, type AccountUuid, type AccountWorkspace } from '../classes'
import { Hierarchy } from '../hierarchy'
import { MeasureContext } from '../measurements'
import { ModelDb } from '../memdb'
import type {
  DocumentQuery,
  FindOptions,
  FindResult,
  FulltextStorage,
  SearchOptions,
  SearchQuery,
  SearchResult,
  Storage,
  TxResult,
  WithLookup
} from '../storage'
import { Tx } from '../tx'
import { type WorkspaceUuid } from '../utils'

/**
 * @public
 */
export type TxHandler = (tx: Tx[], workspace?: WorkspaceUuid, target?: AccountUuid, exclude?: AccountUuid[]) => void

/**
 * @public
 */
export interface Client extends Storage, FulltextStorage {
  notify?: (tx: Tx[], workspace?: WorkspaceUuid, target?: string, exclude?: string[]) => void
  getHierarchy: () => Hierarchy
  getModel: () => ModelDb

  // If not called, will cause model and hierarchy to be empty.

  findOne: <T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<WithLookup<T> | undefined>
  close: () => Promise<void>
  getConnection?: () => ClientConnection

  // Get a list of active workspaces, not in maintenance mode and enabled.
  getAvailableWorkspaces: () => WorkspaceUuid[]

  // A list of active workspaces, workspace could be disabled or in maintenance mode, in this case it will not be here.
  getWorkspaces: () => Record<WorkspaceUuid, AccountWorkspace>
}

/**
 * @public
 */
export interface LoadModelResponse {
  // A diff or a full set of transactions.
  transactions: Tx[]
  // A current hash chain
  hash: string
  // If full model is returned, on hash diff for request
  full: boolean
}

/**
 * @public
 */
export enum ClientConnectEvent {
  Connected, // In case we just connected to server, and receive a full model
  Reconnected, // In case we re-connected to server and receive and apply diff.

  // Client could cause back a few more states.
  Upgraded, // In case client code receive a full new model and need to be rebuild.
  Refresh, // In case we detect query refresh is required
  Maintenance // In case workspace are in maintenance mode
}

export type Handler = (...result: any[]) => void

export interface ConnectionEvents {
  onHello?: (serverVersion?: string) => boolean
  onUnauthorized?: () => void
  onConnect?: (
    event: ClientConnectEvent,
    lastTx: Record<WorkspaceUuid, string | undefined> | undefined,
    data: any
  ) => Promise<void>
  onDialTimeout?: () => void | Promise<void>
  onAccount?: (account: Account) => void
}

export type SubscribedWorkspaceInfo = Record<
WorkspaceUuid,
{ lastHash: string | undefined, lastTx: string | undefined }
>

export interface TxOptions {
  user?: AccountUuid // For system account only, to akt on behalf of another user
}

/**
 * @public
 */
export interface ClientConnection extends BackupClient {
  isConnected: () => boolean
  close: () => Promise<void>

  // If hash is passed, will return LoadModelResponse
  loadModel: (last: Timestamp, hash?: string, workspace?: WorkspaceUuid) => Promise<Tx[] | LoadModelResponse>
  getLastHash?: (ctx: MeasureContext) => Promise<Record<WorkspaceUuid, string | undefined>>
  pushHandler: (handler: Handler) => void
  getAccount: () => Promise<Account>

  // For system account we could subscribe to extra workspaces.
  subscribe: (subscription: {
    accounts?: AccountUuid[]
    workspaces?: WorkspaceUuid[]
  }) => Promise<SubscribedWorkspaceInfo>
  unsubscribe: (subscription: { accounts?: AccountUuid[], workspaces?: WorkspaceUuid[] }) => Promise<void>

  // Operations

  findAll: <T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>

  tx: (tx: Tx, options?: TxOptions) => Promise<TxResult>

  searchFulltext: (query: SearchQuery, options: SearchOptions) => Promise<SearchResult>
}

/**
 * @public
 */
export interface TxPersistenceStore {
  load: () => Promise<LoadModelResponse>
  store: (model: LoadModelResponse) => Promise<void>
}

export type ModelFilter = (tx: Tx[]) => Tx[]

export interface ClientConnectOptions extends ConnectionEvents {
  modelFilter?: ModelFilter
  txPersistence?: TxPersistenceStore
  _ctx?: MeasureContext
}
