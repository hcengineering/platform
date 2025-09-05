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

import { type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import type { StorageAdapter } from '@hcengineering/server-core'

import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

import { getImageMetadata } from '../metadata'
import { TemporaryDir } from '../tempdir'
import { type PreviewFile, type PreviewMetadata, type PreviewProvider } from '../types'
import { pdfToImage } from '../utils/pdf'
import { docToPdf } from '../utils/libreoffice'

// MS Office
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const DOC_MIME_TYPE = 'application/msword'
const PPTX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
const PPT_MIME_TYPE = 'application/vnd.ms-powerpoint'
const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const XLS_MIME_TYPE = 'application/vnd.ms-excel'
// Open Office
const ODT_MIME_TYPE = 'application/vnd.oasis.opendocument.text'
const ODS_MIME_TYPE = 'application/vnd.oasis.opendocument.spreadsheet'
const ODP_MIME_TYPE = 'application/vnd.oasis.opendocument.presentation'
// RTF
const RTF_MIME_TYPE_1 = 'application/rtf'
const RTF_MIME_TYPE_2 = 'text/rtf'
// JSON
const JSON_MIME_TYPE = 'application/json'
const YAML_MIME_TYPE = 'application/yaml'

const extensions: Record<string, string> = {
  [DOCX_MIME_TYPE]: '.docx',
  [DOC_MIME_TYPE]: '.doc',
  [PPTX_MIME_TYPE]: '.pptx',
  [PPT_MIME_TYPE]: '.ppt',
  [XLSX_MIME_TYPE]: '.xlsx',
  [XLS_MIME_TYPE]: '.xls',
  [RTF_MIME_TYPE_1]: '.rtf',
  [RTF_MIME_TYPE_2]: '.rtf',
  [ODT_MIME_TYPE]: '.odt',
  [ODS_MIME_TYPE]: '.ods',
  [ODP_MIME_TYPE]: '.odp',
  [JSON_MIME_TYPE]: '.json',
  [YAML_MIME_TYPE]: '.yaml'
}

function getFileExtension (contentType: string): string {
  const mimeType = contentType.split(';')[0].trim().toLowerCase()
  return extensions[mimeType] ?? ''
}

export class DocProvider implements PreviewProvider {
  constructor (
    private readonly storage: StorageAdapter,
    private readonly tempDir: TemporaryDir
  ) {}

  supports (contentType: string): boolean {
    const mimeType = contentType.split(';')[0].trim().toLowerCase()
    return extensions[mimeType] !== undefined || contentType.startsWith('text/')
  }

  async image (ctx: MeasureContext, workspace: WorkspaceUuid, name: string, contentType: string): Promise<PreviewFile> {
    const tmpFile = this.tempDir.tmpFile()
    const docFile = tmpFile + getFileExtension(contentType)
    let pdfFile = tmpFile + '.pdf'
    let pngFile = tmpFile + '.png'

    try {
      await ctx.with('blob-read', {}, async (ctx) => {
        const stream = await this.storage.get(ctx, { uuid: workspace } as any, name)
        await pipeline(stream, createWriteStream(docFile))
      })

      pdfFile = await ctx.with('doc-to-pdf', {}, (ctx) => {
        return docToPdf(ctx, docFile)
      })

      pngFile = await ctx.with('pdf-to-png', {}, (ctx) => {
        return pdfToImage(ctx, pdfFile)
      })
    } catch (err: any) {
      // remove temporary files in case of error
      this.tempDir.rm(docFile, pdfFile, pngFile)
      throw err
    } finally {
      // remove temporary files except the png file
      this.tempDir.rm(docFile, pdfFile)
    }

    return { mimeType: 'image/png', filePath: pngFile }
  }

  async metadata (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    name: string,
    contentType: string
  ): Promise<PreviewMetadata> {
    const { filePath: path } = await ctx.with('thumbnail', {}, (ctx) => {
      return this.image(ctx, workspace, name, contentType)
    })

    try {
      const thumbnail = await getImageMetadata(ctx, path)
      return { thumbnail }
    } catch (err: any) {
      throw new Error(`Failed to get metadata: ${err.message}`)
    } finally {
      this.tempDir.rm(path)
    }
  }
}
