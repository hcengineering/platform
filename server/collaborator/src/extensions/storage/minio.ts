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
import { Token } from '@hcengineering/server-token'
import { Extension, onLoadDocumentPayload, onStoreDocumentPayload } from '@hocuspocus/server'
import { Doc as YDoc, applyUpdate, encodeStateAsUpdate } from 'yjs'
import { withContext } from '../../context'
import { connect, getTxOperations } from '../../platform'

export interface MinioStorageConfiguration {
  ctx: MeasureContext
  minio: MinioService
  transactorUrl: string
}

export class MinioStorageExtension implements Extension {
  private readonly configuration: MinioStorageConfiguration

  constructor (configuration: MinioStorageConfiguration) {
    this.configuration = configuration
  }

  async getMinioDocument (documentId: string, token: Token): Promise<Buffer | undefined> {
    const buffer = await this.configuration.minio.read(token.workspace, documentId)
    return Buffer.concat(buffer)
  }

  async onLoadDocument (data: withContext<onLoadDocumentPayload>): Promise<any> {
    const { token, initialContentId } = data.context

    const documentId = data.documentName
    console.log('load document from minio', documentId)

    const ydoc = new YDoc()

    await this.configuration.ctx.with('load-document', {}, async (ctx) => {
      let minioDocument: Buffer | undefined

      await ctx.with('minio', {}, async () => {
        try {
          minioDocument = await this.getMinioDocument(documentId, token)
        } catch (err: any) {
          if (initialContentId !== undefined && initialContentId.length > 0) {
            try {
              minioDocument = await this.getMinioDocument(initialContentId, token)
            } catch (err: any) {
              // Do nothing
              // Initial content document also might not have been initialized in minio (e.g. if it's an empty template)
            }
          }
        }
      })

      if (minioDocument !== undefined && minioDocument.length > 0) {
        ctx.measure('size', minioDocument.byteLength)
        try {
          const uint8arr = new Uint8Array(minioDocument)
          await ctx.with('apply-update', {}, () => {
            applyUpdate(ydoc, uint8arr)
          })
        } catch (err) {
          console.error(err)
        }
      }
    })

    return ydoc
  }

  async onStoreDocument (data: withContext<onStoreDocumentPayload>): Promise<void> {
    const { token } = data.context

    const documentId = data.documentName
    console.log('store document to minio', documentId)

    await this.configuration.ctx.with('store-document', {}, async (ctx) => {
      const updates = encodeStateAsUpdate(data.document)
      const buffer = Buffer.from(updates.buffer)

      // persist document to Minio
      ctx.measure('size', buffer.byteLength)
      await ctx.with('minio', {}, async () => {
        const metaData = { 'content-type': 'application/ydoc' }
        await this.configuration.minio.put(token.workspace, documentId, buffer, buffer.length, metaData)
      })

      // notify platform about changes
      await ctx.with('platform', {}, async () => {
        try {
          const connection = await ctx.with('connect', {}, async () => {
            return await connect(this.configuration.transactorUrl, token)
          })

          const current = await ctx.with('query', {}, async () => {
            return await connection.findOne(attachment.class.Attachment, { _id: documentId as Ref<Attachment> })
          })

          if (current !== undefined) {
            console.log('platform notification for document', documentId)

            // token belongs to the first user opened the document, this is not accurate, but
            // since the document is collaborative, we need to choose some account to update the doc
            await ctx.with('update', {}, async () => {
              const client = await getTxOperations(connection, token, true)
              await client.update(current, { lastModified: Date.now(), size: buffer.length })
            })
          } else {
            console.log('platform attachment document not found', documentId)
          }

          await connection.close()
        } catch (err: any) {
          console.debug('failed to notify platform', documentId, err)
        }
      })
    })
  }
}
