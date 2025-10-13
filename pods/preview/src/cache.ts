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

import { type MeasureContext } from '@hcengineering/core'

import { existsSync, mkdirSync } from 'fs'
import { rm, rename, mkdir, stat } from 'fs/promises'
import { LRUCache } from 'lru-cache'
import { dirname, isAbsolute, join, normalize, relative, resolve } from 'path'
import { Readable } from 'stream'

import { type CacheConfig } from './config'
import { type PreviewFile } from './types'

export interface Cache {
  enabled: () => boolean
  get: (key: string) => PreviewFile | undefined
  put: (key: string, value: PreviewFile) => Promise<PreviewFile>
  delete: (key: string) => void
  close: () => Promise<void>
}

class NoopCache implements Cache {
  enabled (): boolean {
    return false
  }

  get (): PreviewFile | undefined {
    return undefined
  }

  async put (key: string, value: PreviewFile): Promise<PreviewFile> {
    // noop
    return value
  }

  delete (): void {
    // noop
  }

  async close (): Promise<void> {
    // noop
  }
}

type DiskCacheEntry = PreviewFile & { size: number }

class DiskCache implements Cache {
  private readonly disposed: Set<DiskCacheEntry> = new Set<DiskCacheEntry>()
  private readonly cache: LRUCache<string, DiskCacheEntry>
  private readonly cachePath: string
  private readonly gcInterval: NodeJS.Timeout | undefined
  private gcPromise: Promise<void> = Promise.resolve()

  constructor (
    private readonly ctx: MeasureContext,
    options: CacheConfig & { cachePath: string }
  ) {
    this.cachePath = normalize(options.cachePath)

    if (!existsSync(this.cachePath)) {
      mkdirSync(this.cachePath, { recursive: true })
    }

    this.cache = new LRUCache({
      maxSize: options.cacheSize,
      sizeCalculation: (value) => value.size,
      dispose: (value) => {
        this.disposed.add(value)
      },
      ttl: 0,
      ttlAutopurge: false
    })

    this.gcInterval = setInterval(
      () => {
        void this.gc()
      },
      options.gcInterval ?? 5 * 60 * 1000
    )
  }

  enabled (): boolean {
    return true
  }

  async close (): Promise<void> {
    clearInterval(this.gcInterval)
    await this.gcPromise
    await rm(this.cachePath, { force: true, recursive: true })
  }

  private async gc (): Promise<void> {
    this.gcPromise = this.gcPromise.then(() => this.performGC())
    await this.gcPromise
  }

  private async performGC (): Promise<void> {
    const disposed = Array.from(this.disposed)
    this.disposed.clear()

    await this.ctx.with(
      'gc',
      {},
      () => {
        const promises = disposed.map(async (entry) => {
          try {
            await rm(entry.filePath, { force: true })
          } catch (err) {
            this.ctx.error('Failed to remove cache file', { path: entry, error: err })
          }
        })

        return Promise.all(promises)
      },
      { cacheCount: this.cache.size, cacheSize: this.cache.calculatedSize, gcCount: disposed.length }
    )
  }

  get (key: string): PreviewFile | undefined {
    return this.cache.get(key)
  }

  async put (key: string, value: PreviewFile): Promise<PreviewFile> {
    let filePath = normalize(value.filePath)

    if (key.length === 0) {
      throw new Error('Invalid key')
    }

    const { size } = await stat(value.filePath)

    if (!filePath.startsWith(this.cachePath)) {
      try {
        filePath = this.getFilePath(key)
        await mkdir(dirname(filePath), { recursive: true })
        await rename(value.filePath, filePath)
      } catch (err) {
        this.ctx.error('Failed to move file to cache', { filePath, error: err })
        throw err
      }
    }

    const entry = { ...value, filePath, size }
    this.cache.set(key, entry)

    return entry
  }

  async delete (key: string): Promise<void> {
    this.cache.delete(key)
  }

  private getFilePath (key: string): string {
    if (key.length === 0) {
      throw new Error('Key cannot be empty')
    }

    if (key.includes('..') || key.includes('./') || key.includes('/.')) {
      throw new Error('Key contains invalid path sequences')
    }

    key = key.replace(/[^a-zA-Z0-9-_/]/g, '_')
    const path = join(this.cachePath, key)

    if (!this.isPathWithinCache(path)) {
      throw new Error('Cache path is outside of cache directory')
    }

    return path
  }

  private isPathWithinCache (filePath: string): boolean {
    const normalizedPath = resolve(normalize(filePath))
    const relativePath = relative(this.cachePath, normalizedPath)

    // If the relative path starts with '..', it's outside the cache directory
    return !relativePath.startsWith('..') && !isAbsolute(relativePath)
  }
}

export async function streamToBuffer (data: Buffer | Readable): Promise<Buffer> {
  if (Buffer.isBuffer(data)) {
    return data
  }

  try {
    const chunks: Buffer[] = []
    for await (const chunk of data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  } finally {
    data.destroy()
  }
}

export function createCache (ctx: MeasureContext, options: CacheConfig): Cache {
  if (options.enabled && options.cachePath !== undefined) {
    try {
      const cachePath = resolve(normalize(options.cachePath))

      if (cachePath.includes('..') || !isAbsolute(cachePath)) {
        throw new Error('Invalid cache path')
      }

      ctx.info('using disk cache', { cachePath })
      return new DiskCache(ctx, { ...options, cachePath })
    } catch (err: any) {
      ctx.error('Failed to create cache', { path: options.cachePath, error: err })
    }
  }

  ctx.info('using no cache')
  return new NoopCache()
}

export async function withCache (
  ctx: MeasureContext,
  cache: Cache,
  key: string,
  fn: () => Promise<PreviewFile>
): Promise<PreviewFile> {
  const cached = cache.get(key)
  if (cached !== undefined) {
    try {
      await stat(cached.filePath)
      return cached
    } catch {
      ctx.warn('cached file not found', { cached })
      cache.delete(key)
    }
  }

  const value = await fn()
  return await cache.put(key, value)
}
