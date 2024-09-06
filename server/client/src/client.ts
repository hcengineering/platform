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

import client, { clientId } from '@hcengineering/client'
import { Client, LoadModelResponse, Tx } from '@hcengineering/core'
import { addLocation, getMetadata, getResource, setMetadata } from '@hcengineering/platform'
import crypto from 'node:crypto'
import plugin from './plugin'

/**
 * @public
 *
 * If connectTimeout is set, connect will try to connect only specified amount of time, and will return failure if failed.
 */
export async function createClient (
  transactorUrl: string,
  token: string,
  model?: Tx[],
  connectTimeout: number = 0
): Promise<Client> {
  // We need to override default factory with 'ws' one.
  // eslint-disable-next-line
  const WebSocket = require('ws')

  setMetadata(client.metadata.UseBinaryProtocol, true)
  setMetadata(client.metadata.UseProtocolCompression, true)
  setMetadata(client.metadata.ConnectionTimeout, connectTimeout)

  setMetadata(client.metadata.ClientSocketFactory, (url) => {
    const socket = new WebSocket(url, {
      headers: {
        'User-Agent': getMetadata(plugin.metadata.UserAgent) ?? 'Anticrm Client'
      }
    })
    return socket
  })
  addLocation(clientId, () => import('@hcengineering/client-resources'))

  if (model !== undefined) {
    let prev = ''
    const hashes = model.map((it) => {
      const h = crypto.createHash('sha1')
      h.update(prev)
      h.update(JSON.stringify(it))
      prev = h.digest('hex')
      return prev
    })
    setMetadata(client.metadata.OverridePersistenceStore, {
      load: async () => ({
        hash: hashes[hashes.length - 1],
        transactions: model,
        full: true
      }),
      store: async (model: LoadModelResponse) => {}
    })
  }

  const clientFactory = await getResource(client.function.GetClient)
  return await clientFactory(token, transactorUrl)
}
