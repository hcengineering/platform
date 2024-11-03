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
import { Client, TxOperations } from '@hcengineering/core'

/** @public */
export type APIClient = AsyncDisposable &
Pick<TxOperations, 'createDoc' | 'updateDoc' | 'removeDoc'> &
Omit<Client, 'notify' | 'searchFulltext' | 'tx'>

/** @public */
export interface PasswordAuthOptions {
  email: string
  password: string
  workspace: string
}

/** @public */
export interface TokenAuthOptions {
  token: string
  workspace: string
}

/** @public */
export type AuthOptions = PasswordAuthOptions | TokenAuthOptions

/** @public */
export interface ConnectSocketOptions {
  socketFactory?: ClientSocketFactory
  useProtocolCompression?: boolean
  connectionTimeout?: number
}

/** @public */
export type ConnectOptions = ConnectSocketOptions & AuthOptions
