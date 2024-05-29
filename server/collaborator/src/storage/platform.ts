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
  saveCollaborativeDoc,
  takeCollaborativeDocSnapshot
} from '@hcengineering/collaboration'
import {
  DocumentId,
  PlatformDocumentId,
  parseDocumentId,
  parsePlatformDocumentId
} from '@hcengineering/collaborator-client'
import core, {
  CollaborativeDoc,
  MeasureContext,
  TxOperations,
  collaborativeDocWithLastVersion
} from '@hcengineering/core'
import { StorageAdapter } from '@hcengineering/server-core'
import { Transformer } from '@hocuspocus/transformer'
import { Doc as YDoc } from 'yjs'
import { Context } from '../context'

import { CollabStorageAdapter } from './adapter'

export type StorageAdapters = Record<string, StorageAdapter>

export class PlatformStorageAdapter implements CollabStorageAdapter {
  constructor (
    private readonly adapters: StorageAdapters,
    private readonly transformer: Transformer
  ) {}

  async loadDocument (ctx: MeasureContext, documentId: DocumentId, context: Context): Promise<YDoc | undefined> {
    try {
      // try to load document content
      try {
        ctx.info('load document content', { documentId })
        const ydoc = await this.loadDocumentFromStorage(ctx, documentId, context)

        if (ydoc !== undefined) {
          return ydoc
        }
      } catch (err) {
        ctx.error('failed to load document content', { documentId, error: err })
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
        }
      }

      // nothing found
      return undefined
    } catch (err) {
      ctx.error('failed to load document', { documentId, error: err })
    }
  }

  async saveDocument (ctx: MeasureContext, documentId: DocumentId, document: YDoc, context: Context): Promise<void> {
    // TODO even though there were changes, the document content could be the same
    // for example, when user added several words and then removed them

    let snapshot: YDocVersion | undefined

    try {
      ctx.info('save document content', { documentId })
      await this.saveDocumentToStorage(ctx, documentId, document, context)
    } catch (err) {
      ctx.error('failed to save document', { documentId, error: err })
    }

    const { clientFactory, platformDocumentId } = context
    if (platformDocumentId !== undefined) {
      const client = await ctx.with('connect', {}, async () => {
        return await clientFactory()
      })

      try {
        try {
          ctx.info('take document snapshot', { documentId })
          snapshot = await this.takeSnapshot(ctx, client, documentId, document, context)
        } catch (err) {
          ctx.error('failed to take document snapshot', { documentId, error: err })
        }

        ctx.info('save document content to platform', { documentId, platformDocumentId })
        await ctx.with('save-to-platform', {}, async (ctx) => {
          await this.saveDocumentToPlatform(ctx, client, documentId, platformDocumentId, snapshot)
        })
      } finally {
        await client.close()
      }
    }
  }

  getStorageAdapter (storage: string): StorageAdapter {
    const adapter = this.adapters[storage]

    if (adapter === undefined) {
      throw new Error(`unknown storage adapter ${storage}`)
    }

    return adapter
  }

  async loadDocumentFromStorage (
    ctx: MeasureContext,
    documentId: DocumentId,
    context: Context
  ): Promise<YDoc | undefined> {
    const { storage, collaborativeDoc } = parseDocumentId(documentId)
    const adapter = this.getStorageAdapter(storage)

    return await ctx.with('load-document', { storage }, async (ctx) => {
      try {
        return await loadCollaborativeDoc(adapter, context.workspaceId, collaborativeDoc, ctx)
      } catch (err) {
        ctx.error('failed to load storage document', { documentId, collaborativeDoc, error: err })
        return undefined
      }
    })
  }

  async saveDocumentToStorage (
    ctx: MeasureContext,
    documentId: DocumentId,
    document: YDoc,
    context: Context
  ): Promise<void> {
    const { storage, collaborativeDoc } = parseDocumentId(documentId)
    const adapter = this.getStorageAdapter(storage)

    await ctx.with('save-document', {}, async (ctx) => {
      await saveCollaborativeDoc(adapter, context.workspaceId, collaborativeDoc, document, ctx)
    })
  }

  async takeSnapshot (
    ctx: MeasureContext,
    client: Omit<TxOperations, 'close'>,
    documentId: DocumentId,
    document: YDoc,
    context: Context
  ): Promise<YDocVersion | undefined> {
    const { storage, collaborativeDoc } = parseDocumentId(documentId)
    const adapter = this.getStorageAdapter(storage)

    const { workspaceId } = context

    const timestamp = Date.now()

    const yDocVersion: YDocVersion = {
      versionId: `${timestamp}`,
      name: 'Automatic snapshot',
      createdBy: client.user,
      createdOn: timestamp
    }

    await ctx.with('take-snapshot', {}, async (ctx) => {
      await takeCollaborativeDocSnapshot(adapter, workspaceId, collaborativeDoc, document, yDocVersion, ctx)
    })

    return yDocVersion
  }

  async saveDocumentToPlatform (
    ctx: MeasureContext,
    client: Omit<TxOperations, 'close'>,
    documentName: string,
    platformDocumentId: PlatformDocumentId,
    snapshot: YDocVersion | undefined
  ): Promise<void> {
    const { objectClass, objectId, objectAttr } = parsePlatformDocumentId(platformDocumentId)

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
    if (hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeDoc)) {
      const collaborativeDoc = (current as any)[objectAttr] as CollaborativeDoc
      const newCollaborativeDoc =
        snapshot !== undefined
          ? collaborativeDocWithLastVersion(collaborativeDoc, snapshot.versionId)
          : collaborativeDoc

      await ctx.with('update', {}, async () => {
        await client.diffUpdate(current, { [objectAttr]: newCollaborativeDoc })
      })
    } else {
      ctx.error('unsupported attribute type', { documentName, objectClass, objectAttr })
    }
  }
}
