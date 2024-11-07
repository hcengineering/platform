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

import activity, { DocUpdateMessage } from '@hcengineering/activity'
import { loadCollaborativeDoc, saveCollaborativeDoc } from '@hcengineering/collaboration'
import {
  DocumentId,
  PlatformDocumentId,
  parseDocumentId,
  parsePlatformDocumentId
} from '@hcengineering/collaborator-client'
import core, {
  AttachedData,
  CollaborativeDoc,
  MeasureContext,
  TxOperations,
  collaborativeDocWithLastVersion
} from '@hcengineering/core'
import { StorageAdapter } from '@hcengineering/server-core'
import { Doc as YDoc } from 'yjs'

import { Context } from '../context'

import { CollabStorageAdapter } from './adapter'
import { areEqualMarkups } from '@hcengineering/text'

export class PlatformStorageAdapter implements CollabStorageAdapter {
  constructor (private readonly storage: StorageAdapter) {}

  async loadDocument (ctx: MeasureContext, documentId: DocumentId, context: Context): Promise<YDoc | undefined> {
    // try to load document content
    try {
      ctx.info('load document content', { documentId })
      const ydoc = await this.loadDocumentFromStorage(ctx, documentId, context)

      if (ydoc !== undefined) {
        return ydoc
      }
    } catch (err) {
      ctx.error('failed to load document content', { documentId, error: err })
      throw err
    }

    // then try to load from inital content
    const { initialContentId } = context
    if (initialContentId !== undefined && initialContentId.length > 0) {
      try {
        ctx.info('load document initial content', { documentId, initialContentId })
        const ydoc = await this.loadDocumentFromStorage(ctx, initialContentId, context)

        // if document was loaded from the initial content or storage we need to save
        // it to ensure the next time we load it from the ydoc document
        if (ydoc !== undefined) {
          ctx.info('save document content', { documentId, initialContentId })
          await this.saveDocumentToStorage(ctx, documentId, ydoc, context)
          return ydoc
        }
      } catch (err) {
        ctx.error('failed to load initial document content', { documentId, initialContentId, error: err })
        throw err
      }
    }

    // nothing found
    return undefined
  }

  async saveDocument (
    ctx: MeasureContext,
    documentId: DocumentId,
    document: YDoc,
    context: Context,
    markup: {
      prev: Record<string, string>
      curr: Record<string, string>
    }
  ): Promise<void> {
    const { clientFactory } = context

    const client = await ctx.with('connect', {}, async () => {
      return await clientFactory()
    })

    try {
      try {
        ctx.info('save document content', { documentId })
        await this.saveDocumentToStorage(ctx, documentId, document, context)
      } catch (err) {
        ctx.error('failed to save document', { documentId, error: err })
        // raise an error if failed to save document to storage
        // this will prevent document from being unloaded from memory
        throw err
      }

      const { platformDocumentId } = context
      if (platformDocumentId !== undefined) {
        ctx.info('save document content to platform', { documentId, platformDocumentId })
        await ctx.with('save-to-platform', {}, async (ctx) => {
          await this.saveDocumentToPlatform(ctx, client, documentId, platformDocumentId, markup)
        })
      }
    } finally {
      await client.close()
    }
  }

  async loadDocumentFromStorage (
    ctx: MeasureContext,
    documentId: DocumentId,
    context: Context
  ): Promise<YDoc | undefined> {
    const { collaborativeDoc } = parseDocumentId(documentId)

    return await ctx.with('load-document', {}, async (ctx) => {
      return await withRetry(ctx, 5, async () => {
        return await loadCollaborativeDoc(ctx, this.storage, context.workspaceId, collaborativeDoc)
      })
    })
  }

  async saveDocumentToStorage (
    ctx: MeasureContext,
    documentId: DocumentId,
    document: YDoc,
    context: Context
  ): Promise<void> {
    const { collaborativeDoc } = parseDocumentId(documentId)

    await ctx.with('save-document', {}, async (ctx) => {
      await withRetry(ctx, 5, async () => {
        await saveCollaborativeDoc(ctx, this.storage, context.workspaceId, collaborativeDoc, document)
      })
    })
  }

  async saveDocumentToPlatform (
    ctx: MeasureContext,
    client: Omit<TxOperations, 'close'>,
    documentName: string,
    platformDocumentId: PlatformDocumentId,
    markup: {
      prev: Record<string, string>
      curr: Record<string, string>
    }
  ): Promise<void> {
    const { objectClass, objectId, objectAttr } = parsePlatformDocumentId(platformDocumentId)

    const currMarkup = markup.curr[objectAttr]
    const prevMarkup = markup.prev[objectAttr]

    if (areEqualMarkups(currMarkup, prevMarkup)) {
      ctx.info('markup not changed, skip platform update', { documentName })
      return
    }

    const attribute = client.getHierarchy().findAttribute(objectClass, objectAttr)
    if (attribute === undefined) {
      ctx.warn('attribute not found', { documentName, objectClass, objectAttr })
      return
    }

    const current = await ctx.with('query', {}, async () => {
      return await client.findOne(objectClass, { _id: objectId })
    })

    if (current === undefined) {
      ctx.warn('document not found', { documentName, objectClass, objectId })
      return
    }

    const hierarchy = client.getHierarchy()
    if (!hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeDoc)) {
      ctx.warn('unsupported attribute type', { documentName, objectClass, objectAttr })
      return
    }

    const collaborativeDoc = (current as any)[objectAttr] as CollaborativeDoc
    const newCollaborativeDoc = collaborativeDocWithLastVersion(collaborativeDoc, `${Date.now()}`)

    await ctx.with('update', {}, async () => {
      await client.diffUpdate(current, { [objectAttr]: newCollaborativeDoc })
    })

    await ctx.with('activity', {}, async () => {
      const data: AttachedData<DocUpdateMessage> = {
        objectId,
        objectClass,
        action: 'update',
        attributeUpdates: {
          attrKey: objectAttr,
          attrClass: core.class.TypeMarkup,
          prevValue: prevMarkup,
          set: [currMarkup],
          added: [],
          removed: [],
          isMixin: hierarchy.isMixin(objectClass)
        }
      }
      await client.addCollection(
        activity.class.DocUpdateMessage,
        current.space,
        current._id,
        current._class,
        'docUpdateMessages',
        data
      )
    })
  }
}

async function withRetry<T> (
  ctx: MeasureContext,
  retries: number,
  op: () => Promise<T>,
  delay: number = 100
): Promise<T> {
  let error: any
  while (retries > 0) {
    retries--
    try {
      return await op()
    } catch (err: any) {
      error = err
      ctx.error('error', { err })
      if (retries !== 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw error
}
