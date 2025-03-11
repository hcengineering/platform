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

import { MeasureContext } from '@hcengineering/core'
import postgres, { type Row } from 'postgres'
import { type Location, type UUID } from './types'
import { type RetryOptions, retry } from './retry'

export interface BlobDataId {
  hash: UUID
  location: Location
}

export interface BlobDataRecord extends BlobDataId {
  filename: string
  size: number
  type: string
}

export interface BlobId {
  workspace: string
  name: string
}
export interface BlobIds {
  workspace: string
  names: string[]
}

export interface BlobRecord extends BlobId {
  hash: UUID
  location: Location
  parent?: string
}

export type BlobWithDataRecord = BlobRecord & BlobDataRecord

export interface ListBlobResult {
  cursor: string | undefined
  blobs: BlobWithDataRecord[]
}

export interface StatsResult {
  workspaces: number
  blob: {
    count: number
    size: number
  }
  data: {
    count: number
    size: number
  }
}
export interface WorkspaceStatsResult {
  count: number
  size: number
}

export function createDb (ctx: MeasureContext, connectionString: string): BlobDB {
  const sql = postgres(connectionString, {
    max: 5,
    connection: {
      application_name: 'datalake'
    },
    fetch_types: false,
    prepare: false,
    types: {
      // https://jdbc.postgresql.org/documentation/publicapi/constant-values.html
      int8: {
        to: 0,
        from: [20],
        serialize: (value: string) => value.toString(),
        parse: (value: number) => Number(value)
      }
    }
  })

  const dbAdapter = new PostgresDBAdapter(sql)
  return new LoggedDB(ctx, new PostgresDB(new RetryDBAdapter(dbAdapter, { retries: 5 })))
}

export interface BlobDB {
  getData: (ctx: MeasureContext, dataId: BlobDataId) => Promise<BlobDataRecord | null>
  getBlob: (ctx: MeasureContext, blobId: BlobId) => Promise<BlobWithDataRecord | null>
  listBlobs: (ctx: MeasureContext, workspace: string, cursor?: string, limit?: number) => Promise<ListBlobResult>
  createData: (ctx: MeasureContext, data: BlobDataRecord) => Promise<void>
  createBlob: (ctx: MeasureContext, blob: Omit<BlobRecord, 'filename'>) => Promise<void>
  createBlobData: (ctx: MeasureContext, blob: BlobWithDataRecord) => Promise<void>
  deleteBlob: (ctx: MeasureContext, blob: BlobId) => Promise<void>
  setParent: (ctx: MeasureContext, blob: BlobId, parent: BlobId | null) => Promise<void>
  deleteBlobList: (ctx: MeasureContext, list: BlobIds) => Promise<void>
  getStats: (ctx: MeasureContext) => Promise<StatsResult>
  getWorkspaceStats: (ctx: MeasureContext, workspace: string) => Promise<WorkspaceStatsResult>
}

interface DBAdapter {
  execute: <T extends any[] = (Row & Iterable<Row>)[]>(query: string, params?: any[]) => Promise<T>
}

class RetryDBAdapter implements DBAdapter {
  constructor (
    private readonly db: DBAdapter,
    private readonly options: RetryOptions
  ) {}

  async execute<T extends any[] = (Row & Iterable<Row>)[]>(query: string, params?: any[]): Promise<T> {
    return await retry(() => this.db.execute(query, params), this.options)
  }
}

class PostgresDBAdapter implements DBAdapter {
  constructor (private readonly sql: postgres.Sql) {}

  async execute<T extends any[] = (Row & Iterable<Row>)[]>(query: string, params?: any[]): Promise<T> {
    query = params !== undefined && params.length > 0 ? injectVars(query, params) : query
    return await this.sql.unsafe<T>(query)
  }
}

export class PostgresDB implements BlobDB {
  constructor (private readonly db: DBAdapter) {}

  async getData (ctx: MeasureContext, dataId: BlobDataId): Promise<BlobDataRecord | null> {
    const { hash, location } = dataId

    const rows = await this.db.execute<BlobDataRecord[]>(
      `
      SELECT hash, location, filename, size, type
      FROM blob.data
      WHERE hash = $1 AND location = $2
    `,
      [hash, location]
    )

    return rows.length > 0 ? rows[0] : null
  }

  async deleteBlobList (ctx: MeasureContext, blobList: BlobIds): Promise<void> {
    const { workspace, names } = blobList

    await this.db.execute(
      `
      UPDATE blob.blob
      SET deleted_at = now()
      WHERE workspace = $1 AND name = ANY($2)
    `,
      [workspace, names]
    )
  }

