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

import { Class, Doc, MeasureContext, Ref, toWorkspaceString } from '@hcengineering/core'
import { Document, Extension, onDisconnectPayload, onLoadDocumentPayload, onStoreDocumentPayload } from '@hocuspocus/server'
import { Transformer } from '@hocuspocus/transformer'
import { MongoClient } from 'mongodb'
import { Doc as YDoc } from 'yjs'
import { Context, withContext } from '../../context'
import { connect, getTxOperations } from '../../platform'

interface DocumentId {
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>
  objectDomain: string
  objectAttr: string
}

function parseDocumentName (documentName: string): DocumentId {
  const [objectDomain, objectClass, objectId, objectAttr] = documentName.split('/')
  return {
    objectId: (objectId ?? '') as Ref<Doc>,
    objectClass: (objectClass ?? '') as Ref<Class<Doc>>,
    objectDomain: objectDomain ?? '',
    objectAttr: objectAttr ?? ''
  }
}

export interface PlatformStorageConfiguration {
  ctx: MeasureContext
  mongoClient: MongoClient
  transformer: Transformer
  transactorUrl: string
}

export class PlatformStorageExtension implements Extension {
  private readonly configuration: PlatformStorageConfiguration

  constructor (configuration: PlatformStorageConfiguration) {
    this.configuration = configuration
  }

  async onLoadDocument (data: withContext<onLoadDocumentPayload>): Promise<any> {
    return await this.configuration.ctx.with('load-document', {}, async (ctx) => {
      return await this.loadDocument(ctx, data.context, data.documentName)
    })
  }

  async onDisconnect (data: withContext<onDisconnectPayload>): Promise<any> {
    await this.configuration.ctx.with('store-document', {}, async (ctx) => {
      await this.storeDocument(
        ctx,
        data.context,
        data.documentName,
        data.document
      )
    })
  }

  async onStoreDocument (data: withContext<onStoreDocumentPayload>): Promise<void> {
    await this.configuration.ctx.with('store-document', {}, async (ctx) => {
      await this.storeDocument(
        ctx,
        data.context,
        data.documentName,
        data.document
      )
    })
  }

  async loadDocument (ctx: MeasureContext, context: Context, documentId: string): Promise<YDoc | undefined> {
    const { token } = context
    const { objectId, objectClass, objectDomain, objectAttr } = parseDocumentName(documentId)

    console.log('load document from platform', documentId)

    if (objectId === '' || objectClass === '' || objectAttr === '') {
      console.warn('malformed document id', documentId)
      return undefined
    }

    let content = ''

    await ctx.with('query', {}, async () => {
      const db = this.configuration.mongoClient.db(toWorkspaceString(token.workspace))
      const doc = await db.collection(objectDomain).findOne({ _id: objectId }, { projection: { [objectAttr]: 1 } })
      if (doc !== null && objectAttr in doc) {
        content = doc[objectAttr] as string
      }
    })

    return await this.configuration.ctx.with('transform', {}, () => {
      return this.configuration.transformer.toYdoc(content, objectAttr)
    })
  }

  async storeDocument (ctx: MeasureContext, context: Context, documentId: string, document: Document): Promise<void> {
    const { token } = context
    const { objectId, objectClass, objectAttr } = parseDocumentName(documentId)

    console.log('store document to platform', documentId)

    if (objectId === '' || objectClass === '' || objectAttr === '') {
      console.warn('malformed document id', documentId)
      return undefined
    }

    const content = await ctx.with('transform', {}, () => {
      return this.configuration.transformer.fromYdoc(document, objectAttr)
    })

    try {
      const connection = await ctx.with('connect', {}, async () => {
        return await connect(this.configuration.transactorUrl, token)
      })

      // token belongs to the first user opened the document, this is not accurate, but
      // since the document is collaborative, we need to choose some account to update the doc
      const client = await getTxOperations(connection, token)

      // TODO push save changes only if there were any modifications
      const current = await ctx.with('query', {}, async () => {
        return await client.findOne(objectClass, { _id: objectId })
      })
      if (current !== undefined) {
        if ((current as any)[objectAttr] !== content) {
          await ctx.with('update', {}, async () => {
            await client.update(current, { [objectAttr]: content })
          })
        }
      } else {
        console.warn('platform document not found', documentId)
      }

      await connection.close()
    } catch (err: any) {
      console.debug('failed to store document to platform', documentId, err)
    }
  }
}
