import core, {
  WorkspaceIds,
  WorkspaceUuid,
  type Blob,
  type MeasureContext,
  type WorkspaceDataId
} from '@hcengineering/core'
import { getDataId } from '@hcengineering/server-core'
import type { BlobStorageIterator, BucketInfo, StorageAdapter, UploadedObjectInfo } from '@hcengineering/storage'
import { Readable } from 'stream'

export class MemStorageAdapter implements StorageAdapter {
  files = new Map<string, Blob & { content: Buffer, workspace: WorkspaceDataId }>()

  async initialize (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {}

  async close (): Promise<void> {}

  async exists (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<boolean> {
    return true
  }

  async make (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {}

  async delete (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {}

  async listBuckets (ctx: MeasureContext): Promise<BucketInfo[]> {
    const workspaces = new Set(Array.from(this.files.values()).map((it) => it.workspace))
    return Array.from(workspaces).map((it) => ({
      name: it,
      delete: async () => {
        await this.delete(ctx, {
          uuid: it as unknown as WorkspaceUuid,
          dataId: it,
          url: ''
        })
      },
      list: () =>
        this.listStream(ctx, {
          uuid: it as unknown as WorkspaceUuid,
          dataId: it,
          url: ''
        })
    }))
  }

  async remove (ctx: MeasureContext, wsIds: WorkspaceIds, objectNames: string[]): Promise<void> {
    for (const k of objectNames) {
      this.files.delete(getDataId(wsIds) + '/' + k)
    }
  }

  async listStream (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<BlobStorageIterator> {
    const files = Array.from(this.files.values()).filter((it) => it.workspace === getDataId(wsIds))
    return {
      next: async () => {
        return files.splice(0, 100)
      },
      close: async () => {}
    }
  }

  async stat (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Blob | undefined> {
    return this.files.get(getDataId(wsIds) + '/' + objectName)
  }

  async get (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Readable> {
    const readable = new Readable()
    readable._read = () => {}
    const content = this.files.get(getDataId(wsIds) + '/' + objectName)?.content
    readable.push(content)
    readable.push(null)
    return readable
  }

  async put (
    ctx: MeasureContext,
    wsIds: WorkspaceIds,
    objectName: string,
    stream: string | Readable | Buffer,
    contentType: string,
    size?: number | undefined
  ): Promise<UploadedObjectInfo> {
    const buffer: Buffer[] = []
    if (stream instanceof Buffer) {
      buffer.push(stream)
    } else if (typeof stream === 'string') {
      buffer.push(Buffer.from(stream))
    } else if (stream instanceof Readable) {
      await new Promise<void>((resolve, reject) => {
        stream.on('end', () => {
          resolve()
        })
        stream.on('error', (error) => {
          reject(error)
        })
        stream.on('data', (data) => {
          buffer.push(data)
          resolve()
        })
      })
    }
    const data = Buffer.concat(buffer)
    const dataId = getDataId(wsIds)
    const dta = {
      _class: core.class.Blob,
      _id: objectName as any,
      contentType,
      size: data.length,
      content: data,
      etag: objectName,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      provider: '_test',
      space: '' as any,
      version: null,
      workspace: dataId
    }
    this.files.set(dataId + '/' + objectName, dta)
    return {
      etag: objectName,
      versionId: null
    }
  }

  async read (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Buffer> {
    const content = this.files.get(getDataId(wsIds) + '/' + objectName)?.content
    if (content === undefined) {
      throw new Error('NoSuchKey')
    }
    return content
  }

  partial (
    ctx: MeasureContext,
    wsIds: WorkspaceIds,
    objectName: string,
    offset: number,
    length?: number | undefined
  ): Promise<Readable> {
    // Partial are not supported by
    throw new Error('NoSuchKey')
  }

  async getUrl (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<string> {
    return '/files/' + objectName
  }
}
