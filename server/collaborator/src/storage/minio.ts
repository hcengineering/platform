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

import attachment, { Attachment } from '@hcengineering/attachment'
import { MeasureContext, Ref } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { Doc as YDoc, applyUpdate, encodeStateAsUpdate } from 'yjs'

import { Context } from '../context'

import { StorageAdapter } from './adapter'

interface MinioDocumentId {
  workspaceUrl: string
  minioDocumentId: string
}

function parseDocumentId (documentId: string): MinioDocumentId {
  const [workspaceUrl, minioDocumentId] = documentId.split('/')
  return {
    workspaceUrl: workspaceUrl ?? '',
    minioDocumentId: minioDocumentId ?? ''
  }
}

function isValidDocumentId (documentId: MinioDocumentId): boolean {
  return documentId.minioDocumentId !== '' && documentId.workspaceUrl !== ''
}

function maybePlatformDocumentId (documentId: string): boolean {
  return !documentId.includes('%')
}

export class MinioStorageAdapter implements StorageAdapter {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly minio: MinioService
  ) {}

  async loadDocument (documentId: string, context: Context): Promise<YDoc | undefined> {
    const { workspaceId } = context

    const { workspaceUrl, minioDocumentId } = parseDocumentId(documentId)

    if (!isValidDocumentId({ workspaceUrl, minioDocumentId })) {
      console.warn('malformed document id', documentId)
      return undefined
    }

    return await this.ctx.with('load-document', {}, async (ctx) => {
      const minioDocument = await ctx.with('query', {}, async () => {
        try {
          const buffer = await this.minio.read(workspaceId, minioDocumentId)
          return Buffer.concat(buffer)
        } catch {
          return undefined
        }
      })

      if (minioDocument === undefined) {
        return undefined
      }

      const ydoc = new YDoc()

      await ctx.with('transform', {}, () => {
        try {
          const uint8arr = new Uint8Array(minioDocument)
          applyUpdate(ydoc, uint8arr)
        } catch (err) {
          console.error(err)
        }
      })

      return ydoc
    })
  }

  async saveDocument (documentId: string, document: YDoc, context: Context): Promise<void> {
    const { clientFactory, workspaceId } = context

    const { workspaceUrl, minioDocumentId } = parseDocumentId(documentId)

    if (!isValidDocumentId({ workspaceUrl, minioDocumentId })) {
      console.warn('malformed document id', documentId)
      return undefined
    }

    await this.ctx.with('save-document', {}, async (ctx) => {
      const buffer = await ctx.with('transform', {}, () => {
        const updates = encodeStateAsUpdate(document)
        return Buffer.from(updates.buffer)
      })

      await ctx.with('update', {}, async () => {
        const metadata = { 'content-type': 'application/ydoc' }
        await this.minio.put(workspaceId, minioDocumentId, buffer, buffer.length, metadata)
      })

      // minio file is usually an attachment document
      // we need to touch an attachment from here to notify platform about changes

      if (!maybePlatformDocumentId(minioDocumentId)) {
        // documentId is not a platform document id, we can skip platform notification
        return
      }

      await ctx.with('platform', {}, async () => {
        const client = await ctx.with('connect', {}, async () => {
          return await clientFactory({ derived: true })
        })

        const current = await ctx.with('query', {}, async () => {
          return await client.findOne(attachment.class.Attachment, { _id: minioDocumentId as Ref<Attachment> })
        })

        if (current !== undefined) {
          await ctx.with('update', {}, async () => {
            await client.update(current, { lastModified: Date.now(), size: buffer.length })
          })
        }
      })
    })
  }
}
