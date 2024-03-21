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

import { YDocVersion } from '@hcengineering/collaboration'
import {
  DocumentId,
  PlatformDocumentId,
  parseDocumentId,
  parsePlatformDocumentId
} from '@hcengineering/collaborator-client'
import core, {
  CollaborativeDoc,
  Doc,
  MeasureContext,
  collaborativeDocWithLastVersion,
  toWorkspaceString
} from '@hcengineering/core'
import {
  Document,
  Extension,
  afterUnloadDocumentPayload,
  onChangePayload,
  onConnectPayload,
  onDisconnectPayload,
  onLoadDocumentPayload,
  onStoreDocumentPayload
} from '@hocuspocus/server'
import { Transformer } from '@hocuspocus/transformer'
import { MongoClient } from 'mongodb'
import { Doc as YDoc } from 'yjs'
import { Context, withContext } from '../context'
import { StorageAdapter, StorageAdapters } from '../storage/adapter'

export interface StorageConfiguration {
  ctx: MeasureContext
  adapters: StorageAdapters
  mongodb: MongoClient
  transformer: Transformer
}

export class StorageExtension implements Extension {
  private readonly configuration: StorageConfiguration
  private readonly collaborators = new Map<string, Set<string>>()

  constructor (configuration: StorageConfiguration) {
    this.configuration = configuration
  }

  async onChange ({ context, documentName }: withContext<onChangePayload>): Promise<any> {
    const collaborators = this.collaborators.get(documentName) ?? new Set()
    collaborators.add(context.connectionId)
    this.collaborators.set(documentName, collaborators)
  }

  async onLoadDocument ({ context, documentName }: withContext<onLoadDocumentPayload>): Promise<any> {
    await this.configuration.ctx.info('load document', { documentName })
    return await this.configuration.ctx.with('load-document', {}, async () => {
      return await this.loadDocument(documentName as DocumentId, context)
    })
  }

  async onStoreDocument ({ context, documentName, document }: withContext<onStoreDocumentPayload>): Promise<void> {
    const { ctx } = this.configuration

    await ctx.info('store document', { documentName })

    const collaborators = this.collaborators.get(documentName)
    if (collaborators === undefined || collaborators.size === 0) {
      await ctx.info('no changes for document', { documentName })
      return
    }

    this.collaborators.delete(documentName)
    await ctx.with('store-document', {}, async () => {
      await this.storeDocument(documentName as DocumentId, document, context)
    })
  }

  async onConnect ({ context, documentName, instance }: withContext<onConnectPayload>): Promise<any> {
    const connections = instance.documents.get(documentName)?.getConnectionsCount() ?? 0
    const params = { documentName, connectionId: context.connectionId, connections }
    await this.configuration.ctx.info('connect to document', params)
  }

  async onDisconnect ({ context, documentName, document }: withContext<onDisconnectPayload>): Promise<any> {
    const { ctx } = this.configuration
    const { connectionId } = context

    const params = { documentName, connectionId, connections: document.getConnectionsCount() }
    await ctx.info('disconnect from document', params)

    const collaborators = this.collaborators.get(documentName)
    if (collaborators === undefined || !collaborators.has(connectionId)) {
      await ctx.info('no changes for document', { documentName })
      return
    }

    this.collaborators.delete(documentName)
    await ctx.with('store-document', {}, async () => {
      await this.storeDocument(documentName as DocumentId, document, context)
    })
  }

  async afterUnloadDocument ({ documentName }: afterUnloadDocumentPayload): Promise<any> {
    await this.configuration.ctx.info('unload document', { documentName })
    this.collaborators.delete(documentName)
  }

  async loadDocument (documentId: DocumentId, context: Context): Promise<YDoc | undefined> {
    const { ctx } = this.configuration

    try {
      let ydoc: YDoc | undefined

      // try to load document content
      try {
        await ctx.info('load document content', { documentId })
        ydoc = await this.loadDocumentFromStorage(documentId, context)
      } catch (err) {
        await ctx.error('failed to load document content', { documentId, error: err })
        return undefined
      }

      if (ydoc !== undefined) {
        return ydoc
      }

      // then try to load from inital content
      const { initialContentId } = context
      if (initialContentId !== undefined && initialContentId.length > 0) {
        try {
          await ctx.info('load document initial content', { documentId, initialContentId })
          ydoc = await this.loadDocumentFromStorage(initialContentId, context)

          // if document was loaded from the initial content we need to save
          // it to ensure the next time we load ydoc document
          if (ydoc !== undefined) {
            await this.saveDocumentToStorage(documentId, ydoc, context)
          }
        } catch (err) {
          await ctx.error('failed to load initial document content', { documentId, initialContentId, error: err })
          return undefined
        }
      }

      if (ydoc !== undefined) {
        return ydoc
      }

      // finally try to load from the platform
      const { platformDocumentId } = context
      if (platformDocumentId !== undefined) {
        await ctx.info('load document content from platform', { documentId, platformDocumentId })
        ydoc = await ctx.with('load-document', { storage: 'platform' }, async (ctx) => {
          try {
            return await this.loadPlatformDoc(ctx, platformDocumentId, context)
          } catch (err) {
            await ctx.error('failed to load platform document', { documentId, platformDocumentId, error: err })
            return undefined
          }
        })
      }

      return ydoc
    } catch (err) {
      await ctx.error('failed to load document', { documentId, error: err })
    }
  }

