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
import { Document } from '@hocuspocus/server'
import { Transformer } from '@hocuspocus/transformer'
import { Doc as YDoc } from 'yjs'

import { Context } from '../context'
import { connect, getTxOperations } from '../platform'

import { StorageAdapter } from './adapter'

interface PlatformDocumentId {
  objectClass: Ref<Class<Doc>>
  objectId: Ref<Doc>
  objectAttr: string
}

function parseDocumentId (documentId: string): PlatformDocumentId {
  const [objectClass, objectId, objectAttr] = documentId.split('/')
  return {
    objectClass: (objectClass ?? '') as Ref<Class<Doc>>,
    objectId: (objectId ?? '') as Ref<Doc>,
    objectAttr: objectAttr ?? ''
  }
}

function isValidDocumentId (documentId: PlatformDocumentId): boolean {
  return documentId.objectClass !== '' && documentId.objectId !== '' && documentId.objectAttr !== ''
}

export class PlatformStorageAdapter implements StorageAdapter {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly transactorUrl: string,
    private readonly transformer: Transformer
  ) {}

  async loadDocument (documentId: string, context: Context): Promise<YDoc | undefined> {
    const { token } = context
    const { objectId, objectClass, objectAttr } = parseDocumentId(documentId)

    if (!isValidDocumentId({ objectId, objectClass, objectAttr })) {
      console.warn('malformed document id', documentId)
      return undefined
    }

    return await this.ctx.with('load-document', {}, async (ctx) => {
      let content = ''

      const client = await ctx.with('connect', {}, async () => {
        return await connect(this.transactorUrl, token)
      })

      try {
        const doc = await ctx.with('query', {}, async () => {
          return await client.findOne(objectClass, { _id: objectId }, { projection: { [objectAttr]: 1 } })
        })
        if (doc !== undefined && objectAttr in doc) {
          content = (doc as any)[objectAttr] as string
        }
      } finally {
        await client.close()
      }

      return await ctx.with('transform', {}, () => {
        return this.transformer.toYdoc(content, objectAttr)
      })
    })
  }

  async saveDocument (documentId: string, document: Document, context: Context): Promise<void> {
    const { decodedToken, token } = context
    const { objectId, objectClass, objectAttr } = parseDocumentId(documentId)

    if (!isValidDocumentId({ objectId, objectClass, objectAttr })) {
      console.warn('malformed document id', documentId)
      return undefined
    }

    await this.ctx.with('save-document', {}, async (ctx) => {
      const connection = await ctx.with('connect', {}, async () => {
        return await connect(this.transactorUrl, token)
      })
      const client = await getTxOperations(connection, decodedToken)

      try {
        const current = await ctx.with('query', {}, async () => {
          return await client.findOne(objectClass, { _id: objectId })
        })

        if (current !== undefined) {
          const content = await ctx.with('transform', {}, () => {
            return this.transformer.fromYdoc(document, objectAttr)
          })
          await ctx.with('update', {}, async () => {
            if ((current as any)[objectAttr] !== content) {
              await client.update(current, { [objectAttr]: content })
            }
          })
        }
      } finally {
        await connection.close()
      }
    })
  }
}
