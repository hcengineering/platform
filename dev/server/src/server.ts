//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { DOMAIN_TX } from '@anticrm/core'
import { start as startJsonRpc } from '@anticrm/server-ws'
import { createInMemoryAdapter, createInMemoryTxAdapter } from '@anticrm/dev-storage'
import { createServerStorage } from '@anticrm/server-core'
import type { DbConfiguration } from '@anticrm/server-core'

import { addLocation } from '@anticrm/platform'
import { serverChunterId } from '@anticrm/server-chunter'

/**
 * @public
 */
export async function start (port: number, host?: string): Promise<void> {
  addLocation(serverChunterId, () => import('@anticrm/server-chunter-resources'))

  startJsonRpc(() => {
    const conf: DbConfiguration = {
      domains: {
        [DOMAIN_TX]: 'InMemoryTx'
      },
      defaultAdapter: 'InMemory',
      adapters: {
        InMemoryTx: {
          factory: createInMemoryTxAdapter,
          url: ''
        },
        InMemory: {
          factory: createInMemoryAdapter,
          url: ''
        }
      },
      workspace: ''
    }
    return createServerStorage(conf)
  }, port, host)
}
