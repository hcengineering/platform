//
// Copyright © 2024 Hardcore Engineering Inc.
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

import postgres from 'postgres'
import { type MetricsContext } from './metrics'
import { type Location, type UUID } from './types'

export interface BlobDataId {
  hash: UUID
  location: Location
}

export interface BlobDataRecord extends BlobDataId {
  filename: UUID
  size: number
  type: string
}

export interface BlobId {
  workspace: string
  name: string
}

export interface BlobRecord extends BlobId {
  hash: UUID
  location: Location
  deleted: boolean
}

export interface BlobRecordWithFilename extends BlobRecord {
  filename: string
}

export async function withPostgres<T> (
  env: Env,
  ctx: ExecutionContext,
  metrics: MetricsContext,
  fn: (db: BlobDB) => Promise<T>
): Promise<T> {
  const sql = metrics.withSync('db.connect', () => {
    return postgres(env.DB_URL, {
      connection: {
        application_name: 'datalake'
      },
      fetch_types: false
    })
  })

  const db = new LoggedDB(new PostgresDB(sql), metrics)

  try {
    return await fn(db)
  } finally {
    metrics.withSync('db.disconnect', () => {
      ctx.waitUntil(sql.end({ timeout: 0 }))
    })
  }
}

export interface BlobDB {
  getData: (dataId: BlobDataId) => Promise<BlobDataRecord | null>
  createData: (data: BlobDataRecord) => Promise<void>
  getBlob: (blobId: BlobId) => Promise<BlobRecordWithFilename | null>
  createBlob: (blob: Omit<BlobRecord, 'filename' | 'deleted'>) => Promise<void>
  deleteBlob: (blob: BlobId) => Promise<void>
}

export class PostgresDB implements BlobDB {
  constructor (private readonly sql: postgres.Sql) {}

  async getData (dataId: BlobDataId): Promise<BlobDataRecord | null> {
    const { hash, location } = dataId
    const rows = await this.sql<BlobDataRecord[]>`
      SELECT hash, location, filename, size, type
      FROM blob.data
      WHERE hash = ${hash} AND location = ${location}
    `
    return rows.length > 0 ? rows[0] : null
  }

  async createData (data: BlobDataRecord): Promise<void> {
    const { hash, location, filename, size, type } = data

    await this.sql`
      UPSERT INTO blob.data (hash, location, filename, size, type)
      VALUES (${hash}, ${location}, ${filename}, ${size}, ${type})
    `
  }

  async getBlob (blobId: BlobId): Promise<BlobRecordWithFilename | null> {
    const { workspace, name } = blobId

    try {
      const rows = await this.sql<BlobRecordWithFilename[]>`
        SELECT b.workspace, b.name, b.hash, b.location, b.deleted, d.filename
        FROM blob.blob AS b
        JOIN blob.data AS d ON b.hash = d.hash AND b.location = d.location
        WHERE b.workspace = ${workspace} AND b.name = ${name}
      `

      if (rows.length > 0) {
        return rows[0]
      }
    } catch (err) {
      console.error(err)
    }

    return null
  }

  async createBlob (blob: Omit<BlobRecord, 'filename' | 'deleted'>): Promise<void> {
    const { workspace, name, hash, location } = blob

    await this.sql`
      UPSERT INTO blob.blob (workspace, name, hash, location, deleted)
      VALUES (${workspace}, ${name}, ${hash}, ${location}, false)
    `
  }

  async deleteBlob (blob: BlobId): Promise<void> {
    const { workspace, name } = blob

    await this.sql`
      UPDATE blob.blob
      SET deleted = true
      WHERE workspace = ${workspace} AND name = ${name}
    `
  }
}

export class LoggedDB implements BlobDB {
  constructor (
    private readonly db: BlobDB,
    private readonly ctx: MetricsContext
  ) {}

  async getData (dataId: BlobDataId): Promise<BlobDataRecord | null> {
    return await this.ctx.with('db.getData', () => this.db.getData(dataId))
  }

  async createData (data: BlobDataRecord): Promise<void> {
    await this.ctx.with('db.createData', () => this.db.createData(data))
  }

  async getBlob (blobId: BlobId): Promise<BlobRecordWithFilename | null> {
    return await this.ctx.with('db.getBlob', () => this.db.getBlob(blobId))
  }

  async createBlob (blob: Omit<BlobRecord, 'filename' | 'deleted'>): Promise<void> {
    await this.ctx.with('db.createBlob', () => this.db.createBlob(blob))
  }

  async deleteBlob (blob: BlobId): Promise<void> {
    await this.ctx.with('db.deleteBlob', () => this.db.deleteBlob(blob))
  }
}
