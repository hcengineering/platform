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

import { LRUCache } from 'lru-cache'
import { Readable } from 'stream'

import { type CacheConfig } from '../config'
import { type BlobBody } from './types'

export type CacheEntry = Omit<BlobBody, 'body'> & {
  body: Buffer
}

export interface Cache {
  enabled: (size: number) => boolean
  get: (key: string) => CacheEntry | undefined
  set: (key: string, value: CacheEntry) => void
  delete: (key: string) => void
}

class CacheImpl implements Cache {
  private readonly cache: LRUCache<string, CacheEntry>

  constructor (private readonly options: CacheConfig) {
    this.cache = new LRUCache({
      max: options.blobCount
    })
  }

  enabled (size: number): boolean {
    return size <= this.options.blobSize
  }

  get (key: string): CacheEntry | undefined {
    return this.cache.get(key)
  }

  set (key: string, value: CacheEntry): void {
    this.cache.set(key, value)
  }

  delete (key: string): void {
    this.cache.delete(key)
  }
}

class NoopCache implements Cache {
  enabled (): boolean {
    return false
  }

  get (): undefined {
    return undefined
  }

  set (): void {
    // noop
  }

  delete (): void {
    // noop
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

export function createCache (options: CacheConfig): Cache {
  if (options.enabled) {
    return new CacheImpl(options)
  }
  return new NoopCache()
}