  async getBlob (ctx: MeasureContext, blobId: BlobId): Promise<BlobWithDataRecord | null> {
    const { workspace, name } = blobId

    const rows = await this.db.execute<BlobWithDataRecord[]>(
      `
      SELECT b.workspace, b.name, b.hash, b.location, b.parent, d.filename, d.size, d.type
      FROM blob.blob AS b
      JOIN blob.data AS d ON b.hash = d.hash AND b.location = d.location
      WHERE b.workspace = $1 AND b.name = $2 and b.deleted_at IS NULL
    `,
      [workspace, name]
    )

    if (rows.length > 0) {
      return rows[0]
    }

    return null
  }

  async listBlobs (ctx: MeasureContext, workspace: string, cursor?: string, limit?: number): Promise<ListBlobResult> {
    cursor = cursor ?? ''
    limit = Math.min(limit ?? 100, 1000)

    const rows = await this.db.execute<BlobWithDataRecord[]>(
      `
      SELECT b.workspace, b.name, b.hash, b.location, b.parent, b.deleted_at, d.filename, d.size, d.type
      FROM blob.blob AS b
      JOIN blob.data AS d ON b.hash = d.hash AND b.location = d.location
      WHERE b.workspace = $1 AND b.name > $2 AND b.deleted_at IS NULL
      ORDER BY b.workspace, b.name
      LIMIT $3
    `,
      [workspace, cursor, limit]
    )

    return {
      cursor: rows.length > 0 && rows.length === limit ? rows[rows.length - 1].name : undefined,
      blobs: rows
    }
  }

  async createBlob (ctx: MeasureContext, blob: Omit<BlobRecord, 'filename'>): Promise<void> {
    const { workspace, name, hash, location, parent } = blob

    await this.db.execute(
      `
      UPSERT INTO blob.blob (workspace, name, hash, location, parent, deleted_at)
      VALUES ($1, $2, $3, $4, $5, NULL)
    `,
      [workspace, name, hash, location, parent]
    )
  }

  async createData (ctx: MeasureContext, data: BlobDataRecord): Promise<void> {
    const { hash, location, filename, size, type } = data

    await this.db.execute(
      `
      UPSERT INTO blob.data (hash, location, filename, size, type)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [hash, location, filename, size, type]
    )
  }

  async createBlobData (ctx: MeasureContext, data: BlobWithDataRecord): Promise<void> {
    const { workspace, name, hash, location, parent, filename, size, type } = data

    await this.db.execute(
      `
      UPSERT INTO blob.data (hash, location, filename, size, type)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [hash, location, filename, size, type]
    )

    await this.db.execute(
      `
      UPSERT INTO blob.blob (workspace, name, hash, location, parent, deleted_at)
      VALUES ($1, $2, $3, $4, $5, NULL)
    `,
      [workspace, name, hash, location, parent]
    )
  }

  async deleteBlob (ctx: MeasureContext, blob: BlobId): Promise<void> {
    const { workspace, name } = blob

    const blobs = new Set<BlobId['name']>()
    let queue: Array<BlobId['name']> = []

    blobs.add(name)
    queue.push(name)

    while (queue.length > 0) {
      const children = await this.db.execute<BlobId[]>(
        `
        SELECT blob.workspace, blob.name
        FROM blob.blob
        WHERE workspace = $1 AND parent = ANY($2) AND deleted_at IS NULL
      `,
        [workspace, queue]
      )

      queue = []
      for (const child of children) {
        if (blobs.has(child.name)) {
          continue
        }
        queue.push(child.name)
        blobs.add(child.name)
      }
    }

    await this.db.execute(
      `
      UPDATE blob.blob
      SET deleted_at = now()
      WHERE workspace = $1 AND name = ANY($2) AND deleted_at IS NULL
    `,
      [workspace, [...blobs]]
    )
  }

  async setParent (ctx: MeasureContext, blob: BlobId, parent: BlobId | null): Promise<void> {
    const { workspace, name } = blob

    await this.db.execute(
      `
      UPDATE blob.blob
      SET parent = $3
      WHERE workspace = $1 AND name = $2
    `,
      [workspace, name, parent?.name]
    )
  }

