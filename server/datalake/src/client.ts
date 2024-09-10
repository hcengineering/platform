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

import { type MeasureContext, type WorkspaceId, concatLink } from '@hcengineering/core'
import FormData from 'form-data'
import fetch from 'node-fetch'
import { Readable } from 'stream'

/** @public */
export interface ObjectMetadata {
  lastModified: number
  name: string
  type: string
  size?: number
}

/** @public */
export interface PutObjectOutput {
  id: string
}

interface BlobUploadError {
  key: string
  error: string
}

interface BlobUploadSuccess {
  key: string
  id: string
  metadata: ObjectMetadata
}

type BlobUploadResult = BlobUploadSuccess | BlobUploadError

/** @public */
export class Client {
  constructor (private readonly endpoint: string) {}

  getObjectUrl (ctx: MeasureContext, workspace: WorkspaceId, objectName: string): string {
    const path = `/blob/${workspace.name}/${encodeURIComponent(objectName)}`
    return concatLink(this.endpoint, path)
  }

  async getObject (ctx: MeasureContext, workspace: WorkspaceId, objectName: string): Promise<Readable> {
    const url = this.getObjectUrl(ctx, workspace, objectName)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('HTTP error ' + response.status)
    }

    if (response.body == null) {
      ctx.error('bad datalake response', { objectName })
      throw new Error('Missing response body')
    }

    return Readable.from(response.body)
  }

  async deleteObject (ctx: MeasureContext, workspace: WorkspaceId, objectName: string): Promise<void> {
    const url = this.getObjectUrl(ctx, workspace, objectName)

    const response = await fetch(url, { method: 'DELETE' })

    if (!response.ok) {
      throw new Error('HTTP error ' + response.status)
    }
  }

  async putObject (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    objectName: string,
    stream: Readable | Buffer | string,
    metadata: ObjectMetadata
  ): Promise<PutObjectOutput> {
    const path = `/upload/form-data/${workspace.name}`
    const url = concatLink(this.endpoint, path)

    const form = new FormData()
    const options: FormData.AppendOptions = {
      filename: encodeURIComponent(objectName),
      contentType: metadata.type,
      knownLength: metadata.size,
      header: {
        'Last-Modified': metadata.lastModified
      }
    }
    form.append('file', stream, options)

    const response = await fetch(url, {
      method: 'POST',
      body: form
    })

    if (!response.ok) {
      throw new Error('HTTP error ' + response.status)
    }

    const result = (await response.json()) as BlobUploadResult[]
    if (result.length !== 1) {
      ctx.error('bad datalake response', { objectName, result })
      throw new Error('Bad datalake response')
    }

    const uploadResult = result[0]

    if ('error' in uploadResult) {
      ctx.error('error during blob upload', { objectName, error: uploadResult.error })
      throw new Error('Upload failed: ' + uploadResult.error)
    } else {
      return { id: uploadResult.id }
    }
  }
}
