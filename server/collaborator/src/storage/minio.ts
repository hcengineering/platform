//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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

import { loadCollaborativeDocVersion, saveCollaborativeDocVersion } from '@hcengineering/collaboration'
import { CollaborativeDocVersion, CollaborativeDocVersionHead, MeasureContext } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { Doc as YDoc } from 'yjs'

import { Context } from '../context'

import { StorageAdapter } from './adapter'

export interface MinioDocumentId {
  workspaceUrl: string
  minioDocumentId: string
  versionId: CollaborativeDocVersion
}

export function parseDocumentId (documentId: string): MinioDocumentId {
  const [workspaceUrl, minioDocumentId, versionId] = documentId.split('/')
  return {
    workspaceUrl: workspaceUrl ?? '',
    minioDocumentId: minioDocumentId ?? '',
    versionId: versionId ?? CollaborativeDocVersionHead
  }
}

function isValidDocumentId (documentId: MinioDocumentId): boolean {
  return documentId.workspaceUrl !== '' && documentId.minioDocumentId !== '' && documentId.versionId !== ''
}

export class MinioStorageAdapter implements StorageAdapter {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly minio: MinioService
  ) {}

  async loadDocument (documentId: string, context: Context): Promise<YDoc | undefined> {
    const { workspaceId } = context

    const { workspaceUrl, minioDocumentId, versionId } = parseDocumentId(documentId)

    if (!isValidDocumentId({ workspaceUrl, minioDocumentId, versionId })) {
      console.warn('malformed document id', documentId)
      return undefined
    }

    return await this.ctx.with('load-document', {}, async (ctx) => {
      try {
        return await loadCollaborativeDocVersion(this.minio, workspaceId, minioDocumentId, versionId, ctx)
      } catch {
        return undefined
      }
    })
  }

  async saveDocument (documentId: string, document: YDoc, context: Context): Promise<void> {
    const { workspaceId } = context

    const { workspaceUrl, minioDocumentId, versionId } = parseDocumentId(documentId)

    if (!isValidDocumentId({ workspaceUrl, minioDocumentId, versionId })) {
      console.warn('malformed document id', documentId)
      return undefined
    }

    await this.ctx.with('save-document', {}, async (ctx) => {
      await saveCollaborativeDocVersion(this.minio, workspaceId, minioDocumentId, versionId, document, ctx)
    })
  }
}
