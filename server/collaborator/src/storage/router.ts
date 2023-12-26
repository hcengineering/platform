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

import { Document } from '@hocuspocus/server'
import { Doc as YDoc } from 'yjs'

import { Context } from '../context'

import { StorageAdapter, StorageAdapters } from './adapter'

function parseDocumentName (documentId: string): { schema: string, documentName: string } {
  const [schema, documentName] = documentId.split('://', 2)
  return documentName !== undefined ? { documentName, schema } : { documentName: documentId, schema: '' }
}

export class RouterStorageAdapter implements StorageAdapter {
  constructor (
    private readonly adapters: StorageAdapters,
    private readonly defaultAdapter: string
  ) {}

  getStorageAdapter (schema: string): StorageAdapter | undefined {
    return schema in this.adapters
      ? this.adapters[schema]
      : this.defaultAdapter !== undefined
        ? this.adapters[this.defaultAdapter]
        : undefined
  }

  async loadDocument (documentId: string, context: Context): Promise<YDoc | undefined> {
    const { schema, documentName } = parseDocumentName(documentId)
    const adapter = this.getStorageAdapter(schema)
    return await adapter?.loadDocument?.(documentName, context)
  }

  async saveDocument (documentId: string, document: Document, context: Context): Promise<void> {
    const { schema, documentName } = parseDocumentName(documentId)
    const adapter = this.getStorageAdapter(schema)
    await adapter?.saveDocument?.(documentName, document, context)
  }
}
