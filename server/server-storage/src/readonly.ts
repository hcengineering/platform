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

import type { WorkspaceIds, Blob, MeasureContext } from '@hcengineering/core'
import type { BlobStorageIterator, BucketInfo, StorageAdapter, UploadedObjectInfo } from '@hcengineering/storage'
import { type Readable } from 'stream'

class ReadonlyError extends Error {
  constructor () {
    super('Readonly mode')
    this.name = 'ReadonlyError'
  }
}

export class ReadonlyStorageAdapter implements StorageAdapter {
  constructor (private readonly adapter: StorageAdapter) {}

  async initialize (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {
    await this.adapter.initialize(ctx, wsIds)
  }

  async close (): Promise<void> {
    await this.adapter.close()
  }

  async exists (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<boolean> {
    return await this.adapter.exists(ctx, wsIds)
  }

  async make (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {
    throw new ReadonlyError()
  }

  async listBuckets (ctx: MeasureContext): Promise<BucketInfo[]> {
    return await this.adapter.listBuckets(ctx)
  }

  async delete (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {
    throw new ReadonlyError()
  }

  async remove (ctx: MeasureContext, wsIds: WorkspaceIds, objectNames: string[]): Promise<void> {
    throw new ReadonlyError()
  }

  async listStream (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<BlobStorageIterator> {
    return await this.adapter.listStream(ctx, wsIds)
  }

  async stat (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Blob | undefined> {
    return await this.adapter.stat(ctx, wsIds, objectName)
  }

  async get (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Readable> {
    return await this.adapter.get(ctx, wsIds, objectName)
  }

  async partial (
    ctx: MeasureContext,
    wsIds: WorkspaceIds,
    objectName: string,
    offset: number,
    length?: number | undefined
  ): Promise<Readable> {
    return await this.adapter.partial(ctx, wsIds, objectName, offset, length)
  }

  async read (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Buffer[]> {
    return await this.adapter.read(ctx, wsIds, objectName)
  }

  put (
    ctx: MeasureContext,
    wsIds: WorkspaceIds,
    objectName: string,
    stream: string | Readable | Buffer,
    contentType: string,
    size?: number | undefined
  ): Promise<UploadedObjectInfo> {
    throw new ReadonlyError()
  }

  async getUrl (ctx: MeasureContext, wsIds: WorkspaceIds, name: string): Promise<string> {
    return await this.adapter.getUrl(ctx, wsIds, name)
  }
}
