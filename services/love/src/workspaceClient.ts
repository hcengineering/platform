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

import core, { Client, Ref, TxOperations, type Blob } from '@hcengineering/core'
import drive, { createFile } from '@hcengineering/drive'
import love from '@hcengineering/love'
import { generateToken } from '@hcengineering/server-token'
import { getClient } from './client'
import config from './config'

export class WorkspaceClient {
  private client!: TxOperations

  private constructor (private readonly workspace: string) {}

  static async create (workspace: string): Promise<WorkspaceClient> {
    const instance = new WorkspaceClient(workspace)
    await instance.initClient(workspace)
    return instance
  }

  async close (): Promise<void> {
    await this.client.close()
  }

  private async initClient (workspace: string): Promise<Client> {
    const token = generateToken(config.SystemEmail, { name: workspace })
    const client = await getClient(token)
    this.client = new TxOperations(client, core.account.System)
    return this.client
  }

  async saveFile (uuid: string, name: string): Promise<void> {
    const current = await this.client.findOne(drive.class.Drive, { _id: love.space.Drive })
    if (current === undefined) {
      await this.client.createDoc(
        drive.class.Drive,
        core.space.Space,
        {
          private: false,
          archived: false,
          members: [],
          name: 'Records',
          description: 'Office records',
          type: drive.spaceType.DefaultDrive,
          autoJoin: true
        },
        love.space.Drive
      )
    }

    const blob = await this.client.findOne(core.class.Blob, { _id: uuid as Ref<Blob> })
    if (blob !== undefined) {
      const data = {
        file: uuid as Ref<Blob>,
        title: name,
        size: blob.size,
        type: blob.contentType,
        lastModified: blob.modifiedOn,
        // hardcoded values from preset we use
        // https://docs.livekit.io/realtime/egress/overview/#EncodingOptionsPreset
        metadata: {
          originalHeight: 720,
          originalWidth: 1280
        }
      }
      await createFile(this.client, love.space.Drive, drive.ids.Root, data)
    }
  }
}
