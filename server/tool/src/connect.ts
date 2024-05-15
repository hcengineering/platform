//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
import { Client, LoadModelResponse, systemAccountEmail, Tx, WorkspaceId } from '@hcengineering/core'
import { addLocation, getMetadata, getResource, setMetadata } from '@hcengineering/platform'
import { generateToken } from '@hcengineering/server-token'
import { mkdtempSync } from 'fs'
import crypto from 'node:crypto'
import plugin from './plugin'

/**
 * @public
 */
export async function connect (
  transactorUrl: string,
  workspace: WorkspaceId,
  email?: string,
  extra?: Record<string, string>,
  model?: Tx[]
): Promise<Client> {
  const token = generateToken(email ?? systemAccountEmail, workspace, extra)

  // We need to override default factory with 'ws' one.
  // eslint-disable-next-line
  const WebSocket = require('ws')

  setMetadata(client.metadata.UseBinaryProtocol, true)
  setMetadata(client.metadata.UseProtocolCompression, true)

  setMetadata(client.metadata.ClientSocketFactory, (url) => {
    const socket = new WebSocket(url, {
      headers: {
        'User-Agent': getMetadata(plugin.metadata.UserAgent) ?? 'Anticrm Tool Client'
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

// Will use temporary file to store huge content into
export class BlobClient {
  transactorAPIUrl: string
  token: string
  tmpDir: string
  index: number
  constructor (transactorUrl: string, workspace: WorkspaceId, email?: string, extra?: Record<string, string>) {
    this.index = 0
    this.token = generateToken(email ?? systemAccountEmail, workspace, extra)

    this.transactorAPIUrl = transactorUrl.replaceAll('wss://', 'https://').replace('ws://', 'http://') + '/api/v1/blob/'

    this.tmpDir = mkdtempSync('blobs')
  }

  async pipeFromStorage (name: string, size: number): Promise<Buffer> {
    let written = 0
    const chunkSize = 256 * 1024
    const chunks: Buffer[] = []

    // Use ranges to iterave through file with retry if required.
    while (written < size) {
      for (let i = 0; i < 5; i++) {
        try {
          const response = await fetch(this.transactorAPIUrl + `?name=${encodeURIComponent(name)}`, {
            headers: {
              Authorization: 'Bearer ' + this.token,
              Range: `bytes=${written}-${Math.min(size - 1, written + chunkSize)}`
            }
          })
          const chunk = Buffer.from(await response.arrayBuffer())
          chunks.push(chunk)
          written += chunk.length
          break
        } catch (err: any) {
          if (i === 4) {
            console.error(err)
            throw err
          }
          // retry
        }
      }
    }
    return Buffer.concat(chunks)
  }

  async upload (name: string, size: number, contentType: string, buffer: Buffer): Promise<void> {
    await fetch(
      this.transactorAPIUrl + `?name=${encodeURIComponent(name)}&contentType=${encodeURIComponent(contentType)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + this.token,
          'Content-Type': 'application/octet-stream'
        },
        body: buffer
      }
    )
  }
}
