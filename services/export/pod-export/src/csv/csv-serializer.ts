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

import { stringify } from 'csv-stringify/sync'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { Transformer } from '../transformer'
import { UnifiedAttachment, UnifiedDoc } from '../types'
import { type TransformConfig } from '@hcengineering/export'

export class UnifiedCsvSerializer {
  private readonly transformer: Transformer

  constructor (config?: TransformConfig) {
    this.transformer = new Transformer(config)
  }

  async serializeSpace (docs: UnifiedDoc[], outputPath: string, spaceName: string): Promise<void> {
    const csvData = docs.map((doc) => this.createCsvData(doc))
    const filePath = join(outputPath, `${spaceName}.csv`)

    const headers = Array.from(new Set(csvData.flatMap((obj) => Object.keys(obj)))).sort()

    const csvContent = stringify(csvData, {
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
    const { data, attachments = [] } = doc
    const csvData: Record<string, any> = {}

    Object.entries(data).forEach(([key, value]) => {
      const formatted = this.transformer.transformAttribute(key, value)
      Object.entries(formatted).forEach(([formattedKey, formattedValue]) => {
        csvData[formattedKey] = formattedValue
      })
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
}
