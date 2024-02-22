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

import { touchCollaborativeDoc } from '@hcengineering/collaboration'
import core, { Class, CollaborativeDoc, Doc, MeasureContext, Ref } from '@hcengineering/core'
import { Transformer } from '@hocuspocus/transformer'
import { Doc as YDoc } from 'yjs'

import { Context } from '../context'

import { StorageAdapter } from './adapter'

interface PlatformDocumentId {
  workspaceUrl: string
  objectClass: Ref<Class<Doc>>
  objectId: Ref<Doc>
  objectAttr: string
}

function parseDocumentId (documentId: string): PlatformDocumentId {
  const [workspaceUrl, objectClass, objectId, objectAttr] = documentId.split('/')
  return {
    workspaceUrl: workspaceUrl ?? '',
    objectClass: (objectClass ?? '') as Ref<Class<Doc>>,
    objectId: (objectId ?? '') as Ref<Doc>,
    objectAttr: objectAttr ?? ''
  }
}

function isValidDocumentId (documentId: PlatformDocumentId, context: Context): boolean {
  return (
    documentId.objectClass !== '' && documentId.objectId !== '' && documentId.objectAttr !== '' // &&
    // documentId.workspace === context.workspaceId.name
  )
}

export class PlatformStorageAdapter implements StorageAdapter {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly transformer: Transformer
  ) {}

  async loadDocument (documentId: string, context: Context): Promise<YDoc | undefined> {
    console.warn('loading documents from the platform not supported', documentId)

    const { clientFactory } = context
    const { workspaceUrl, objectId, objectClass, objectAttr } = parseDocumentId(documentId)

    if (!isValidDocumentId({ workspaceUrl, objectId, objectClass, objectAttr }, context)) {
      console.warn('malformed document id', documentId)
      return undefined
    }

    return await this.ctx.with('load-document', {}, async (ctx) => {
      let content = ''

      const client = await ctx.with('connect', {}, async () => {
        return await clientFactory({ derived: false })
      })

      const hierarchy = client.getHierarchy()
      const attribute = hierarchy.findAttribute(objectClass, objectAttr)
      if (attribute === undefined) {
        console.warn('invalid attribute', objectAttr)
        return undefined
      }

      if (hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeMarkup)) {
        console.warn('unsupported attribute type', attribute?.type._class)
        return undefined
      }

      const doc = await ctx.with('query', {}, async () => {
        return await client.findOne(objectClass, { _id: objectId }, { projection: { [objectAttr]: 1 } })
      })
      if (doc !== undefined && objectAttr in doc) {
        content = (doc as any)[objectAttr] as string
      }

      return await ctx.with('transform', {}, () => {
        return this.transformer.toYdoc(content, objectAttr)
      })
    })
  }

  async saveDocument (documentId: string, document: YDoc, context: Context): Promise<void> {
    const { clientFactory } = context
    const { workspaceUrl, objectId, objectClass, objectAttr } = parseDocumentId(documentId)

    if (!isValidDocumentId({ workspaceUrl, objectId, objectClass, objectAttr }, context)) {
      console.warn('malformed document id', documentId)
      return undefined
    }

    await this.ctx.with('save-document', {}, async (ctx) => {
      const client = await ctx.with('connect', {}, async () => {
        return await clientFactory({ derived: false })
      })

      const attribute = client.getHierarchy().findAttribute(objectClass, objectAttr)
      if (attribute === undefined) {
        console.warn('attribute not found', objectClass, objectAttr)
        return
      }

      const current = await ctx.with('query', {}, async () => {
        return await client.findOne(objectClass, { _id: objectId })
      })

      if (current === undefined) {
        return
      }

      const hierarchy = client.getHierarchy()
      if (hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeDoc)) {
        const collaborativeDoc = (current as any)[objectAttr] as CollaborativeDoc
        const newCollaborativeDoc = touchCollaborativeDoc(collaborativeDoc)

        await ctx.with('update', {}, async () => {
          await client.diffUpdate(current, { [objectAttr]: newCollaborativeDoc })
        })
      } else if (hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeMarkup)) {
        // TODO a temporary solution while we are keeping Markup in Mongo
        const content = await ctx.with('transform', {}, () => {
          return this.transformer.fromYdoc(document, objectAttr)
        })
        await ctx.with('update', {}, async () => {
          await client.diffUpdate(current, { [objectAttr]: content })
        })
      }
    })
  }
}
