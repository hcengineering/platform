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

import { MeasureContext, toWorkspaceString } from '@hcengineering/core'
import { Document } from '@hocuspocus/server'
import { Transformer } from '@hocuspocus/transformer'
import { MongoClient } from 'mongodb'
import { Doc as YDoc } from 'yjs'

import { Context } from '../context'

import { StorageAdapter } from './adapter'

interface MongodbDocumentId {
  objectDomain: string
  objectId: string
  objectAttr: string
}

function parseDocumentId (documentId: string): MongodbDocumentId {
  const [objectDomain, objectId, objectAttr] = documentId.split('/')
  return {
    objectId: objectId ?? '',
    objectDomain: objectDomain ?? '',
    objectAttr: objectAttr ?? ''
  }
}

function isValidDocumentId (documentId: MongodbDocumentId): boolean {
  return documentId.objectDomain !== '' && documentId.objectId !== '' && documentId.objectAttr !== ''
}

export class MongodbStorageAdapter implements StorageAdapter {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly mongodb: MongoClient,
    private readonly transformer: Transformer
  ) {}

  async loadDocument (documentId: string, context: Context): Promise<YDoc | undefined> {
    const { decodedToken } = context
    const { objectId, objectDomain, objectAttr } = parseDocumentId(documentId)

    if (!isValidDocumentId({ objectId, objectDomain, objectAttr })) {
      console.warn('malformed document id', documentId)
      return undefined
    }

    return await this.ctx.with('load-document', {}, async (ctx) => {
      const doc = await ctx.with('query', {}, async () => {
        const db = this.mongodb.db(toWorkspaceString(decodedToken.workspace))
        return await db.collection(objectDomain).findOne({ _id: objectId }, { projection: { [objectAttr]: 1 } })
      })

      const content = doc !== null && objectAttr in doc ? (doc[objectAttr] as string) : ''

      return await ctx.with('transform', {}, () => {
        return this.transformer.toYdoc(content, objectAttr)
      })
    })
  }

  async saveDocument (_documentId: string, _document: Document, _context: Context): Promise<void> {
    // do nothing, not supported
  }
}
