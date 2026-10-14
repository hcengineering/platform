//
// Copyright © 2026 TraceX SAS.
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

import { MeasureContext, type WorkspaceIds } from '@hcengineering/core'
import { StorageAdapter } from '@hcengineering/server-core'
import { createReadStream, createWriteStream, existsSync, statSync } from 'fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, join, posix } from 'path'
import { PassThrough, Readable, Writable } from 'stream'

export class InvalidBackupFileNameError extends Error {
  constructor (path: string) {
    super('Invalid backup file name: ' + path)
    this.name = 'InvalidBackupFileNameError'
  }
}

function normalizePath (root: string, path: string): string {
  if (posix.isAbsolute(path)) {
    throw new InvalidBackupFileNameError(path)
  }

  const key = posix.normalize(posix.join(root, path))
  const prefix = root.endsWith('/') ? root : root + '/'

  if (!key.startsWith(prefix)) {
    throw new InvalidBackupFileNameError(path)
  }

  return key
}

export interface FileInfo {
  size: number
  etag: string
  contentType?: string
  lastModified: number
}

/**
 * @public
 */
export interface BackupStorage {
  loadFile: (name: string) => Promise<Buffer>
  load: (name: string) => Promise<Readable>
  write: (name: string) => Promise<Writable>

  writeFile: (name: string, data: string | Buffer | Readable) => Promise<void>
  exists: (name: string) => Promise<boolean>

  stat: (name: string) => Promise<number>

  statInfo: (name: string) => Promise<FileInfo>
  delete: (name: string) => Promise<void>

  deleteRecursive: (name: string) => Promise<void>
}

class FileStorage implements BackupStorage {
  constructor (readonly root: string) {}
  async loadFile (name: string): Promise<Buffer> {
    return await readFile(join(this.root, name))
  }

  async write (name: string): Promise<Writable> {
    const fileName = join(this.root, name)
    const dir = dirname(fileName)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    return createWriteStream(join(this.root, name))
  }

  async load (name: string): Promise<Readable> {
    return createReadStream(join(this.root, name))
  }

  async exists (name: string): Promise<boolean> {
    return existsSync(join(this.root, name))
  }

  async stat (name: string): Promise<number> {
    return statSync(join(this.root, name)).size
  }

  async statInfo (name: string): Promise<FileInfo> {
    const stat = statSync(join(this.root, name))
    return { size: stat.size, etag: stat.mtime.toUTCString(), lastModified: stat.mtime.getTime() }
  }

  async delete (name: string): Promise<void> {
    await rm(join(this.root, name))
  }

  async deleteRecursive (name: string): Promise<void> {
    // Check if folder has no files
    const files = await readdir(join(this.root, name))
    if (files.length === 0) {
      await rm(join(this.root, name), {
        recursive: true
      })
    }
  }

  async writeFile (name: string, data: string | Buffer | Readable): Promise<void> {
    const fileName = join(this.root, name)
    const dir = dirname(fileName)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    await writeFile(fileName, data as any)
  }
}

class AdapterStorage implements BackupStorage {
  constructor (
    readonly client: StorageAdapter,
    readonly wsIds: WorkspaceIds,
    readonly root: string,
    readonly ctx: MeasureContext
  ) {}

  private getFileKey (name: string): string {
    const root = posix.normalize(this.root)
    return normalizePath(root, name)
  }

  async loadFile (name: string): Promise<Buffer> {
    const data = await this.client.read(this.ctx, this.wsIds, this.getFileKey(name))
    return Buffer.concat(data)
  }

  async write (name: string): Promise<Writable> {
    const key = this.getFileKey(name)
    const wr = new PassThrough()
    void this.client.put(this.ctx, this.wsIds, key, wr, 'application/octet-stream').catch((err) => {
      wr.destroy(err instanceof Error ? err : new Error(String(err)))
    })
    return wr
  }

  async load (name: string): Promise<Readable> {
    return await this.client.get(this.ctx, this.wsIds, this.getFileKey(name))
  }

  async exists (name: string): Promise<boolean> {
    const key = this.getFileKey(name)
    try {
      return (await this.client.stat(this.ctx, this.wsIds, key)) !== undefined
    } catch (err: any) {
      return false
    }
  }

  async stat (name: string): Promise<number> {
    const key = this.getFileKey(name)
    try {
      const st = await this.client.stat(this.ctx, this.wsIds, key)
      return st?.size ?? 0
    } catch (err: any) {
      return 0
    }
  }

  async statInfo (name: string): Promise<FileInfo> {
    const key = this.getFileKey(name)
    try {
      const st = await this.client.stat(this.ctx, this.wsIds, key)
      return {
        size: st?.size ?? 0,
        etag: st?.etag ?? '',
        contentType: st?.contentType,
        lastModified: st?.modifiedOn ?? 0
      }
    } catch (err: any) {
      return { size: 0, etag: '', lastModified: 0 }
    }
  }

  async delete (name: string): Promise<void> {
    await this.client.remove(this.ctx, this.wsIds, [this.getFileKey(name)])
  }

  async deleteRecursive (name: string): Promise<void> {
    // Do not need to do anything
  }

  async writeFile (name: string, data: string | Buffer | Readable): Promise<void> {
    // TODO: add mime type detection here.
    await this.client.put(this.ctx, this.wsIds, this.getFileKey(name), data, 'application/octet-stream')
  }
}

/**
 * @public
 */
export async function createFileBackupStorage (fileName: string): Promise<BackupStorage> {
  if (!existsSync(fileName)) {
    console.log(__dirname)
    await mkdir(fileName, { recursive: true })
  }
  return new FileStorage(fileName)
}

/**
 * @public
 */
export async function createStorageBackupStorage (
  ctx: MeasureContext,
  client: StorageAdapter,
  wsIds: WorkspaceIds,
  root: string,
  check: boolean = true
): Promise<BackupStorage> {
  if (check && !(await client.exists(ctx, wsIds))) {
    await client.make(ctx, wsIds)
  }
  return new AdapterStorage(client, wsIds, root, ctx)
}
