import { Connection, Document, Extension, Hocuspocus, onConfigurePayload, onStatelessPayload } from '@hocuspocus/server'
import * as Y from 'yjs'

import { Context, withContext } from '../context'
import { Action, ActionStatus, ActionStatusResponse, DocumentCopyAction, DocumentFieldCopyAction } from '../types'

export class ActionsExtension implements Extension {
  instance!: Hocuspocus

  async onConfigure ({ instance }: onConfigurePayload): Promise<void> {
    this.instance = instance
  }

  async onStateless (data: withContext<onStatelessPayload>): Promise<any> {
    try {
      const action = JSON.parse(data.payload) as Action
      const context = data.connection.context
      const { connection } = data

      switch (action.action) {
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
    } catch (err: any) {
      console.error('failed to process stateless message', err)
    }
  }

  sendActionStatus (connection: Connection, action: Action, status: ActionStatus): void {
    const payload: ActionStatusResponse = { action, status }
    connection.sendStateless(JSON.stringify(payload))
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
