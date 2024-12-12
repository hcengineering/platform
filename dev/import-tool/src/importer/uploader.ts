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
import {
  type Ref,
  type Blob as PlatformBlob,
  type CollaborativeDoc,
  concatLink,
  makeCollabJsonId
} from '@hcengineering/core'

export interface FileUploader {
  uploadFile: (name: string, file: Blob) => Promise<Ref<PlatformBlob>>
  uploadCollaborativeDoc: (collabId: CollaborativeDoc, data: Buffer) => Promise<Ref<PlatformBlob>>
  getFileUrl: (id: string) => string
}

export class FrontFileUploader implements FileUploader {
  constructor (
    private readonly frontUrl: string,
    private readonly workspaceId: string,
    private readonly token: string
  ) {
    this.getFileUrl = this.getFileUrl.bind(this)
  }

  public async uploadFile (name: string, file: Blob): Promise<Ref<PlatformBlob>> {
    const form = new FormData()
    form.append('file', file, name)

    const res = await fetch(concatLink(this.frontUrl, '/files'), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.token
      },
      body: form
    })

    if (res.ok && res.status === 200) {
      return name as Ref<PlatformBlob>
    }

    throw new Error('Failed to upload file')
  }

  public getFileUrl (id: string): string {
    return concatLink(this.frontUrl, `/files/${this.workspaceId}/${id}?file=${id}&workspace=${this.workspaceId}`)
  }

  public async uploadCollaborativeDoc (collabId: CollaborativeDoc, data: Buffer): Promise<Ref<PlatformBlob>> {
    const blobId = makeCollabJsonId(collabId)
    const blob = new Blob([data], { type: 'application/json' })
    return await this.uploadFile(blobId, blob)
  }
}
