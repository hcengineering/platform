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
import { measure, measureSync } from './measure'
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
  fn: (sql: postgres.Sql) => Promise<T>
): Promise<T> {
  const sql = measureSync('db.connect', () => {
    return postgres(env.HYPERDRIVE.connectionString)
  })
  try {
    return await fn(sql)
  } finally {
    measureSync('db.close', () => {
      ctx.waitUntil(sql.end({ timeout: 0 }))
    })
  }
}

export interface BlobDB {
  getData: (sql: postgres.Sql, dataId: BlobDataId) => Promise<BlobDataRecord | null>
  createData: (sql: postgres.Sql, data: BlobDataRecord) => Promise<void>
  getBlob: (sql: postgres.Sql, blobId: BlobId) => Promise<BlobRecordWithFilename | null>
  createBlob: (sql: postgres.Sql, blob: Omit<BlobRecord, 'filename' | 'deleted'>) => Promise<void>
  deleteBlob: (sql: postgres.Sql, blob: BlobId) => Promise<void>
}

const db: BlobDB = {
  async getData (sql: postgres.Sql, dataId: BlobDataId): Promise<BlobDataRecord | null> {
    const { hash, location } = dataId
    const rows = await sql<BlobDataRecord[]>`
      SELECT hash, location, filename, size, type
      FROM blob.data
      WHERE hash = ${hash} AND location = ${location}
    `
    return rows.length > 0 ? rows[0] : null
  },

  async createData (sql: postgres.Sql, data: BlobDataRecord): Promise<void> {
    const { hash, location, filename, size, type } = data

    await sql`
      UPSERT INTO blob.data (hash, location, filename, size, type)
      VALUES (${hash}, ${location}, ${filename}, ${size}, ${type})
    `
  },

  async getBlob (sql: postgres.Sql, blobId: BlobId): Promise<BlobRecordWithFilename | null> {
    const { workspace, name } = blobId

    const rows = await sql<BlobRecordWithFilename[]>`
      SELECT b.workspace, b.name, b.hash, b.location, b.deleted, d.filename
      FROM blob.blob AS b
      JOIN blob.data AS d ON b.hash = d.hash AND b.location = d.location
      WHERE b.workspace = ${workspace} AND b.name = ${name}
    `

    if (rows.length > 0) {
      return rows[0]
    }

    return null
  },

  async createBlob (sql: postgres.Sql, blob: Omit<BlobRecord, 'filename' | 'deleted'>): Promise<void> {
    const { workspace, name, hash, location } = blob

    await sql`
      UPSERT INTO blob.blob (workspace, name, hash, location, deleted)
      VALUES (${workspace}, ${name}, ${hash}, ${location}, false)
    `
  },

  async deleteBlob (sql: postgres.Sql, blob: BlobId): Promise<void> {
    const { workspace, name } = blob

    await sql`
      UPDATE blob.blob
      SET deleted = true
      WHERE workspace = ${workspace} AND name = ${name}
    `
  }
}

export const measuredDb: BlobDB = {
  getData: (sql, dataId) => measure('db.getData', () => db.getData(sql, dataId)),
  createData: (sql, data) => measure('db.createData', () => db.createData(sql, data)),
  getBlob: (sql, blobId) => measure('db.getBlob', () => db.getBlob(sql, blobId)),
  createBlob: (sql, blob) => measure('db.createBlob', () => db.createBlob(sql, blob)),
  deleteBlob: (sql, blob) => measure('db.deleteBlob', () => db.deleteBlob(sql, blob))
}

export default measuredDb
