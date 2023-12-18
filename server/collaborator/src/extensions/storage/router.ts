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

import { Extension, onDisconnectPayload, onLoadDocumentPayload, onStoreDocumentPayload } from '@hocuspocus/server'

export type StorageType = string

export interface RoutedStorageConfiguration {
  extensions: Record<StorageType, Extension>
  default?: StorageType
}

function parseDocumentName (documentId: string): { schema: StorageType, documentName: string } {
  const [schema, documentName] = documentId.split('://', 2)
  return documentName !== undefined
    ? { documentName, schema }
    : { documentName: documentId, schema: '' }
}

export class RoutedStorageExtension implements Extension {
  private readonly configuration: RoutedStorageConfiguration

  constructor (configuration: RoutedStorageConfiguration) {
    this.configuration = { ...configuration }
  }

  getStorageExtension (schema: StorageType): Extension | undefined {
    return schema in this.configuration.extensions
      ? this.configuration.extensions[schema]
      : this.configuration.default !== undefined
        ? this.configuration.extensions[this.configuration.default]
        : undefined
  }

  async onDisconnect (data: onDisconnectPayload): Promise<any> {
    const { schema, documentName } = parseDocumentName(data.documentName)
    const extension = this.getStorageExtension(schema)
    return await extension?.onDisconnect?.({ ...data, documentName })
  }

  async onLoadDocument (data: onLoadDocumentPayload): Promise<any> {
    const { schema, documentName } = parseDocumentName(data.documentName)
    const extension = this.getStorageExtension(schema)
    return await extension?.onLoadDocument?.({ ...data, documentName })
  }

  async onStoreDocument (data: onStoreDocumentPayload): Promise<void> {
    const { schema, documentName } = parseDocumentName(data.documentName)
    const extension = this.getStorageExtension(schema)
    return await extension?.onStoreDocument?.({ ...data, documentName })
  }
}
