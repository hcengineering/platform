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
import { stringify } from 'csv-stringify/sync'

export class UnifiedCsvSerializer {
  async serializeSpace (docs: UnifiedDoc[], outputPath: string, spaceName: string): Promise<void> {
    const jsonData = docs.map((doc) => this.createCsvData(doc))
    const filePath = join(outputPath, `${spaceName}.csv`)

    // Get all unique headers
    const headers = Array.from(new Set(jsonData.flatMap((obj) => Object.keys(obj)))).sort()

    const csvContent = stringify(jsonData, {
      header: true,
      columns: headers
    })

    await this.saveDocument(filePath, csvContent)

    for (const doc of docs) {
      if (doc.attachments !== undefined && doc.attachments.length > 0) {
        await this.saveAttachments(doc.attachments, filePath)
      }
    }
  }

  private createCsvData (doc: UnifiedDoc): object {
    const { data, attachments, collectionFields = [] } = doc
    const csvData: Record<string, any> = {}

    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value) && collectionFields.includes(key)) {
        // Convert arrays to JSON string
        csvData[key] = value
          .map((item) => {
            if (this.isUnifiedDoc(item)) {
              return JSON.stringify(this.createCsvData(item))
            }
            return String(item)
          })
          .join('; ')
        return
      }

      if (this.isUnifiedDoc(value)) {
        csvData[key] = JSON.stringify(this.createCsvData(value))
        return
      }

      csvData[key] = value
    })

    if (attachments !== undefined && attachments.length > 0) {
      csvData.attachments = attachments.map((a) => join('files', a.name)).join('; ')
    }

    return csvData
  }

  private async saveDocument (filePath: string, content: string): Promise<void> {
    await mkdir(join(filePath, '..'), { recursive: true })
    await writeFile(filePath, content, 'utf-8')
  }

  private async saveAttachments (attachments: UnifiedAttachment[], docPath: string): Promise<string[]> {
    const filesDir = join(docPath, '..', 'files')
    await mkdir(filesDir, { recursive: true })

    const paths: string[] = []

    for (const attachment of attachments) {
      const attachmentPath = join(filesDir, attachment.name)
      const relativePath = join('files', attachment.name)

      try {
        // Call getData() callback to get the actual data
        const data = await attachment.getData()
        await writeFile(attachmentPath, new Uint8Array(data))
        paths.push(relativePath)
      } catch (err) {
        console.error(`Failed to save attachment ${attachment.name}:`, err)
      }
    }

    return paths
  }

  private isUnifiedDoc (value: any): value is UnifiedDoc {
    return value !== null && typeof value === 'object' && '_class' in value && 'data' in value
  }
}
