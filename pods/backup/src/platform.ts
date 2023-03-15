//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { getWorkspaceId } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { setMetadata } from '@hcengineering/platform'
import { backup, createMinioBackupStorage } from '@hcengineering/server-backup'
import serverToken from '@hcengineering/server-token'
import got from 'got'
import { ObjectId } from 'mongodb'
import config from './config'

/**
 * @public
 */
export interface Workspace {
  _id: ObjectId
  workspace: string
  organisation: string
  accounts: ObjectId[]
  productId: string
}

async function getWorkspaces (): Promise<Workspace[]> {
  const { body }: { body: { error?: string, result?: any[] } } = await got.post(config.AccountsURL, {
    json: {
      method: 'listWorkspaces',
      params: []
    },
    responseType: 'json'
  })

  if (body.error !== undefined) {
    throw Error(body.error)
  }

  return (body.result as Workspace[]) ?? []
}

export class PlatformWorker {
  minio!: MinioService

  async close (): Promise<void> {}

  async init (): Promise<void> {
    setMetadata(serverToken.metadata.Secret, config.Secret)
    let minioPort = 9000
    let minioEndpoint = config.MinioEndpoint
    const sp = minioEndpoint.split(':')
    if (sp.length > 1) {
      minioEndpoint = sp[0]
      minioPort = parseInt(sp[1])
    }

    this.minio = new MinioService({
      endPoint: minioEndpoint,
      port: minioPort,
      useSSL: false,
      accessKey: config.MinioAccessKey,
      secretKey: config.MinioSecretKey
    })

    await this.backup().then(() => {
      void this.schedule()
    })
  }

  async schedule (): Promise<void> {
    console.log('schedule timeout for', config.Interval, ' seconds')
    setTimeout(() => {
      void this.backup().then(() => {
        void this.schedule()
      })
    }, config.Interval * 1000)
  }

  async backup (): Promise<void> {
    const workspaces = await getWorkspaces()
    for (const ws of workspaces) {
      console.log('\n\nBACKUP WORKSPACE ', ws.workspace, ws.productId)
      try {
        const storage = await createMinioBackupStorage(
          this.minio,
          getWorkspaceId('backups', ws.productId),
          ws.workspace
        )
        await backup(config.TransactorURL, getWorkspaceId(ws.workspace, ws.productId), storage)
      } catch (err: any) {
        console.error('\n\nFAILED to BACKUP', ws, err)
      }
    }
  }

  static async create (): Promise<PlatformWorker> {
    const worker = new PlatformWorker()
    await worker.init()
    return worker
  }

  private constructor () {}
}
