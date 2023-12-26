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

import { MeasureContext } from '@hcengineering/core'
import {
  Document,
  Extension,
  afterUnloadDocumentPayload,
  onChangePayload,
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
    return await this.configuration.ctx.with('load-document', {}, async () => {
      return await this.loadDocument(documentName, context)
    })
  }

  async onStoreDocument ({ context, documentName, document }: withContext<onStoreDocumentPayload>): Promise<void> {
    const collaborators = this.collaborators.get(documentName)
    if (collaborators === undefined || collaborators.size === 0) {
      console.log('no changes for document', documentName)
      return
    }

    await this.configuration.ctx.with('store-document', {}, async () => {
      this.collaborators.delete(documentName)
      await this.storeDocument(documentName, document, context)
    })
  }

  async onDisconnect ({ context, documentName, document }: withContext<onDisconnectPayload>): Promise<any> {
    const { connectionId } = context
    const collaborators = this.collaborators.get(documentName)
    if (collaborators === undefined || !this.collaborators.has(connectionId)) {
      console.log('no changes for document', documentName)
    }

    await this.configuration.ctx.with('store-document', {}, async () => {
      this.collaborators.get(documentName)?.delete(connectionId)
      await this.storeDocument(documentName, document, context)
    })
  }

  async afterUnloadDocument ({ documentName }: afterUnloadDocumentPayload): Promise<any> {
    this.collaborators.delete(documentName)
  }

  async loadDocument (documentId: string, context: Context): Promise<YDoc | undefined> {
    const { adapter } = this.configuration

    console.log('load document', documentId)
    try {
      const ydoc = await adapter.loadDocument(documentId, context)
      if (ydoc !== undefined) {
        return ydoc
      }
    } catch (err) {
      console.error('failed to load document', documentId, err)
    }

    const { initialContentId } = context
    if (initialContentId !== undefined && initialContentId.length > 0) {
      console.log('load document initial content', initialContentId)
      try {
        return await adapter.loadDocument(initialContentId, context)
      } catch (err) {
        console.error('failed to load document', initialContentId, err)
      }
    }
  }

  async storeDocument (documentId: string, document: Document, context: Context): Promise<void> {
    const { adapter } = this.configuration

    console.log('store document', documentId)
    try {
      await adapter.saveDocument(documentId, document, context)
    } catch (err) {
      console.error('failed to save document', documentId, err)
    }

    const { targetContentId } = context
    if (targetContentId !== undefined && targetContentId.length > 0) {
      console.log('store document target content', targetContentId)
      try {
        await adapter.saveDocument(targetContentId, document, context)
      } catch (err) {
        console.error('failed to save document', targetContentId, err)
      }
    }
  }
}
