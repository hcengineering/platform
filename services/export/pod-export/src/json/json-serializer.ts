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

import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { UnifiedAttachment, UnifiedDoc } from '../types'

export class UnifiedJsonSerializer {
  async serializeSpace (docs: UnifiedDoc[], outputPath: string, spaceName: string): Promise<void> {
    const jsonData = docs.map((doc) => this.createJsonData(doc))
    const filePath = join(outputPath, `${spaceName}.json`)

    await this.saveDocument(filePath, jsonData)

    // Save attachments for all documents
    for (const doc of docs) {
      if (doc.attachments !== undefined && doc.attachments.length > 0) {
        await this.saveAttachments(doc.attachments, filePath)
      }
    }
  }

  private createJsonData (doc: UnifiedDoc): object {
    const { data, attachments, collectionFields = [] } = doc
    const jsonData: Record<string, any> = {}

    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value) && collectionFields.includes(key)) {
        // Recursively process collection elements
        jsonData[key] = value.map((item) => {
          if (this.isUnifiedDoc(item)) {
            return this.createJsonData(item)
          }
          return item
        })
        return
      }

      if (this.isUnifiedDoc(value)) {
        // Recursively process nested document
        jsonData[key] = this.createJsonData(value)
        return
      }

      jsonData[key] = value
    })

    if (attachments !== undefined && attachments.length > 0) {
      jsonData.attachments = attachments.map((a) => join('files', a.name))
    }

    return jsonData
  }

  private isUnifiedDoc (value: any): value is UnifiedDoc {
    return value !== null && typeof value === 'object' && '_class' in value && 'data' in value
  }

  private async saveDocument (filePath: string, data: object): Promise<void> {
    await mkdir(join(filePath, '..'), { recursive: true })
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  private async saveAttachments (attachments: UnifiedAttachment[], docPath: string): Promise<string[]> {
    const filesDir = join(docPath, '..', 'files')
    await mkdir(filesDir, { recursive: true })

    const paths: string[] = []

    for (const attachment of attachments) {
      const attachmentPath = join(filesDir, attachment.name)
      const relativePath = join('files', attachment.name)

      try {
        const data = await attachment.getData()
        await writeFile(attachmentPath, new Uint8Array(data))
        paths.push(relativePath)
      } catch (err) {
        console.error(`Failed to save attachment ${attachment.name}:`, err)
      }
    }

    return paths
  }
}
