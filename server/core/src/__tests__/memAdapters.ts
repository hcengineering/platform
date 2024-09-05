import core, {
  Hierarchy,
  ModelDb,
  TxProcessor,
  toFindResult,
  type Blob,
  type Class,
  type Doc,
  type DocumentQuery,
  type DocumentUpdate,
  type Domain,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type Ref,
  type WorkspaceId
} from '@hcengineering/core'
import { genMinModel } from '@hcengineering/core/src/__tests__/minmodel'
import type { BlobStorageIterator, BucketInfo, StorageAdapter, UploadedObjectInfo } from '@hcengineering/storage'
import { Readable } from 'stream'
import type { RawDBAdapter, RawDBAdapterStream } from '../adapter'

export class MemStorageAdapter implements StorageAdapter {
  files = new Map<string, Blob & { content: Buffer, workspace: string }>()

  async initialize (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async close (): Promise<void> {}

  async exists (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<boolean> {
    return true
  }

  async make (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async delete (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async listBuckets (ctx: MeasureContext): Promise<BucketInfo[]> {
    const workspaces = new Set(Array.from(this.files.values()).map((it) => it.workspace))
    return Array.from(workspaces).map((it) => ({
      name: it,
      delete: async () => {
        await this.delete(ctx, { name: it })
      },
      list: () => this.listStream(ctx, { name: it })
    }))
  }

  async remove (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]): Promise<void> {
    for (const k of objectNames) {
      this.files.delete(workspaceId.name + '/' + k)
    }
  }

  async listStream (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<BlobStorageIterator> {
    const files = Array.from(this.files.values()).filter((it) => it.workspace === workspaceId.name)
    return {
      next: async () => {
        return files.shift()
      },
      close: async () => {}
    }
  }

  async stat (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Blob | undefined> {
    return this.files.get(workspaceId.name + '/' + objectName)
  }

  async get (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Readable> {
    const readable = new Readable()
    readable._read = () => {}
    const content = this.files.get(workspaceId.name + '/' + objectName)?.content
    readable.push(content)
    readable.push(null)
    return readable
  }

  async put (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
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
    } else {
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
      storageId: objectName,
      version: null,
      workspace: workspaceId.name
    }
    this.files.set(workspaceId.name + '/' + objectName, dta)
    return {
      etag: objectName,
      versionId: null
    }
  }

  async read (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Buffer[]> {
    const content = this.files.get(workspaceId.name + '/' + objectName)?.content
    if (content === undefined) {
      throw new Error('NoSuchKey')
    }
    return [content]
  }

  partial (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    offset: number,
    length?: number | undefined
  ): Promise<Readable> {
    // Partial are not supported by
    throw new Error('NoSuchKey')
  }

  async getUrl (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<string> {
    return '/files/' + objectName
  }
}

export class MemRawDBAdapter implements RawDBAdapter {
  hierarchy: Hierarchy
  workspaces = new Map<string, ModelDb>()
  constructor () {
    this.hierarchy = new Hierarchy()
    const minModel = genMinModel()
    minModel.forEach((it) => {
      this.hierarchy.tx(it)
    })
  }

  async find<T extends Doc>(
    ctx: MeasureContext,
    workspace: WorkspaceId,
    domain: Domain,
    query: DocumentQuery<T>,
    options?: Omit<FindOptions<T>, 'projection' | 'lookup'>
  ): Promise<FindResult<T>> {
    const db = this.workspaces.get(workspace.name)
    if (db === undefined) {
      return toFindResult([])
    }
    return await db.findAll(core.class.Blob as Ref<Class<T>>, query, options)
  }

  async findStream<T extends Doc>(
    ctx: MeasureContext,
    workspace: WorkspaceId,
    domain: Domain,
    query: DocumentQuery<T>,
    options?: Omit<FindOptions<T>, 'projection' | 'lookup'>
  ): Promise<RawDBAdapterStream<T>> {
    const db = this.workspaces.get(workspace.name)

    let result: T[] = []
    if (db !== undefined) {
      result = await db.findAll(core.class.Blob as Ref<Class<T>>, query, options)
    }
    return {
      next: async () => {
        const doc = result.shift()
        return doc
      },
      close: async () => {}
    }
  }

  async upload<T extends Doc>(ctx: MeasureContext, workspace: WorkspaceId, domain: Domain, docs: T[]): Promise<void> {
    let db = this.workspaces.get(workspace.name)
    if (db === undefined) {
      db = new ModelDb(this.hierarchy)
      this.workspaces.set(workspace.name, db)
    }
    for (const d of docs) {
      db.addDoc(d)
    }
  }

  async update<T extends Doc>(
    ctx: MeasureContext,
    workspace: WorkspaceId,
    domain: Domain,
    docs: Map<Ref<T>, DocumentUpdate<T>>
  ): Promise<void> {
    let db = this.workspaces.get(workspace.name)
    if (db === undefined) {
      db = new ModelDb(this.hierarchy)
      this.workspaces.set(workspace.name, db)
    }
    for (const [du, upd] of docs.entries()) {
      const doc = db.getObject(du)
      TxProcessor.applyUpdate<T>(doc, upd)
    }
  }

  async clean<T extends Doc>(
    ctx: MeasureContext,
    workspace: WorkspaceId,
    domain: Domain,
    docs: Ref<T>[]
  ): Promise<void> {
    const db = this.workspaces.get(workspace.name)
    if (db === undefined) {
      return
    }
    for (const d of docs) {
      db.delDoc(d)
    }
  }

  async close (): Promise<void> {}
}
