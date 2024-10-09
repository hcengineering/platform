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

import { type Blob, type MeasureContext, type StorageIterator, type WorkspaceId } from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import { type Readable } from 'stream'

export type ListBlobResult = Omit<Blob, 'contentType' | 'version'>

export interface UploadedObjectInfo {
  etag: string
  versionId: string | null
}

export interface BlobStorageIterator {
  next: () => Promise<ListBlobResult[]>
  close: () => Promise<void>
}

export interface BucketInfo {
  name: string
  delete: () => Promise<void>
  list: () => Promise<BlobStorageIterator>
}

export interface StorageAdapter {
  initialize: (ctx: MeasureContext, workspaceId: WorkspaceId) => Promise<void>

  close: () => Promise<void>

  exists: (ctx: MeasureContext, workspaceId: WorkspaceId) => Promise<boolean>
  make: (ctx: MeasureContext, workspaceId: WorkspaceId) => Promise<void>
  delete: (ctx: MeasureContext, workspaceId: WorkspaceId) => Promise<void>

  listBuckets: (ctx: MeasureContext) => Promise<BucketInfo[]>
  remove: (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]) => Promise<void>
  listStream: (ctx: MeasureContext, workspaceId: WorkspaceId) => Promise<BlobStorageIterator>
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

  getUrl: (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string) => Promise<string>
}

export interface StorageAdapterEx extends StorageAdapter {
  defaultAdapter: string
  adapters?: Map<string, StorageAdapter>

  syncBlobFromStorage: (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    provider?: string
  ) => Promise<Blob>

  find: (ctx: MeasureContext, workspaceId: WorkspaceId) => StorageIterator
}

/**
 * Ad dummy storage adapter for tests
 */
export class DummyStorageAdapter implements StorageAdapter, StorageAdapterEx {
  defaultAdapter: string = ''
  async syncBlobFromStorage (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Blob> {
    throw new PlatformError(unknownError('Method not implemented'))
  }

  async initialize (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async close (): Promise<void> {}

  async exists (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<boolean> {
    return false
  }

  find (ctx: MeasureContext, workspaceId: WorkspaceId): StorageIterator {
    return {
      next: async (ctx) => [],
      close: async (ctx) => {}
    }
  }

  async listBuckets (ctx: MeasureContext): Promise<BucketInfo[]> {
    return []
  }

  async make (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async delete (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async remove (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]): Promise<void> {}

  async list (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<ListBlobResult[]> {
    return []
  }

  async listStream (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<BlobStorageIterator> {
    return {
      next: async (): Promise<ListBlobResult[]> => {
        return []
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

  async getUrl (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<string> {
    throw new Error('not implemented')
  }
}

export function createDummyStorageAdapter (): StorageAdapter {
  return new DummyStorageAdapter()
}

export async function removeAllObjects (
  ctx: MeasureContext,
  storage: StorageAdapter,
  workspaceId: WorkspaceId
): Promise<void> {
  ctx.warn('removing all objects from workspace', { workspaceId })
  // We need to list all files and delete them
  const iterator = await storage.listStream(ctx, workspaceId)
  let bulk: string[] = []
  while (true) {
    const objs = await iterator.next()
    if (objs.length === 0) {
      break
    }
    for (const obj of objs) {
      bulk.push(obj.storageId)
      if (bulk.length > 50) {
        await storage.remove(ctx, workspaceId, bulk)
        bulk = []
      }
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
  workspaceId: WorkspaceId
): Promise<ListBlobResult[]> {
  // We need to list all files and delete them
  const iterator = await storage.listStream(ctx, workspaceId)
  const bulk: ListBlobResult[] = []
  while (true) {
    const obj = await iterator.next()
    if (obj.length === 0) {
      break
    }
    bulk.push(...obj)
  }
  await iterator.close()
  return bulk
}
