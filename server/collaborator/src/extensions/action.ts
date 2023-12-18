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
import { Connection, Document, Extension, Hocuspocus, onConfigurePayload, onStatelessPayload } from '@hocuspocus/server'
import { Transformer } from '@hocuspocus/transformer'
import * as Y from 'yjs'

import { Context } from '../context'
import {
  Action,
  ActionStatus,
  ActionStatusResponse,
  DocumentContentAction,
  DocumentCopyAction,
  DocumentFieldCopyAction
} from '../types'

export interface ActionsConfiguration {
  ctx: MeasureContext
  transformer: Transformer
}

export class ActionsExtension implements Extension {
  private readonly configuration: ActionsConfiguration
  instance!: Hocuspocus

  constructor (configuration: ActionsConfiguration) {
    this.configuration = configuration
  }

  async onConfigure ({ instance }: onConfigurePayload): Promise<void> {
    this.instance = instance
  }

  async onStateless (data: onStatelessPayload): Promise<any> {
    try {
      const action = JSON.parse(data.payload) as Action
      const context = data.connection.context
      const { connection, document, documentName } = data

      console.log('process stateless message', action.action, documentName)

      await this.configuration.ctx.with(action.action, {}, async () => {
        switch (action.action) {
          case 'document.content':
            await this.onDocumentContent(document, action)
            this.sendActionStatus(connection, action, 'completed')
            return
          case 'document.copy':
            await this.onCopyDocument(context, action)
            this.sendActionStatus(connection, action, 'completed')
            return
          case 'document.field.copy':
            await this.onCopyDocumentField(context, action)
            this.sendActionStatus(connection, action, 'completed')
            return
          default:
            console.error('unsupported action type', action)
        }
      })
    } catch (err: any) {
      console.error('failed to process stateless message', err)
    }
  }

  sendActionStatus (connection: Connection, action: Action, status: ActionStatus): void {
    const payload: ActionStatusResponse = { action, status }
    connection.sendStateless(JSON.stringify(payload))
  }

  async onDocumentContent (document: Document, action: DocumentContentAction): Promise<void> {
    const { content, field } = action.params
    if (!document.share.has(field)) {
      const ydoc = this.configuration.transformer.toYdoc(content, field)
      document.merge(ydoc)
    } else {
      console.warn('document has already been initialized')
    }
  }

  async onCopyDocument (context: Context, action: DocumentCopyAction): Promise<void> {
    const instance = this.instance

    const { sourceId, targetId } = action.params
    console.info(`copy document content ${sourceId} -> ${targetId}`)

    const _context: Context = { ...context, initialContentId: '' }

    let source: Document | null = null
    let target: Document | null = null

    const sourceConnection = await instance.openDirectConnection(sourceId, _context)
    const targetConnection = await instance.openDirectConnection(targetId, _context)

    try {
      source = sourceConnection.document
      target = targetConnection.document

      if (source !== null && target !== null) {
        const updates = Y.encodeStateAsUpdate(source)

        // make an empty transaction to force source document save
        // without that force document unload won't save the doc
        await sourceConnection.transact(() => {})

        await targetConnection.transact((target) => {
          Y.applyUpdate(target, updates)
        })
      } else {
        console.warn('empty ydoc document', sourceId, targetId)
      }
    } finally {
      await targetConnection.disconnect()
      await sourceConnection.disconnect()
    }

    // Hocuspocus does not unload document when direct conneciton is used
    // so we have to do it manually
    // https://github.com/ueberdosis/hocuspocus/issues/709

    if (source !== null && source.getConnectionsCount() === 0) {
      instance.unloadDocument(source)
    }

    if (target !== null && target.getConnectionsCount() === 0) {
      instance.unloadDocument(target)
    }
  }

  async onCopyDocumentField (context: Context, action: DocumentFieldCopyAction): Promise<void> {
    const instance = this.instance

    const { documentId, srcFieldId, dstFieldId } = action.params
    console.info(`copy document ${documentId} field content ${srcFieldId} -> ${dstFieldId}`)

    if (srcFieldId == null || srcFieldId === '' || dstFieldId == null || dstFieldId === '') {
      console.error('empty srcFieldId or dstFieldId', srcFieldId, dstFieldId)
      return
    }

    const _context: Context = { ...context, initialContentId: '' }

    let doc: Document | null = null

    const docConnection = await instance.openDirectConnection(documentId, _context)

    try {
      doc = docConnection.document

      await docConnection.transact((doc) => {
        const srcField = doc.getXmlFragment(srcFieldId)
        const dstField = doc.getXmlFragment(dstFieldId)

        // similar to XmlFragment's clone method
        dstField.insert(
          0,
          srcField.toArray().map((item) => (item instanceof Y.AbstractType ? item.clone() : item)) as any
        )
      })
    } finally {
      await docConnection.disconnect()
    }

    // Hocuspocus does not unload document when direct conneciton is used
    // so we have to do it manually
    // https://github.com/ueberdosis/hocuspocus/issues/709

    if (doc !== null && doc.getConnectionsCount() === 0) {
      instance.unloadDocument(doc)
    }
  }
}
