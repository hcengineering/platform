//
// Copyright © 2024 Anticrm Platform Contributors.
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

import {
  type Blob,
  type Branding,
  type DocumentUpdate,
  type MeasureContext,
  type Ref,
  type StorageIterator,
  type WorkspaceId,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
import type { BlobLookup } from '@hcengineering/core/src/classes'
import { type Readable } from 'stream'

export type ListBlobResult = Omit<Blob, 'contentType' | 'version'>

export interface UploadedObjectInfo {
  etag: string
  versionId: string | null
}

export interface BlobStorageIterator {
  next: () => Promise<ListBlobResult | undefined>
  close: () => Promise<void>
}

export interface BlobLookupResult {
  lookups: BlobLookup[]
  updates?: Map<Ref<Blob>, DocumentUpdate<BlobLookup>>
}

export interface BucketInfo {
  name: string
  delete: () => Promise<void>
  list: () => Promise<BlobStorageIterator>
}

export interface StorageAdapter {
  // If specified will limit a blobs available to put into selected provider.
  // A set of content type patterns supported by this storage provider.
  // If not defined, will be suited for any other content types.
  contentTypes?: string[]

  initialize: (ctx: MeasureContext, workspaceId: WorkspaceId) => Promise<void>

  close: () => Promise<void>

  exists: (ctx: MeasureContext, workspaceId: WorkspaceId) => Promise<boolean>
  make: (ctx: MeasureContext, workspaceId: WorkspaceId) => Promise<void>
  delete: (ctx: MeasureContext, workspaceId: WorkspaceId) => Promise<void>

  listBuckets: (ctx: MeasureContext, productId: string) => Promise<BucketInfo[]>
  remove: (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]) => Promise<void>
  listStream: (ctx: MeasureContext, workspaceId: WorkspaceId, prefix?: string) => Promise<BlobStorageIterator>
  stat: (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string) => Promise<Blob | undefined>
  get: (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string) => Promise<Readable>
  put: (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    stream: Readable | Buffer | string,
    contentType: string,
    size?: number
  ) => Promise<UploadedObjectInfo>
  read: (ctx: MeasureContext, workspaceId: WorkspaceId, name: string) => Promise<Buffer[]>
  partial: (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    offset: number,
    length?: number
  ) => Promise<Readable>

  // Lookup will extend Blob with lookup information.
  lookup: (
    ctx: MeasureContext,
    workspaceId: WorkspaceIdWithUrl,
    branding: Branding | null,
    docs: Blob[]
  ) => Promise<BlobLookupResult>
}

export interface StorageAdapterEx extends StorageAdapter {
  defaultAdapter: string
  adapters?: Map<string, StorageAdapter>

  syncBlobFromStorage: (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    provider?: string
  ) => Promise<void>

  find: (ctx: MeasureContext, workspaceId: WorkspaceId) => StorageIterator
}

/**
 * Ad dummy storage adapter for tests
 */
export class DummyStorageAdapter implements StorageAdapter, StorageAdapterEx {
  defaultAdapter: string = ''
  async syncBlobFromStorage (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<void> {}

  async initialize (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async close (): Promise<void> {}

  async exists (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<boolean> {
    return false
  }

  find (ctx: MeasureContext, workspaceId: WorkspaceId): StorageIterator {
    return {
      next: async (ctx) => undefined,
      close: async (ctx) => {}
    }
  }

  async listBuckets (ctx: MeasureContext, productId: string): Promise<BucketInfo[]> {
    return []
  }

  async make (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async delete (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async remove (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]): Promise<void> {}

  async list (ctx: MeasureContext, workspaceId: WorkspaceId, prefix?: string | undefined): Promise<ListBlobResult[]> {
    return []
  }

  async listStream (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    prefix?: string | undefined
  ): Promise<BlobStorageIterator> {
    return {
      next: async (): Promise<ListBlobResult | undefined> => {
        return undefined
      },
      close: async () => {}
    }
  }

  async stat (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Blob | undefined> {
    return undefined
  }

  async get (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Readable> {
    throw new Error('not implemented')
  }

  async partial (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    offset: number,
    length?: number | undefined
  ): Promise<Readable> {
    throw new Error('not implemented')
  }

  async read (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Buffer[]> {
    throw new Error('not implemented')
  }

  async put (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    stream: string | Readable | Buffer,
    contentType: string,
    size?: number | undefined
  ): Promise<UploadedObjectInfo> {
    throw new Error('not implemented')
  }

  async lookup (
    ctx: MeasureContext,
    workspaceId: WorkspaceIdWithUrl,
    branding: Branding | null,
    docs: Blob[]
  ): Promise<BlobLookupResult> {
    return { lookups: [] }
  }
}

export function createDummyStorageAdapter (): StorageAdapter {
  return new DummyStorageAdapter()
}

export async function removeAllObjects (
  ctx: MeasureContext,
  storage: StorageAdapter,
  workspaceId: WorkspaceId,
  prefix?: string
): Promise<void> {
  // We need to list all files and delete them
  const iterator = await storage.listStream(ctx, workspaceId, prefix)
  let bulk: string[] = []
  while (true) {
    const obj = await iterator.next()
    if (obj === undefined) {
      break
    }
    bulk.push(obj.storageId)
    if (bulk.length > 50) {
      await storage.remove(ctx, workspaceId, bulk)
      bulk = []
    }
  }
  if (bulk.length > 0) {
    await storage.remove(ctx, workspaceId, bulk)
    bulk = []
  }
  await iterator.close()
}

export async function objectsToArray (
  ctx: MeasureContext,
  storage: StorageAdapter,
  workspaceId: WorkspaceId,
  prefix?: string
): Promise<ListBlobResult[]> {
  // We need to list all files and delete them
  const iterator = await storage.listStream(ctx, workspaceId, prefix)
  const bulk: ListBlobResult[] = []
  while (true) {
    const obj = await iterator.next()
    if (obj === undefined) {
      break
    }
    bulk.push(obj)
  }
  await iterator.close()
  return bulk
}
