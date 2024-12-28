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
import { saveCollabJson } from '@hcengineering/collaboration'
import { CollaborativeDoc, Markup, MeasureContext, Blob as PlatformBlob, Ref, WorkspaceIds } from '@hcengineering/core'
import type { StorageAdapter } from '@hcengineering/server-core'
import { FileUploader, UploadResult } from './uploader'

export class StorageFileUploader implements FileUploader {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly storageAdapter: StorageAdapter,
    private readonly wsIds: WorkspaceIds
  ) {
    this.uploadFile = this.uploadFile.bind(this)
  }

  public async uploadFile (id: string, blob: Blob): Promise<UploadResult> {
    try {
      const arrayBuffer = await blob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await this.storageAdapter.put(this.ctx, this.wsIds.uuid, id, buffer, blob.type, buffer.byteLength)
      return { success: true, id: id as Ref<PlatformBlob> }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  public async uploadCollaborativeDoc (collabId: CollaborativeDoc, content: Markup): Promise<UploadResult> {
    try {
      const blobId = await saveCollabJson(this.ctx, this.storageAdapter, this.wsIds.uuid, collabId, content)
      return { success: true, id: blobId }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  public getFileUrl (id: string): string {
    return ''
  }
}
