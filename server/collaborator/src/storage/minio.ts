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

import {
  YDocVersion,
  loadCollaborativeDoc,
  saveCollaborativeDocVersion,
  takeCollaborativeDocSnapshot
} from '@hcengineering/collaboration'
import {
  CollaborativeDocVersion,
  CollaborativeDocVersionHead,
  MeasureContext,
  collaborativeDocFormat
} from '@hcengineering/core'
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

function isValidDocumentId (documentId: Omit<MinioDocumentId, 'workspaceUrl'>): boolean {
  return documentId.minioDocumentId !== '' && documentId.versionId !== ''
}

export class MinioStorageAdapter implements StorageAdapter {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly minio: MinioService
  ) {}

  async loadDocument (documentId: string, context: Context): Promise<YDoc | undefined> {
    const { workspaceId } = context

    const { minioDocumentId, versionId } = parseDocumentId(documentId)

    if (!isValidDocumentId({ minioDocumentId, versionId })) {
      await this.ctx.error('malformed document id', { documentId })
      return undefined
    }

    return await this.ctx.with('load-document', {}, async (ctx) => {
      try {
        const collaborativeDoc = collaborativeDocFormat({
          documentId: minioDocumentId,
          versionId,
          lastVersionId: versionId
        })
        return await loadCollaborativeDoc(this.minio, workspaceId, collaborativeDoc, ctx)
      } catch {
        return undefined
      }
    })
  }

  async saveDocument (
    documentId: string,
    document: YDoc,
    snapshot: YDocVersion | undefined,
    context: Context
  ): Promise<void> {
    const { workspaceId } = context

    const { minioDocumentId, versionId } = parseDocumentId(documentId)

    if (!isValidDocumentId({ minioDocumentId, versionId })) {
      await this.ctx.error('malformed document id', { documentId })
      return undefined
    }

    await this.ctx.with('save-document', {}, async (ctx) => {
      await saveCollaborativeDocVersion(this.minio, workspaceId, minioDocumentId, versionId, document, ctx)
    })
  }

  async takeSnapshot (documentId: string, document: YDoc, context: Context): Promise<YDocVersion | undefined> {
    const { clientFactory, workspaceId } = context

    const client = await clientFactory({ derived: false })
    const timestamp = Date.now()

    const yDocVersion: YDocVersion = {
      versionId: `${timestamp}`,
      name: 'Automatic snapshot',
      createdBy: client.user,
      createdOn: timestamp
    }

    const { minioDocumentId, versionId } = parseDocumentId(documentId)
    const collaborativeDoc = collaborativeDocFormat({
      documentId: minioDocumentId,
      versionId,
      lastVersionId: versionId
    })

    await this.ctx.with('take-snapshot', {}, async (ctx) => {
      await takeCollaborativeDocSnapshot(this.minio, workspaceId, collaborativeDoc, document, yDocVersion, ctx)
    })

    return yDocVersion
  }
}
