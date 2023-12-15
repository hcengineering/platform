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

import { Class, Doc, MeasureContext, Ref } from '@hcengineering/core'
import { Document, Extension, onDisconnectPayload, onLoadDocumentPayload, onStoreDocumentPayload } from '@hocuspocus/server'
import { Transformer } from '@hocuspocus/transformer'
import { Doc as YDoc } from 'yjs'
import { Context, withContext } from '../../context'
import { connect, getTxOperations } from '../../platform'

function parseDocumentName (documentName: string): { objectId: Ref<Doc>, objectClass: Ref<Class<Doc>>, objectAttr: string } {
  const [objectClass, objectId, objectAttr] = documentName.split('/')
  return {
    objectClass: (objectClass ?? '') as Ref<Class<Doc>>,
    objectId: (objectId ?? '') as Ref<Doc>,
    objectAttr: objectAttr ?? ''
  }
}

export interface PlatformStorageConfiguration {
  ctx: MeasureContext
  transformer: Transformer
  transactorUrl: string
}

export class PlatformStorageExtension implements Extension {
  private readonly configuration: PlatformStorageConfiguration

  constructor (configuration: PlatformStorageConfiguration) {
    this.configuration = configuration
  }

  async onLoadDocument (data: withContext<onLoadDocumentPayload>): Promise<any> {
    return await this.loadDocument(data.context, data.documentName)
  }

  async onDisconnect (data: withContext<onDisconnectPayload>): Promise<any> {
    await this.storeDocument(
      data.context,
      data.documentName,
      data.document
    )
  }

  async onStoreDocument (data: withContext<onStoreDocumentPayload>): Promise<void> {
    await this.storeDocument(
      data.context,
      data.documentName,
      data.document
    )
  }

  async loadDocument (context: Context, documentId: string): Promise<YDoc | undefined> {
    const { token } = context
    const { objectId, objectClass, objectAttr } = parseDocumentName(documentId)

    console.log('load document from platform', documentId)

    if (objectId === '' || objectClass === '' || objectAttr === '') {
      console.warn('malformed document id', documentId)
      return undefined
    }

    let content = ''

    await this.configuration.ctx.with('load-document', {}, async () => {
      const client = await connect(this.configuration.transactorUrl, token)

      try {
        const doc = await client.findOne(objectClass, { _id: objectId })
        if (doc !== undefined && objectAttr in doc) {
          content = (doc as any)[objectAttr] as string
        }
      } finally {
        await client.close()
      }
    })

    return this.configuration.transformer.toYdoc(content, objectAttr)
  }

  async storeDocument (context: Context, documentId: string, document: Document): Promise<void> {
    const { token } = context
    const { objectId, objectClass, objectAttr } = parseDocumentName(documentId)

    console.log('store document to platform', documentId)

    if (objectId === '' || objectClass === '' || objectAttr === '') {
      console.warn('malformed document id', documentId)
      return undefined
    }

    await this.configuration.ctx.with('store-document', {}, async () => {
      const content = this.configuration.transformer.fromYdoc(document, objectAttr)

      try {
        const connection = await connect(this.configuration.transactorUrl, token)

        // token belongs to the first user opened the document, this is not accurate, but
        // since the document is collaborative, we need to choose some account to update the doc
        const client = await getTxOperations(connection, token)

        // TODO push save changes only if there were any modifications
        const doc = await client.findOne(objectClass, { _id: objectId })
        if (doc !== undefined) {
          if ((doc as any)[objectAttr] !== content) {
            await client.update(doc, { [objectAttr]: content })
          }
        } else {
          console.warn('platform document not found', documentId)
        }

        await connection.close()
      } catch (err: any) {
        console.debug('failed to store document to platform', documentId, err)
      }
    })
  }
}
