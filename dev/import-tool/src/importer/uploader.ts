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
  concatLink,
  type Ref,
  type Blob as PlatformBlob,
  type Doc,
  type CollaborativeDoc,
  collaborativeDocParse
} from '@hcengineering/core'

export interface FileUploader {
  uploadFile: (id: Ref<Doc>, name: string, file: File, contentType?: string) => Promise<Response>
  uploadCollaborativeDoc: (id: Ref<Doc>, collabId: CollaborativeDoc, data: Buffer) => Promise<Response>
  getFileUrl: (id: string) => string
}

export interface UploadResult {
  key: 'file'
  id: Ref<PlatformBlob>
}

export class FrontFileUploader implements FileUploader {
  constructor (
    private readonly frontUrl: string,
    private readonly workspaceId: string,
    private readonly token: string
  ) {
    this.getFileUrl = this.getFileUrl.bind(this)
  }

  public async uploadFile (id: Ref<Doc>, name: string, file: File, contentType?: string): Promise<Response> {
    const form = new FormData()
    form.append('file', file, name)
    form.append('type', contentType ?? file.type)
    form.append('size', file.size.toString())
    form.append('name', file.name)
    form.append('id', id)
    form.append('data', new Blob([file]))

    return await fetch(concatLink(this.frontUrl, '/files'), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.token
      },
      body: form
    })
  }

  public getFileUrl (id: string): string {
    return concatLink(this.frontUrl, `/files/${this.workspaceId}/${id}?file=${id}&workspace=${this.workspaceId}`)
  }

  public async uploadCollaborativeDoc (id: Ref<Doc>, collabId: CollaborativeDoc, data: Buffer): Promise<Response> {
    const file = new File([data], collabId)
    const { documentId } = collaborativeDocParse(collabId)
    return await this.uploadFile(id, documentId, file, 'application/ydoc')
  }
}
