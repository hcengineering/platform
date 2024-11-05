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

import { type ClientSocketFactory } from '@hcengineering/client'
import { type Client, type TxOperations } from '@hcengineering/core'
import { type MarkupOperations } from './markup'

/**
 * Platform API client
 * @public
 * */
export type PlatformClient = AsyncDisposable &
Pick<
TxOperations,
| 'createDoc'
| 'updateDoc'
| 'removeDoc'
| 'addCollection'
| 'updateCollection'
| 'removeCollection'
| 'createMixin'
| 'updateMixin'
> &
Pick<Client, 'getHierarchy' | 'getModel' | 'findAll' | 'findOne' | 'close'> &
MarkupOperations

/**
 * Configuration options for password-based authentication
 * @public
 */

export interface PasswordAuthOptions {
  /** User's email address */
  email: string

  /** User's password */
  password: string

  /** Workspace URL name */
  workspace: string
}

/**
 * Configuration options for token-based authentication
 * @public
 */
export interface TokenAuthOptions {
  /** Authentication token */
  token: string

  /** Workspace URL name */
  workspace: string
}

/**
 * Union type representing all authentication options
 * Can be either password-based or token-based authentication
 * @public
 */
export type AuthOptions = PasswordAuthOptions | TokenAuthOptions

/**
 * Configuration options for socket connection
 * @public
 */
export interface ConnectSocketOptions {
  /**
   * Optional factory for creating custom WebSocket implementations
   * Particularly useful in Node.js environments where you might need
   * to provide a specific WebSocket client implementation
   * If not provided, a default WebSocket implementation will be used
   */
  socketFactory?: ClientSocketFactory

  /**
   * Optional timeout duration for the connection attempt in milliseconds
   * Specifies how long to wait for a connection before timing out
   */
  connectionTimeout?: number
}

/**
 * API connect options
 * @public
 */
export type ConnectOptions = ConnectSocketOptions & AuthOptions
