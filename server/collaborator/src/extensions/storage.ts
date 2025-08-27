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
  saveRetryInterval?: number
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
  private readonly promises = new Map<DocumentName, Promise<void>>()

  private readonly saveRetryInterval: number
  private stopped = false

  constructor (configuration: StorageConfiguration) {
    this.configuration = configuration
    this.saveRetryInterval = configuration.saveRetryInterval ?? 1000
  }

  async onDestroy (): Promise<any> {
    this.stopped = true
    const documents = Array.from(this.promises.keys())
    const promises = Array.from(this.promises.values())

    if (promises.length > 0) {
      const { ctx } = this.configuration
      try {
        ctx.info('waiting for pending document saves', { documents, count: promises.length })
        await Promise.all(promises)
      } catch (error) {
        ctx.error('error while waiting for pending document saves', { documents, error })
      }
    }
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

    const connections = document.getConnectionsCount()
    ctx.info('store document', { documentName, connectionId, connections })

    if (this.hasNoUpdates(documentName)) {
      ctx.info('no changes for document', { documentName, connectionId })
      return
    }

    await this.storeDocument(documentName, document, context)
  }

  async onConnect ({ context, documentName, instance }: withContext<onConnectPayload>): Promise<any> {
    const connections = instance.documents.get(documentName)?.getConnectionsCount() ?? 0
    const params = { documentName, connectionId: context.connectionId, connections }
    this.configuration.ctx.info('connect to document', params)
  }

  async onDisconnect ({ context, documentName, document }: withContext<onDisconnectPayload>): Promise<any> {
    const { ctx } = this.configuration
    const { connectionId } = context

    const connections = document.getConnectionsCount()
    ctx.info('disconnect from document', { documentName, connectionId, connections })

    const noUpdates = this.hasNoUpdates(documentName, connectionId)
    if (noUpdates) {
      ctx.info('no changes for document', { documentName, connectionId })
      return
    }

    if (document.isLoading) {
      ctx.warn('document is loading', { documentName, connectionId })
      return
    }

    await this.storeDocument(documentName, document, context, connectionId)
  }

  async afterUnloadDocument ({ documentName }: afterUnloadDocumentPayload): Promise<any> {
    this.configuration.ctx.info('unload document', { documentName })
    this.updates.delete(documentName)
    this.markups.delete(documentName)
    this.promises.delete(documentName)
  }

  private async loadDocument (documentName: string, context: Context): Promise<YDoc | undefined> {
    const { ctx, adapter } = this.configuration

    try {
      return await ctx.with(
        'load-document',
        {},
        (ctx) => {
          return adapter.loadDocument(ctx, documentName, context)
        },
        {
          workspace: context.wsIds.uuid,
          documentName
        }
      )
    } catch (err: any) {
      Analytics.handleError(err)
      ctx.error('failed to load document', { documentName, error: err })
      throw new Error('Failed to load document')
    }
  }

  private async storeDocument (
    documentName: string,
    document: Document,
    context: Context,
    connectionId?: string
  ): Promise<void> {
    const prev = this.promises.get(documentName)

    const curr = async (): Promise<void> => {
      if (prev !== undefined) {
        await prev
      }

      // Check whether we still have changes after the previous save
      const noUpdates = this.hasNoUpdates(documentName, connectionId)
      if (!noUpdates) {
        await this.performStoreDocument(documentName, document, context)
      }
    }

    const promise = curr()
    this.promises.set(documentName, promise)

    try {
      await promise
    } finally {
      if (this.promises.get(documentName) === promise) {
        this.promises.delete(documentName)
      }
    }
  }

  private async performStoreDocument (documentName: string, document: Document, context: Context): Promise<void> {
    const { ctx, adapter } = this.configuration

    let attempt = 0
    while (true) {
      attempt++
      const now = Date.now()

      try {
        const currMarkup = await ctx.with(
          'save-document',
          {},
          (ctx) =>
            adapter.saveDocument(ctx, documentName, document, context, {
              prev: () => this.markups.get(documentName) ?? {},
              curr: () => this.configuration.transformer.fromYdoc(document)
            }),
          {
            workspace: context.wsIds.uuid,
            documentName
          }
        )

        this.markups.set(documentName, currMarkup ?? {})
        this.clearUpdates(documentName, now)

        return
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error('failed to save document', { documentName, attempt, error: err })

        if (this.stopped) {
          ctx.info('storage extension stopped, skipping document save', { documentName })
          throw new Error('Aborted')
        }

        await new Promise((resolve) => setTimeout(resolve, this.saveRetryInterval))
      }
    }
  }

  private clearUpdates (documentName: string, timestamp: number): void {
    const updates = this.updates.get(documentName)
    if (updates !== undefined) {
      for (const [connectionId, updatedAt] of updates.collaborators.entries()) {
        if (updatedAt < timestamp) {
          updates.collaborators.delete(connectionId)
        }
      }
    }
  }

  private hasNoUpdates (documentName: string, connectionId?: string): boolean {
    const updates = this.updates.get(documentName)
    if (updates === undefined) {
      return true
    }

    if (connectionId !== undefined) {
      return !updates.collaborators.has(connectionId)
    }

    return updates.collaborators.size === 0
  }
}
