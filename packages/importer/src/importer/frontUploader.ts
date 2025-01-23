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
  type CollaborativeDoc,
  concatLink,
  makeCollabJsonId,
  Markup,
  type Blob as PlatformBlob,
  type Ref
} from '@hcengineering/core'
import { FileUploader, UploadResult } from './uploader'

interface FileUploadError {
  key: string
  error: string
}

interface FileUploadSuccess {
  key: string
  id: string
}

type FileUploadResult = FileUploadSuccess | FileUploadError

export class FrontFileUploader implements FileUploader {
  constructor (
    private readonly frontUrl: string,
    private readonly workspaceId: string,
    private readonly workspaceDataId: string,
    private readonly token: string
  ) {
    this.getFileUrl = this.getFileUrl.bind(this)
  }

  public async uploadFile (name: string, blob: Blob): Promise<UploadResult> {
    const form = new FormData()
    form.append('file', blob, name)

    const response = await fetch(concatLink(this.frontUrl, '/files'), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.token
      },
      body: form
    })

    if (response.status !== 200) {
      return { success: false, error: response.statusText }
    }

    const responseText = await response.text()
    if (responseText === undefined) {
      return { success: false, error: response.statusText }
    }

    const uploadResult = JSON.parse(responseText) as FileUploadResult[]
    if (!Array.isArray(uploadResult) || uploadResult.length === 0) {
      return { success: false, error: response.statusText }
    }

    const result = uploadResult[0]
    if ('error' in result) {
      return { success: false, error: result.error }
    }

    return { success: true, id: result.id as Ref<PlatformBlob> }
  }

  public getFileUrl (id: string): string {
    return concatLink(this.frontUrl, `/files/${this.workspaceDataId ?? this.workspaceId}/${id}?file=${id}&workspace=${this.workspaceId}`)
  }

  public async uploadCollaborativeDoc (collabId: CollaborativeDoc, content: Markup): Promise<UploadResult> {
    const buffer = Buffer.from(content)
    const blobId = makeCollabJsonId(collabId)
    const blob = new Blob([buffer], { type: 'application/json' })
    return await this.uploadFile(blobId, blob)
  }
}
