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

import type { MeasureContext, WorkspaceUuid } from '@hcengineering/core'
import type { StorageAdapter } from '@hcengineering/server-core'

import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

import { getImageMetadata } from '../metadata'
import { TemporaryDir } from '../tempdir'
import { type PreviewFile, type PreviewMetadata, type PreviewProvider } from '../types'
import { pdfToImage } from '../utils'

export class PdfProvider implements PreviewProvider {
  constructor (
    private readonly storage: StorageAdapter,
    private readonly tempDir: TemporaryDir
  ) {}

  supports (contentType: string): boolean {
    return contentType.startsWith('application/pdf')
  }

  async image (ctx: MeasureContext, workspace: WorkspaceUuid, name: string, contentType: string): Promise<PreviewFile> {
    const baseName = this.tempDir.tmpFile()
    const pdfFile = baseName + '.pdf'
    let pngFile = baseName + '.png'

    try {
      await ctx.with('blob-read', {}, async (ctx) => {
        const stream = await this.storage.get(ctx, { uuid: workspace } as any, name)
        await pipeline(stream, createWriteStream(pdfFile))
      })

      pngFile = await ctx.with('pdf-to-png', {}, () => {
        return pdfToImage(ctx, pdfFile)
      })
    } catch (err: any) {
      // remove temporary png file in case of error
      this.tempDir.rm(pdfFile, pngFile)
      throw err
    } finally {
      // remove temporary pdf file in any case
      this.tempDir.rm(pdfFile)
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