  async storeDocument (documentName: DocumentId, document: Document, context: Context): Promise<void> {
    const { ctx } = this.configuration

    const { storage, collaborativeDoc } = parseDocumentId(documentName)
    const adapter = this.getStorageAdapter(storage)

    if (adapter === undefined) {
      await ctx.error('unknown storage adapter', { documentName, storage })
      return undefined
    }

    let snapshot: YDocVersion | undefined
    try {
      await ctx.info('take document snapshot', { documentName })
      snapshot = await ctx.with('take-snapshot', {}, async () => {
        return await adapter.takeSnapshot(documentName, collaborativeDoc, document, context)
      })
    } catch (err) {
      await ctx.error('failed to take document snapshot', { documentName, error: err })
    }

    try {
      await ctx.info('save document content', { documentName })
      await ctx.with('save-document', {}, async () => {
        await adapter.saveDocument(documentName, collaborativeDoc, document, context)
      })
    } catch (err) {
      await ctx.error('failed to save document', { documentName, error: err })
    }

    const { platformDocumentId } = context
    if (platformDocumentId !== undefined) {
      await ctx.info('save document content to platform', { documentName, platformDocumentId })
      await ctx.with('save-document', { storage: 'platform' }, async (ctx) => {
        await this.savePlatformDoc(ctx, documentName, platformDocumentId, document, snapshot, context)
      })
    }
  }

  async loadDocumentFromStorage (documentId: DocumentId, context: Context): Promise<YDoc | undefined> {
    const { storage, collaborativeDoc } = parseDocumentId(documentId)
    const adapter = this.getStorageAdapter(storage)

    if (adapter !== undefined) {
      return await adapter.loadDocument(documentId, collaborativeDoc, context)
    } else {
      throw new Error(`unknown storage adapter ${storage}`)
    }
  }

  async saveDocumentToStorage (documentId: DocumentId, document: YDoc, context: Context): Promise<void> {
    const { storage, collaborativeDoc } = parseDocumentId(documentId)
    const adapter = this.getStorageAdapter(storage)

    if (adapter !== undefined) {
      await adapter.saveDocument(documentId, collaborativeDoc, document, context)
    } else {
      throw new Error(`unknown storage adapter ${storage}`)
    }
  }

  async loadPlatformDoc (
    ctx: MeasureContext,
    platformDocumentId: PlatformDocumentId,
    context: Context
  ): Promise<YDoc | undefined> {
    const { mongodb, transformer } = this.configuration
    const { workspaceId } = context
    const { objectDomain, objectId, objectAttr } = parsePlatformDocumentId(platformDocumentId)

    const doc = await ctx.with('query', {}, async () => {
      const db = mongodb.db(toWorkspaceString(workspaceId))
      return await db.collection<Doc>(objectDomain).findOne({ _id: objectId }, { projection: { [objectAttr]: 1 } })
    })

    // TODO check if content is HTML
    const content = doc !== null && objectAttr in doc ? ((doc as any)[objectAttr] as string) : ''

    return await ctx.with('transform', {}, () => {
      return transformer.toYdoc(content, objectAttr)
    })
  }

  async savePlatformDoc (
    ctx: MeasureContext,
    documentName: string,
    platformDocumentId: PlatformDocumentId,
    document: YDoc,
    snapshot: YDocVersion | undefined,
    context: Context
  ): Promise<void> {
    const { objectClass, objectId, objectAttr } = parsePlatformDocumentId(platformDocumentId)

    const { clientFactory } = context

    const client = await ctx.with('connect', {}, async () => {
      return await clientFactory({ derived: false })
    })

    const attribute = client.getHierarchy().findAttribute(objectClass, objectAttr)
    if (attribute === undefined) {
      await ctx.info('attribute not found', { documentName, objectClass, objectAttr })
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
      const newCollaborativeDoc =
        snapshot !== undefined
          ? collaborativeDocWithLastVersion(collaborativeDoc, snapshot.versionId)
          : collaborativeDoc

      await ctx.with('update', {}, async () => {
        await client.diffUpdate(current, { [objectAttr]: newCollaborativeDoc })
      })
    } else if (hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeMarkup)) {
      // TODO a temporary solution while we are keeping Markup in Mongo
      const content = await ctx.with('transform', {}, () => {
        return this.configuration.transformer.fromYdoc(document, objectAttr)
      })
      await ctx.with('update', {}, async () => {
        await client.diffUpdate(current, { [objectAttr]: content })
      })
    }
  }

  getStorageAdapter (storage: string): StorageAdapter | undefined {
    return this.configuration.adapters[storage]
  }
}
