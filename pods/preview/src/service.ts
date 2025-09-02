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

import { type Blob, type MeasureContext, type WorkspaceUuid, RateLimiter, withContext } from '@hcengineering/core'
import { type StorageAdapter } from '@hcengineering/server-core'

import { type Cache } from './cache'
import { BadRequestError, NotFoundError } from './error'
import { DocProvider, ImageProvider, NoopProvider, PdfProvider, VideoProvider } from './providers'
import { TemporaryDir } from './tempdir'
import { type PreviewFile, type PreviewMetadata, type PreviewProvider } from './types'
import { transformImage } from './utils/sharp'

export interface ThumbnailParams {
  fit: 'cover' | 'contain'
  format: 'webp' | 'avif' | 'jpeg' | 'png'
  height: number | undefined
  width: number | undefined
}

export interface PreviewService {
  metadata: (ctx: MeasureContext, workspace: WorkspaceUuid, name: string) => Promise<PreviewMetadata>
  thumbnail: (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    name: string,
    params: ThumbnailParams
  ) => Promise<PreviewFile>
}

export function createPreviewService (
  storage: StorageAdapter,
  cache: Cache,
  tempDir: TemporaryDir,
  concurrency: number = 10
): PreviewService {
  const providers: PreviewProvider[] = [
    new ImageProvider(storage, tempDir),
    new DocProvider(storage, tempDir),
    new PdfProvider(storage, tempDir),
    new VideoProvider(storage, tempDir),
    // The last one is a fallback provider
    // that supports all mime types and returns no preview
    new NoopProvider()
  ]
  return new PreviewServiceImpl(storage, cache, tempDir, providers, concurrency)
}

class PreviewServiceImpl implements PreviewService {
  private readonly limiter: RateLimiter
  constructor (
    private readonly storage: StorageAdapter,
    private readonly cache: Cache,
    private readonly tempDir: TemporaryDir,
    private readonly providers: PreviewProvider[],
    concurrency: number = 10
  ) {
    this.limiter = new RateLimiter(concurrency)
  }

  @withContext('metadata')
  async metadata (ctx: MeasureContext, workspace: WorkspaceUuid, name: string): Promise<PreviewMetadata> {
    const stat = await this.statBlob(ctx, workspace, name)
    const provider = this.findProvider(ctx, stat.contentType)

    return await ctx.with(
      'metadata',
      { contentType: stat.contentType },
      (ctx) => {
        return provider.metadata(ctx, workspace, name, stat.contentType)
      },
      { workspace }
    )
  }

  async thumbnail (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    name: string,
    params: ThumbnailParams
  ): Promise<PreviewFile> {
    const imageKey = this.imageKey(workspace, name)
    const thumbKey = this.thumbnailKey(workspace, name, params)

    return await withCache(this.cache, thumbKey, async () => {
      const stat = await this.statBlob(ctx, workspace, name)
      const provider = this.findProvider(ctx, stat.contentType)

      const image = await withCache(this.cache, imageKey, () => {
        return ctx.with(
          'thumbnail',
          { contentType: stat.contentType },
          (ctx) => this.limiter.exec(() => provider.image(ctx, workspace, name, stat.contentType)),
          { workspace }
        )
      })

      const thumbnailPath = this.tempDir.tmpFile()
      try {
        const { contentType } = await transformImage(image.filePath, thumbnailPath, params)
        return {
          filePath: thumbnailPath,
          mimeType: contentType
        }
      } finally {
        this.tempDir.rm(thumbnailPath)
      }
    })
  }

  @withContext('stat-blob')
  async statBlob (ctx: MeasureContext, workspace: WorkspaceUuid, name: string): Promise<Blob> {
    const wsId = { uuid: workspace } as any

    const stat = await this.storage.stat(ctx, wsId, name)
    if (stat !== undefined) {
      return stat
    }

    throw new NotFoundError()
  }

  findProvider (ctx: MeasureContext, contentType: string): PreviewProvider {
    const provider = this.providers.find((it) => it.supports(contentType))
    if (provider != null) {
      return provider
    }

    throw new BadRequestError(`Unsupported content type: ${contentType}`)
  }

  private imageKey (workspaceId: string, name: string): string {
    return `image/${workspaceId}/${name}`
  }

  private thumbnailKey (workspaceId: string, name: string, params: ThumbnailParams): string {
    return `thumbnail/${workspaceId}/${name}-${params.width}-${params.height}-${params.format}`
  }
}

async function withCache (cache: Cache, key: string, fn: () => Promise<PreviewFile>): Promise<PreviewFile> {
  const cached = cache.get(key)
  if (cached !== undefined) {
    return cached
  }

  const value = await fn()
  return await cache.put(key, value)
}
