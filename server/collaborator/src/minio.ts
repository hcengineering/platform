//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { WorkspaceId } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'

export class MinioClient {
  constructor (
    readonly client: MinioService,
    private readonly workspaceId: WorkspaceId
  ) {}

  async exists (name: string): Promise<boolean> {
    try {
      await this.client.stat(this.workspaceId, name)
      return true
    } catch (err) {
      return false
    }
  }

  async loadFile (name: string): Promise<Buffer> {
    const data = await this.client.read(this.workspaceId, name)
    return Buffer.concat(data)
  }

  async writeFile (name: string, buffer: Buffer): Promise<void> {
    const metaData = { 'content-type': 'application/ydoc' }
    await this.client.put(this.workspaceId, name, buffer, buffer.length, metaData)
  }
}
