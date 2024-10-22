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

import type postgres from 'postgres'
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

export async function getData (sql: postgres.Sql, dataId: BlobDataId): Promise<BlobDataRecord | null> {
  const { hash, location } = dataId

  const rows = await sql<BlobDataRecord[]>`
    SELECT hash, location, filename, size, type
    FROM blob.data
    WHERE hash = ${hash} AND location = ${location}
  `

  if (rows.length > 0) {
    return rows[0]
  }

  return null
}

export async function createData (sql: postgres.Sql, data: BlobDataRecord): Promise<void> {
  const { hash, location, filename, size, type } = data

  await sql`
    UPSERT INTO blob.data (hash, location, filename, size, type)
    VALUES (${hash}, ${location}, ${filename}, ${size}, ${type})
  `
}

export async function getBlob (sql: postgres.Sql, blobId: BlobId): Promise<BlobRecordWithFilename | null> {
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
}

export async function createBlob (sql: postgres.Sql, blob: Omit<BlobRecord, 'filename' | 'deleted'>): Promise<void> {
  const { workspace, name, hash, location } = blob

  await sql`
    UPSERT INTO blob.blob (workspace, name, hash, location, deleted)
    VALUES (${workspace}, ${name}, ${hash}, ${location}, false)
  `
}

export async function deleteBlob (sql: postgres.Sql, blob: BlobId): Promise<void> {
  const { workspace, name } = blob

  await sql`
    UPDATE blob.blob
    SET deleted = true
    WHERE workspace = ${workspace} AND name = ${name}
  `
}
