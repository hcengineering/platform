//
// Copyright © 2025 Hardcore Engineering Inc.
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

import {
  connectStorage,
  getWorkspaceToken,
  loadServerConfig,
  NotFoundError,
  type ServerConfig,
  type StorageClient,
  type WorkspaceToken
} from '@hcengineering/api-client'
import { systemAccountUuid, generateUuid, type Ref, type Blob } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'

describe('storage-api-server', () => {
  const frontUrl = 'http://huly.local:8083'
  const wsName = 'api-tests'
  let config: ServerConfig
  let apiWorkspace1: WorkspaceToken

  beforeAll(async () => {
    config = await loadServerConfig(frontUrl)

    apiWorkspace1 = await getWorkspaceToken(
      'http://huly.local:8083',
      {
        email: 'user1',
        password: '1234',
        workspace: wsName
      },
      config
    )
  }, 10000)

  async function connect (ws?: WorkspaceToken, asSystem = false): Promise<StorageClient> {
    const tok = ws ?? apiWorkspace1
    const token = asSystem ? generateToken(systemAccountUuid, tok.workspaceId, undefined, 'secret') : tok.token

    return await connectStorage(frontUrl, { token, workspace: tok.info.workspaceUrl }, config)
  }

  it('get unknown blob', async () => {
    const storage = await connect()
    await expect((async () => await storage.stat(generateUuid()))()).resolves.toBeUndefined()
    await expect((async () => await storage.get(generateUuid()))()).rejects.toThrow(NotFoundError)
  })

  it('upload file', async () => {
    const storage = await connect()
    const fileUuid = generateUuid()
    const buf = new Uint8Array(100)
    crypto.getRandomValues(buf)
    const uploadBuf = Buffer.from(buf)
    const uploadBlob = await storage.put(fileUuid, uploadBuf, 'application/data', 100)
    expect(uploadBlob._id).toBe(fileUuid as Ref<Blob>)

    const statBlob = await storage.stat(fileUuid)
    const blob = { modifiedOn: uploadBlob.modifiedOn, ...statBlob }
    expect(statBlob).toStrictEqual(blob)

    const download = await storage.get(uploadBlob._id)
    const downloadChunks: Uint8Array[] = []
    download.on('data', (chunk) => {
      downloadChunks.push(chunk)
    })
    download.on('end', () => {
      const downloadBuf = Buffer.concat(downloadChunks)
      expect(downloadBuf).toStrictEqual(uploadBuf)
    })
  })
})
