import { createReadStream, createWriteStream, existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { Client as MinioClient } from 'minio'
import { dirname, join } from 'path'
import { PassThrough, Readable, Writable } from 'stream'

/**
 * @public
 */
export interface BackupStorage {
  loadFile: (name: string) => Promise<Buffer>
  load: (name: string) => Promise<Readable>
  write: (name: string) => Promise<Writable>
  writeFile: (name: string, data: string | Buffer) => Promise<void>
  exists: (name: string) => Promise<boolean>
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

  async writeFile (name: string, data: string | Buffer): Promise<void> {
    const fileName = join(this.root, name)
    const dir = dirname(fileName)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    await writeFile(fileName, data)
  }
}

class MinioStorage implements BackupStorage {
  constructor (readonly client: MinioClient, readonly bucketName: string, readonly root: string) {}
  async loadFile (name: string): Promise<Buffer> {
    const data = await this.client.getObject(this.bucketName, join(this.root, name))
    const chunks: Buffer[] = []

    await new Promise((resolve) => {
      data.on('readable', () => {
        let chunk
        while ((chunk = data.read()) !== null) {
          const b = chunk as Buffer
          chunks.push(b)
        }
      })

      data.on('end', () => {
        resolve(null)
      })
    })
    return Buffer.concat(chunks)
  }

  async write (name: string): Promise<Writable> {
    const wr = new PassThrough()
    void this.client.putObject(this.bucketName, join(this.root, name), wr)
    return wr
  }

  async load (name: string): Promise<Readable> {
    return await this.client.getObject(this.bucketName, join(this.root, name))
  }

  async exists (name: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, join(this.root, name))
      return true
    } catch (err) {
      return false
    }
  }

  async writeFile (name: string, data: string | Buffer): Promise<void> {
    void this.client.putObject(this.bucketName, join(this.root, name), data, data.length)
  }
}

/**
 * @public
 */
export async function createFileBackupStorage (fileName: string): Promise<BackupStorage> {
  if (!existsSync(fileName)) {
    await mkdir(fileName, { recursive: true })
  }
  return new FileStorage(fileName)
}

/**
 * @public
 */
export async function createMinioBackupStorage (
  client: MinioClient,
  bucketName: string,
  root: string
): Promise<BackupStorage> {
  if (!(await client.bucketExists(bucketName))) {
    await client.makeBucket(bucketName, 'k8s')
  }
  return new MinioStorage(client, bucketName, root)
}
