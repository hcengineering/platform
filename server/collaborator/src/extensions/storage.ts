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

  constructor (configuration: StorageConfiguration) {
    this.configuration = configuration
  }

  async onLoadDocument (data: withContext<onLoadDocumentPayload>): Promise<any> {
    return await this.configuration.ctx.with('load-document', {}, async () => {
      return await this.loadDocument(data.documentName, data.context)
    })
  }

  async onStoreDocument (data: withContext<onStoreDocumentPayload>): Promise<void> {
    await this.configuration.ctx.with('store-document', {}, async () => {
      await this.storeDocument(data.documentName, data.document, data.context)
    })
  }

  async onDisconnect (data: withContext<onDisconnectPayload>): Promise<any> {
    await this.configuration.ctx.with('store-document', {}, async () => {
      await this.storeDocument(data.documentName, data.document, data.context)
    })
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
