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

import { MeasureContext } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { Document } from '@hocuspocus/server'
import { Doc as YDoc, applyUpdate, encodeStateAsUpdate } from 'yjs'

import { Context } from '../context'
import { MinioClient } from '../minio'

import { StorageAdapter } from './adapter'

export class MinioStorageAdapter implements StorageAdapter {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly minio: MinioService
  ) {}

  async loadDocument (documentId: string, context: Context): Promise<YDoc | undefined> {
    const {
      decodedToken: { workspace }
    } = context

    const minio = new MinioClient(this.minio, workspace)

    return await this.ctx.with('load-document', {}, async (ctx) => {
      const minioDocument = await ctx.with('query', {}, async () => {
        try {
          return await minio.loadFile(documentId)
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

  async saveDocument (documentId: string, document: Document, context: Context): Promise<void> {
    const {
      decodedToken: { workspace }
    } = context

    await this.ctx.with('load-document', {}, async (ctx) => {
      const buffer = await ctx.with('transform', {}, () => {
        const updates = encodeStateAsUpdate(document)
        return Buffer.from(updates.buffer)
      })

      await ctx.with('update', {}, async () => {
        const minio = new MinioClient(this.minio, workspace)
        await minio.writeFile(documentId, buffer)
      })
    })
  }
}
