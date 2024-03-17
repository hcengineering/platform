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
import { MeasureContext } from '@hcengineering/core'
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
import { Doc as YDoc } from 'yjs'
import { Context, withContext } from '../context'
import { StorageAdapter } from '../storage/adapter'

export interface StorageConfiguration {
  ctx: MeasureContext
  adapter: StorageAdapter
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
    await this.configuration.ctx.info('load document', { documentId: documentName })
    return await this.configuration.ctx.with('load-document', {}, async () => {
      return await this.loadDocument(documentName, context)
    })
  }

  async onStoreDocument ({ context, documentName, document }: withContext<onStoreDocumentPayload>): Promise<void> {
    const { ctx } = this.configuration

    await ctx.info('store document', { documentId: documentName })

    const collaborators = this.collaborators.get(documentName)
    if (collaborators === undefined || collaborators.size === 0) {
      await ctx.info('no changes for document', { documentId: documentName })
      return
    }

    this.collaborators.delete(documentName)
    await ctx.with('store-document', {}, async () => {
      await this.storeDocument(documentName, document, context)
    })
  }

  async onConnect ({ context, documentName, instance }: withContext<onConnectPayload>): Promise<any> {
    const connections = instance.documents.get(documentName)?.getConnectionsCount() ?? 0
    const params = { documentId: documentName, connectionId: context.connectionId, connections }
    await this.configuration.ctx.info('connect to document', params)
  }

  async onDisconnect ({ context, documentName, document }: withContext<onDisconnectPayload>): Promise<any> {
    const { ctx } = this.configuration
    const { connectionId } = context

    const params = { documentId: documentName, connectionId, connections: document.getConnectionsCount() }
    await ctx.info('disconnect from document', params)

    const collaborators = this.collaborators.get(documentName)
    if (collaborators === undefined || !collaborators.has(connectionId)) {
      await ctx.info('no changes for document', { documentId: documentName })
      return
    }

    this.collaborators.delete(documentName)
    await ctx.with('store-document', {}, async () => {
      await this.storeDocument(documentName, document, context)
    })
  }

  async afterUnloadDocument ({ documentName }: afterUnloadDocumentPayload): Promise<any> {
    await this.configuration.ctx.info('unload document', { documentId: documentName })
    this.collaborators.delete(documentName)
  }

  async loadDocument (documentId: string, context: Context): Promise<YDoc | undefined> {
    const { adapter, ctx } = this.configuration

    try {
      await ctx.info('load document content', { documentId })
      const ydoc = await adapter.loadDocument(documentId, context)
      if (ydoc !== undefined) {
        return ydoc
      }
    } catch (err) {
      await ctx.error('failed to load document', { documentId, error: err })
    }

    const { initialContentId } = context
    if (initialContentId !== undefined && initialContentId.length > 0) {
      await ctx.info('load document initial content', { documentId, initialContentId })
      try {
        const ydoc = await adapter.loadDocument(initialContentId, context)

        // if document was loaded from the initial content we need to save
        // it to ensure the next time we load ydoc document
        if (ydoc !== undefined) {
          await adapter.saveDocument(documentId, ydoc, undefined, context)
        }

        return ydoc
      } catch (err) {
        await ctx.error('failed to load document initial content', {
          documentId,
          initialContentId,
          error: err
        })
      }
    }
  }

  async storeDocument (documentId: string, document: Document, context: Context): Promise<void> {
    const { adapter, ctx } = this.configuration

    let snapshot: YDocVersion | undefined
    try {
      await ctx.info('take document snapshot', { documentId })
      snapshot = await ctx.with('take-snapshot', {}, async () => {
        return await adapter.takeSnapshot(documentId, document, context)
      })
    } catch (err) {
      await ctx.error('failed to take document snapshot', { documentId, error: err })
    }

    try {
      await ctx.info('save document content', { documentId })
      await ctx.with('save-document', {}, async () => {
        await adapter.saveDocument(documentId, document, snapshot, context)
      })
    } catch (err) {
      await ctx.error('failed to save document', { documentId, error: err })
    }

    const { targetContentId } = context
    if (targetContentId !== undefined && targetContentId.length > 0) {
      await ctx.info('store document target content', { documentId, targetContentId })
      try {
        await ctx.with('save-target-document', {}, async () => {
          await adapter.saveDocument(targetContentId, document, snapshot, context)
        })
      } catch (err) {
        await ctx.error('failed to save document target content', {
          documentId,
          targetContentId,
          error: err
        })
      }
    }
  }
}
