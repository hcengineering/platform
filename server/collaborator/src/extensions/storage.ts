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

import { type Markup, MeasureContext } from '@hcengineering/core'
import {
  Document,
  Extension,
  afterLoadDocumentPayload,
  afterUnloadDocumentPayload,
  onChangePayload,
  onConnectPayload,
  onDisconnectPayload,
  onLoadDocumentPayload,
  onStoreDocumentPayload
} from '@hocuspocus/server'
import { Transformer } from '@hocuspocus/transformer'
import { Doc as YDoc } from 'yjs'
import { Context, withContext } from '../context'
import { CollabStorageAdapter } from '../storage/adapter'

export interface StorageConfiguration {
  ctx: MeasureContext
  adapter: CollabStorageAdapter
  transformer: Transformer
}

type DocumentName = string

type ConnectionId = string

interface DocumentUpdates {
  context: Context
  collaborators: Set<ConnectionId>
}

export class StorageExtension implements Extension {
  private readonly configuration: StorageConfiguration
  private readonly updates = new Map<DocumentName, DocumentUpdates>()
  private readonly markups = new Map<DocumentName, Record<Markup, Markup>>()

  constructor (configuration: StorageConfiguration) {
    this.configuration = configuration
  }

  async onChange ({ context, documentName }: withContext<onChangePayload>): Promise<any> {
    const { connectionId } = context

    const updates = this.updates.get(documentName)
    if (updates === undefined) {
      const collaborators = new Set([connectionId])
      this.updates.set(documentName, { context, collaborators })
    } else {
      updates.context = context
      updates.collaborators.add(connectionId)
    }
  }

  async onLoadDocument ({ context, documentName }: withContext<onLoadDocumentPayload>): Promise<any> {
    const { connectionId } = context

    this.configuration.ctx.info('load document', { documentName, connectionId })
    return await this.loadDocument(documentName, context)
  }

  async afterLoadDocument ({ context, documentName, document }: withContext<afterLoadDocumentPayload>): Promise<any> {
    const { ctx } = this.configuration
    const { connectionId } = context

    try {
      // remember the markup for the document
      this.markups.set(documentName, this.configuration.transformer.fromYdoc(document))
    } catch {
      ctx.warn('document is not of a markup type', { documentName, connectionId })
      this.markups.set(documentName, {})
    }
  }

  async onStoreDocument ({ context, documentName, document }: withContext<onStoreDocumentPayload>): Promise<void> {
    const { ctx } = this.configuration
    const { connectionId } = context

    ctx.info('store document', { documentName, connectionId })

    const updates = this.updates.get(documentName)
    if (updates === undefined || updates.collaborators.size === 0) {
      ctx.info('no changes for document', { documentName, connectionId })
      return
    }

    this.updates.delete(documentName)
    await this.storeDocument(documentName, document, updates.context)
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

    const updates = this.updates.get(documentName)
    if (updates === undefined || updates.collaborators.size === 0) {
      ctx.info('no changes for document', { documentName, connectionId })
      return
    }

    this.updates.delete(documentName)
    await this.storeDocument(documentName, document, context)
  }

  async afterUnloadDocument ({ documentName }: afterUnloadDocumentPayload): Promise<any> {
    this.configuration.ctx.info('unload document', { documentName })
    this.updates.delete(documentName)
    this.markups.delete(documentName)
  }

  private async loadDocument (documentName: string, context: Context): Promise<YDoc | undefined> {
    const { ctx, adapter } = this.configuration

    try {
      return await ctx.with('load-document', {}, (ctx) => {
        return adapter.loadDocument(ctx, documentName, context)
      })
    } catch (err) {
      ctx.error('failed to load document', { documentName, error: err })
      throw new Error('Failed to load document')
    }
  }

  private async storeDocument (documentName: string, document: Document, context: Context): Promise<void> {
    const { ctx, adapter } = this.configuration

    try {
      const currMarkup = await ctx.with('save-document', {}, (ctx) =>
        adapter.saveDocument(ctx, documentName, document, context, {
          prev: () => this.markups.get(documentName) ?? {},
          curr: () => this.configuration.transformer.fromYdoc(document)
        })
      )

      this.markups.set(documentName, currMarkup ?? {})
    } catch (err) {
      ctx.error('failed to save document', { documentName, error: err })
      throw new Error('Failed to save document')
    }
  }
}
