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
import { StorageAdapter } from '@hcengineering/server-core'

import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

import { getImageMetadata } from '../metadata'
import { TemporaryDir } from '../tempdir'
import { type PreviewFile, type PreviewMetadata, type PreviewProvider } from '../types'
import { bmpToPng } from '../utils/bmp'
import { heicToPng } from '../utils/heic'

export class ImageProvider implements PreviewProvider {
  constructor (
    private readonly storage: StorageAdapter,
    private readonly tempDir: TemporaryDir
  ) {}

  supports (contentType: string): boolean {
    return contentType.startsWith('image/')
  }

  async image (ctx: MeasureContext, workspace: WorkspaceUuid, name: string, contentType: string): Promise<PreviewFile> {
    const path = this.tempDir.tmpFile()

    await ctx.with('blob-read', {}, async (ctx) => {
      const stream = await this.storage.get(ctx, { uuid: workspace } as any, name)
      await pipeline(stream, createWriteStream(path))
    })

    // Handle HEIC conversion
    if (contentType === 'image/heic' || contentType === 'image/heif') {
      const pngFile = await heicToPng(ctx, path)
      this.tempDir.rm(path)
      return { mimeType: 'image/png', filePath: pngFile }
    }

    // Handle BMP conversion
    if (contentType === 'image/bmp') {
      const pngFile = await bmpToPng(ctx, path)
      this.tempDir.rm(path)
      return { mimeType: 'image/png', filePath: pngFile }
    }

    return { mimeType: contentType, filePath: path }
  }

  async metadata (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    name: string,
    contentType: string
  ): Promise<PreviewMetadata> {
    const { filePath: path } = await ctx.with('image', { contentType }, (ctx) => {
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