  async getStats (ctx: MeasureContext): Promise<StatsResult> {
    const blobStatsRows = await this.db.execute(`
      SELECT count(distinct b.workspace) as workspaces, count(1) as count, sum(d.size) as size
      FROM blob.blob b
      JOIN blob.data AS d ON b.hash = d.hash AND b.location = d.location
      WHERE deleted_at IS NULL
    `)

    const dataStatsRows = await this.db.execute(`
      SELECT count(1) as count, sum(d.size) as size
      FROM blob.data AS d
    `)

    const blobStats = blobStatsRows[0]
    const dataStats = dataStatsRows[0]

    return {
      workspaces: parseInt(blobStats.workspaces ?? 0),
      blob: {
        count: parseInt(blobStats.count ?? 0),
        size: parseInt(blobStats.size ?? 0)
      },
      data: {
        count: parseInt(dataStats.count ?? 0),
        size: parseInt(dataStats.size ?? 0)
      }
    }
  }

  async getWorkspaceStats (ctx: MeasureContext, workspace: string): Promise<WorkspaceStatsResult> {
    const rows = await this.db.execute(
      `
      SELECT count(1) as count, sum(d.size) as size
      FROM blob.blob b
      JOIN blob.data AS d ON b.hash = d.hash AND b.location = d.location
      WHERE workspace = $1 and deleted_at IS NULL
    `,
      [workspace]
    )

    const stats = rows[0]

    return {
      count: parseInt(stats.count ?? 0),
      size: parseInt(stats.size ?? 0)
    }
  }
}

export class LoggedDB implements BlobDB {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly db: BlobDB
  ) {}

  async getData (ctx: MeasureContext, dataId: BlobDataId): Promise<BlobDataRecord | null> {
    return await ctx.with('db.getData', {}, () => this.db.getData(this.ctx, dataId))
  }

  async getBlob (ctx: MeasureContext, blobId: BlobId): Promise<BlobWithDataRecord | null> {
    return await ctx.with('db.getBlob', {}, () => this.db.getBlob(this.ctx, blobId))
  }

  async listBlobs (ctx: MeasureContext, workspace: string, cursor?: string, limit?: number): Promise<ListBlobResult> {
    return await ctx.with('db.listBlobs', {}, () => this.db.listBlobs(this.ctx, workspace, cursor, limit))
  }

  async createData (ctx: MeasureContext, data: BlobDataRecord): Promise<void> {
    await ctx.with('db.createData', {}, () => this.db.createData(this.ctx, data))
  }

  async createBlob (ctx: MeasureContext, blob: Omit<BlobRecord, 'filename'>): Promise<void> {
    await ctx.with('db.createBlob', {}, () => this.db.createBlob(this.ctx, blob))
  }

  async createBlobData (ctx: MeasureContext, data: BlobWithDataRecord): Promise<void> {
    await ctx.with('db.createBlobData', {}, () => this.db.createBlobData(this.ctx, data))
  }

  async deleteBlobList (ctx: MeasureContext, blobs: BlobIds): Promise<void> {
    await ctx.with('db.deleteBlobList', {}, () => this.db.deleteBlobList(this.ctx, blobs))
  }

  async deleteBlob (ctx: MeasureContext, blob: BlobId): Promise<void> {
    await ctx.with('db.deleteBlob', {}, () => this.db.deleteBlob(this.ctx, blob))
  }

  async setParent (ctx: MeasureContext, blob: BlobId, parent: BlobId | null): Promise<void> {
    await ctx.with('db.setParent', {}, () => this.db.setParent(this.ctx, blob, parent))
  }

  async getStats (ctx: MeasureContext): Promise<StatsResult> {
    return await ctx.with('db.getStats', {}, () => this.db.getStats(this.ctx))
  }

  async getWorkspaceStats (ctx: MeasureContext, workspace: string): Promise<WorkspaceStatsResult> {
    return await ctx.with('db.getWorkspaceStats', {}, () => this.db.getWorkspaceStats(this.ctx, workspace))
  }
}

export function injectVars (sql: string, values: any[]): string {
  return sql.replaceAll(/(\$\d+)/g, (_, idx) => {
    return escape(values[parseInt(idx.substring(1)) - 1])
  })
}

export function escape (value: any): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  if (Array.isArray(value)) {
    return 'ARRAY[' + value.map(escape).join(',') + ']'
  }

  switch (typeof value) {
    case 'number':
      if (isNaN(value) || !isFinite(value)) {
        throw new Error('Invalid number value')
      }
      return value.toString()
    case 'boolean':
      return value ? 'TRUE' : 'FALSE'
    case 'string':
      return `'${value.replace(/'/g, "''")}'`
    default:
      throw new Error(`Unsupported value type: ${typeof value}`)
  }
}
