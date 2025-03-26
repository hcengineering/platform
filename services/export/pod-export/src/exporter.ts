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

import { Client, DocumentQuery, MeasureContext, WorkspaceIds } from '@hcengineering/core'
import { Class, Doc, Ref, Space } from '@hcengineering/core/types/classes'
import core from '@hcengineering/model-core'
import { StorageAdapter } from '@hcengineering/server-core'
import path from 'path'
import { UnifiedConverter } from './converter'
import { UnifiedCsvSerializer } from './csv/csv-serializer'
import { UnifiedJsonSerializer } from './json/json-serializer'
import { type TransformConfig } from '@hcengineering/export'

export enum ExportFormat {
  UNIFIED = 'unified',
  CSV = 'csv',
  JSON = 'json'
}

export interface ExportOptions {
  format: ExportFormat
  attributesOnly: boolean
  query?: DocumentQuery<Doc>
}

export class WorkspaceExporter {
  private readonly jsonSerializer: UnifiedJsonSerializer
  private readonly csvSerializer: UnifiedCsvSerializer
  private readonly converter: UnifiedConverter

  constructor (
    context: MeasureContext,
    private readonly client: Client,
    storage: StorageAdapter,
    wsIds: WorkspaceIds,
    config?: TransformConfig
  ) {
    this.jsonSerializer = new UnifiedJsonSerializer()
    this.csvSerializer = new UnifiedCsvSerializer(config)
    this.converter = new UnifiedConverter(context, client, storage, wsIds)
  }

  async export (_class: Ref<Class<Doc>>, outputDir: string, options: ExportOptions): Promise<void> {
    const { format, attributesOnly, query } = options

    const docs = await this.client.findAll(_class, query ?? {})
    const docsBySpace = new Map<Ref<Space>, Doc[]>()

    // Group documents by space
    for (const doc of docs) {
      const spaceId = doc.space
      if (!docsBySpace.has(spaceId)) {
        docsBySpace.set(spaceId, [])
      }
      docsBySpace.get(spaceId)?.push(doc)
    }

    // Process each space
    for (const [spaceId, spaceDocs] of docsBySpace) {
      const space = await this.client.findOne(core.class.Space, { _id: spaceId })
      if (space === undefined) {
        console.error(`Space not found: ${spaceId}`)
        continue
      }

      const spaceName = space.name ?? spaceId
      const spaceDir = path.join(outputDir, spaceName)

      // Convert all docs to UnifiedDoc format
      const unifiedDoc = await Promise.all(spaceDocs.map((doc) => this.converter.convert(doc, attributesOnly)))

      if (format === ExportFormat.JSON) {
        await this.jsonSerializer.serializeSpace(unifiedDoc, outputDir, spaceName)
      } else if (format === ExportFormat.CSV) {
        await this.csvSerializer.serializeSpace(unifiedDoc, outputDir, spaceName)
      } else {
        throw new Error(`Unsupported format: ${format}`)
      }

      console.log(`Exported ${spaceDocs.length} documents to ${spaceDir}`)
    }
  }
}
