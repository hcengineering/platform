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
import { Connection, Extension, Hocuspocus, onConfigurePayload, onStatelessPayload } from '@hocuspocus/server'
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
      const { connection, documentName } = data

      console.log('process stateless message', action.action, documentName)

      await this.configuration.ctx.with(action.action, {}, async () => {
        switch (action.action) {
          case 'document.content':
            await this.onDocumentContent(context, documentName, action)
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

  async onDocumentContent (context: Context, documentName: string, action: DocumentContentAction): Promise<void> {
    const instance = this.instance
    const { content, field } = action.params

    const connection = await instance.openDirectConnection(documentName, context)

    try {
      const document = connection.document

      if (document != null) {
        if (!document.share.has(field)) {
          const ydoc = this.configuration.transformer.toYdoc(content, field)
          await connection.transact((target) => {
            Y.applyUpdate(target, Y.encodeStateAsUpdate(ydoc), connection)
          })
        } else {
          console.warn(`document field '${field}' has already been initialized`)
        }
      } else {
        console.warn('document is empty')
      }
    } finally {
      await connection.disconnect()
    }
  }

  async onCopyDocument (context: Context, action: DocumentCopyAction): Promise<void> {
    const instance = this.instance

    const { sourceId, targetId } = action.params
    console.info(`copy document content ${sourceId} -> ${targetId}`)

    const _context: Context = { ...context, initialContentId: '', targetContentId: '' }

    const sourceConnection = await instance.openDirectConnection(sourceId, _context)
    const targetConnection = await instance.openDirectConnection(targetId, _context)

    try {
      let updates = new Uint8Array()

      await sourceConnection.transact((source) => {
        updates = Y.encodeStateAsUpdate(source)
      })

      await targetConnection.transact((target) => {
        // TODO this does not work properly for existing documents
        // we need to replace content, not only apply updates
        Y.applyUpdate(target, updates)
      })
    } finally {
      await targetConnection.disconnect()
      await sourceConnection.disconnect()
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

    const _context: Context = { ...context, initialContentId: '', targetContentId: '' }

    const docConnection = await instance.openDirectConnection(documentId, _context)

    try {
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
  }
}
