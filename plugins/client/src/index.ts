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

import { Metadata, plugin } from '@anticrm/platform'
import type { Plugin, Resource } from '@anticrm/platform'
import type { Client } from '@anticrm/core'
// import type { LiveQuery } from '@anticrm/query'

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
export type ClientFactory = (token: string, endpoint: string, factory?: (url: string) => any) => Promise<Client>

export default plugin(clientId,
  {
    metadata: {
      ClientHook: '' as Metadata<Resource<ClientHook>>
    },
    function: {
      GetClient: '' as Resource<ClientFactory>
    }
  }
)
