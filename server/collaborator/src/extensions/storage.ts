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

import { DocumentId } from '@hcengineering/collaborator-client'
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
import { CollabStorageAdapter } from '../storage/adapter'

export interface StorageConfiguration {
  ctx: MeasureContext
  adapter: CollabStorageAdapter
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
    const { connectionId } = context

    this.configuration.ctx.info('load document', { documentName, connectionId })
    return await this.loadDocument(documentName as DocumentId, context)
  }

  async onStoreDocument ({ context, documentName, document }: withContext<onStoreDocumentPayload>): Promise<void> {
    const { ctx } = this.configuration
    const { connectionId } = context

    ctx.info('store document', { documentName, connectionId })

    const collaborators = this.collaborators.get(documentName)
    if (collaborators === undefined || collaborators.size === 0) {
      ctx.info('no changes for document', { documentName, connectionId })
      return
    }

    this.collaborators.delete(documentName)
    await this.storeDocument(documentName as DocumentId, document, context)
  }

  async onConnect ({ context, documentName, instance }: withContext<onConnectPayload>): Promise<any> {
    const connections = instance.documents.get(documentName)?.getConnectionsCount() ?? 0
    const params = { documentName, connectionId: context.connectionId, connections }
    this.configuration.ctx.info('connect to document', params)
  }

  async onDisconnect ({ context, documentName, document }: withContext<onDisconnectPayload>): Promise<any> {
    const { ctx } = this.configuration
    const { connectionId } = context

    const params = { documentName, connectionId, connections: document.getConnectionsCount() }
    ctx.info('disconnect from document', params)

    const collaborators = this.collaborators.get(documentName)
    if (collaborators === undefined || !collaborators.has(connectionId)) {
      ctx.info('no changes for document', { documentName, connectionId })
      return
    }

    this.collaborators.delete(documentName)
    await this.storeDocument(documentName as DocumentId, document, context)
  }

  async afterUnloadDocument ({ documentName }: afterUnloadDocumentPayload): Promise<any> {
    this.configuration.ctx.info('unload document', { documentName })
    this.collaborators.delete(documentName)
  }

  async loadDocument (documentId: DocumentId, context: Context): Promise<YDoc | undefined> {
    const { ctx, adapter } = this.configuration

    try {
      return await ctx.with('load-document', {}, async (ctx) => {
        return await adapter.loadDocument(ctx, documentId, context)
      })
    } catch (err) {
      ctx.error('failed to load document', { documentId, error: err })
      throw new Error('Failed to load document')
    }
  }

  async storeDocument (documentId: DocumentId, document: Document, context: Context): Promise<void> {
    const { ctx, adapter } = this.configuration

    try {
      await ctx.with('save-document', {}, async (ctx) => {
        await adapter.saveDocument(ctx, documentId, document, context)
      })
    } catch (err) {
      ctx.error('failed to save document', { documentId, error: err })
      throw new Error('Failed to save document')
    }
  }
}
