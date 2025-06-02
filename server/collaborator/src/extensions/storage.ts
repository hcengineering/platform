//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { Analytics } from '@hcengineering/analytics'
import { type Markup, MeasureContext } from '@hcengineering/core'
import {
  Document,
  Extension,
  Hocuspocus,
  afterLoadDocumentPayload,
  afterUnloadDocumentPayload,
  onChangePayload,
  onConfigurePayload,
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
  retryIntervalMs?: number
}

type DocumentName = string

type ConnectionId = string

interface DocumentUpdates {
  context: Context
  collaborators: Map<ConnectionId, number>
}

export class StorageExtension implements Extension {
  private readonly configuration: StorageConfiguration
  private readonly updates = new Map<DocumentName, DocumentUpdates>()
  private readonly markups = new Map<DocumentName, Record<Markup, Markup>>()
  private readonly failedDocuments = new Map<DocumentName, Context>()
  private readonly retryInterval
  private instance: Hocuspocus | undefined

  constructor (configuration: StorageConfiguration) {
    this.configuration = configuration

    const retryIntervalMs = configuration.retryIntervalMs ?? 1000 * 60
    this.retryInterval = setInterval(() => {
      void this.retrySaveDocuments()
    }, retryIntervalMs)
  }

  async onDestroy (): Promise<any> {
    clearInterval(this.retryInterval)
    await this.retrySaveDocuments()
  }

  async onConfigure ({ instance }: onConfigurePayload): Promise<any> {
    this.instance = instance
  }

  async onChange ({ context, document, documentName }: withContext<onChangePayload>): Promise<any> {
    const { ctx } = this.configuration
    const { connectionId } = context

    if (document.isLoading) {
      ctx.warn('document changed while is loading', { documentName, connectionId })
      return
    }

    const updates = this.updates.get(documentName)
    if (updates === undefined) {
      const collaborators = new Map([[connectionId, Date.now()]])
      this.updates.set(documentName, { context, collaborators })
    } else {
      updates.context = context
      updates.collaborators.set(connectionId, Date.now())
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

    const updates = this.updates.get(documentName)
    const connections = document.getConnectionsCount()
    const collaborators = updates?.collaborators.size ?? 0
    ctx.info('store document', { documentName, connectionId, connections, collaborators })

    if (updates === undefined || updates.collaborators.size === 0) {
      ctx.info('no changes for document', { documentName, connectionId })
      return
    }

    const now = Date.now()

    await this.storeDocument(documentName, document, updates.context)

    // Remove collaborators that were not updated from before save
    for (const [connectionId, updatedAt] of updates.collaborators.entries()) {
      if (updatedAt < now) {
        updates.collaborators.delete(connectionId)
      }
    }
  }

  async onConnect ({ context, documentName, instance }: withContext<onConnectPayload>): Promise<any> {
    const connections = instance.documents.get(documentName)?.getConnectionsCount() ?? 0
    const params = { documentName, connectionId: context.connectionId, connections }
    this.configuration.ctx.info('connect to document', params)
  }

  async onDisconnect ({ context, documentName, document }: withContext<onDisconnectPayload>): Promise<any> {
    const { ctx } = this.configuration
    const { connectionId } = context

    const updates = this.updates.get(documentName)
    const connections = document.getConnectionsCount()
    const collaborators = updates?.collaborators.size ?? 0
    const updatedAt = updates?.collaborators.get(connectionId)
    ctx.info('disconnect from document', { documentName, connectionId, connections, collaborators, updatedAt })

    if (updates === undefined || !updates.collaborators.has(connectionId)) {
      ctx.info('no changes for document', { documentName, connectionId })
      return
    }

    if (document.isLoading) {
      ctx.warn('document is loading', { documentName, connectionId })
      return
    }

    const now = Date.now()

    await this.storeDocument(documentName, document, updates.context)

    // Remove collaborators that were not updated from before save
    for (const [connectionId, updatedAt] of updates.collaborators.entries()) {
      if (updatedAt < now) {
        updates.collaborators.delete(connectionId)
      }
    }
  }

  async afterUnloadDocument ({ documentName }: afterUnloadDocumentPayload): Promise<any> {
    this.configuration.ctx.info('unload document', { documentName })
    this.updates.delete(documentName)
    this.markups.delete(documentName)
    this.failedDocuments.delete(documentName)
  }

  private async loadDocument (documentName: string, context: Context): Promise<YDoc | undefined> {
    const { ctx, adapter } = this.configuration

    try {
      return await ctx.with('load-document', {}, (ctx) => {
        return adapter.loadDocument(ctx, documentName, context)
      })
    } catch (err: any) {
      Analytics.handleError(err)
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
    } catch (err: any) {
      this.failedDocuments.set(documentName, context)

      Analytics.handleError(err)
      ctx.error('failed to save document', { documentName, error: err })
      throw new Error(`Failed to save document ${documentName}`)
    }
  }

  private async retrySaveDocuments (): Promise<void> {
    const ctx = this.configuration.ctx

    const count = this.failedDocuments.size
    if (count === 0) {
      return
    }

    ctx.info('retry failed documents', { count })

    const hocuspocus = this.instance
    if (hocuspocus === undefined) {
      ctx.warn('instance is not set, cannot retry failed documents')
      return
    }

    const promises: Promise<void>[] = []

    for (const [documentName, context] of this.failedDocuments.entries()) {
      const document = hocuspocus.documents.get(documentName)

      if (document === undefined) {
        ctx.warn('document not found', { documentName })
        this.failedDocuments.delete(documentName)
        continue
      }

      const connections = document.getConnectionsCount()
      if (connections > 0) {
        // Someone is still connected to the document
        // We will retry later, when onStoreDocument or onDisconnect hook is called
        ctx.info('document is connected, skipping', { documentName, connections })
        this.failedDocuments.delete(documentName)
        continue
      }

      promises.push(
        ctx.with('retry-failed-document', {}, async (ctx) => {
          try {
            await this.storeDocument(documentName, document, context)
            this.failedDocuments.delete(documentName)
            if (document.getConnectionsCount() === 0) {
              await hocuspocus.unloadDocument(document)
            }
            ctx.info('successfully retried save document', { documentName })
          } catch (err: any) {
            ctx.error('failed to retry save document', { documentName, error: err })
          }
        })
      )
    }

    await ctx.with('retry-failed', {}, async () => {
      await Promise.all(promises)
    })
  }
}
