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
import postgres, { Sql, type Row } from 'postgres'
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

export type BlobMeta = Record<string, any>

export interface BlobMetaRecord extends BlobId {
  meta: BlobMeta
}

export type BlobWithDataRecord = BlobRecord & BlobDataRecord

export interface ListBlobOptions {
  cursor?: string
  limit?: number
  derived?: boolean
}

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

export async function createDb (ctx: MeasureContext, connectionString: string): Promise<BlobDB> {
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

  const db = await PostgresDB.create(ctx, sql)
  return new LoggedDB(ctx, new RetryDB(db, { retries: 5 }))
}

export interface BlobDB {
  getData: (ctx: MeasureContext, dataId: BlobDataId) => Promise<BlobDataRecord | null>
  getBlob: (ctx: MeasureContext, blobId: BlobId) => Promise<BlobWithDataRecord | null>
  listBlobs: (ctx: MeasureContext, workspace: string, options: ListBlobOptions) => Promise<ListBlobResult>
  createData: (ctx: MeasureContext, data: BlobDataRecord) => Promise<void>
  createBlob: (ctx: MeasureContext, blob: Omit<BlobRecord, 'filename'>) => Promise<void>
  createBlobData: (ctx: MeasureContext, blob: BlobWithDataRecord) => Promise<void>
  deleteBlob: (ctx: MeasureContext, blob: BlobId) => Promise<void>
  getMeta: (ctx: MeasureContext, blobId: BlobId) => Promise<BlobMeta | null>
  setMeta: (ctx: MeasureContext, blobId: BlobId, meta: BlobMeta) => Promise<void>
  setParent: (ctx: MeasureContext, blob: BlobId, parent: BlobId | null) => Promise<void>
  deleteBlobList: (ctx: MeasureContext, list: BlobIds) => Promise<void>
  getStats: (ctx: MeasureContext) => Promise<StatsResult>
  getWorkspaceStats: (ctx: MeasureContext, workspace: string) => Promise<WorkspaceStatsResult>
}

export class PostgresDB implements BlobDB {
  private constructor (private readonly sql: Sql) {}

  static async create (ctx: MeasureContext, sql: Sql): Promise<PostgresDB> {
    const db = new PostgresDB(sql)
    await db.initSchema(ctx)
    return db
  }

  async execute<T extends any[] = (Row & Iterable<Row>)[]>(query: string, params?: any[]): Promise<T> {
    query = params !== undefined && params.length > 0 ? injectVars(query, params) : query
    return await this.sql.unsafe<T>(query)
  }

  async initSchema (ctx: MeasureContext): Promise<void> {
    await this.execute('CREATE SCHEMA IF NOT EXISTS blob')
    await this.execute(`CREATE TABLE IF NOT EXISTS blob.migrations
      (
          name       VARCHAR(255) NOT NULL,
          created_on TIMESTAMP    NOT NULL DEFAULT now()
      )`)

    const appliedMigrations = (await this.execute<Row[]>('SELECT name FROM blob.migrations')).map((row) => row.name)
    ctx.info('applied migrations', { migrations: appliedMigrations })

    for (const [name, sql] of getMigrations()) {
      if (appliedMigrations.includes(name)) {
        continue
      }

      try {
        ctx.warn('applying migration', { migration: name })
        await this.execute(sql)
        await this.execute('INSERT INTO blob.migrations (name) VALUES ($1)', [name])
      } catch (err: any) {
        ctx.error('failed to apply migration', { migration: name, error: err })
        throw err
      }
    }
  }

  async getData (ctx: MeasureContext, dataId: BlobDataId): Promise<BlobDataRecord | null> {
    const { hash, location } = dataId

    const rows = await this.execute<BlobDataRecord[]>(
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

    await this.execute(
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

    const rows = await this.execute<BlobWithDataRecord[]>(
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

  async listBlobs (ctx: MeasureContext, workspace: string, options: ListBlobOptions): Promise<ListBlobResult> {
    let { cursor, limit, derived } = options
    cursor = cursor ?? ''
    limit = Math.min(limit ?? 100, 1000)

    const rows = await this.execute<BlobWithDataRecord[]>(
      `
      SELECT b.workspace, b.name, b.hash, b.location, b.parent, b.deleted_at, d.filename, d.size, d.type
      FROM blob.blob AS b
      JOIN blob.data AS d ON b.hash = d.hash AND b.location = d.location
      WHERE b.workspace = $1 AND b.name > $2 AND b.deleted_at IS NULL ${derived !== true ? 'AND b.parent IS NULL' : ''}
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

    await this.execute(
      `
      UPSERT INTO blob.blob (workspace, name, hash, location, parent, deleted_at)
      VALUES ($1, $2, $3, $4, $5, NULL)
    `,
      [workspace, name, hash, location, parent]
    )
  }

  async createData (ctx: MeasureContext, data: BlobDataRecord): Promise<void> {
    const { hash, location, filename, size, type } = data

    await this.execute(
      `
      UPSERT INTO blob.data (hash, location, filename, size, type)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [hash, location, filename, size, type]
    )
  }

  async createBlobData (ctx: MeasureContext, data: BlobWithDataRecord): Promise<void> {
    const { workspace, name, hash, location, parent, filename, size, type } = data

    await this.execute(
      `
      UPSERT INTO blob.data (hash, location, filename, size, type)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [hash, location, filename, size, type]
    )

    await this.execute(
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
      const children = await this.execute<BlobId[]>(
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

    await this.execute(
      `
      UPDATE blob.blob
      SET deleted_at = now()
      WHERE workspace = $1 AND name = ANY($2) AND deleted_at IS NULL
    `,
      [workspace, [...blobs]]
    )
  }

  async getMeta (ctx: MeasureContext, blobId: BlobId): Promise<BlobMeta | null> {
    const { workspace, name } = blobId

    const rows = await this.execute<BlobMetaRecord[]>(
      `
      SELECT m.workspace, m.name, m.meta
      FROM blob.blob b
      LEFT JOIN blob.meta as m ON m.workspace = b.workspace AND m.name = b.name
      WHERE b.workspace = $1 AND b.name = $2 and b.deleted_at IS NULL
    `,
      [workspace, name]
    )

    return rows.length > 0 ? rows[0].meta ?? {} : null
  }

  async setMeta (ctx: MeasureContext, blobId: BlobId, meta: BlobMeta): Promise<void> {
    const { workspace, name } = blobId

    await this.execute(
      `
      UPSERT INTO blob.meta (workspace, name, meta)
      VALUES ($1, $2, $3)
    `,
      [workspace, name, meta]
    )
  }

  async setParent (ctx: MeasureContext, blob: BlobId, parent: BlobId | null): Promise<void> {
    const { workspace, name } = blob

    await this.execute(
      `
      UPDATE blob.blob
      SET parent = $3
      WHERE workspace = $1 AND name = $2
    `,
      [workspace, name, parent?.name]
    )
  }

  async getStats (ctx: MeasureContext): Promise<StatsResult> {
    const blobStatsRows = await this.execute(`
      SELECT count(distinct b.workspace) as workspaces, count(1) as count, sum(d.size) as size
      FROM blob.blob b
      JOIN blob.data AS d ON b.hash = d.hash AND b.location = d.location
      WHERE deleted_at IS NULL
    `)

    const dataStatsRows = await this.execute(`
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
    const rows = await this.execute(
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

export class RetryDB implements BlobDB {
  constructor (
    private readonly db: BlobDB,
    private readonly options: RetryOptions
  ) {}

  async getData (ctx: MeasureContext, dataId: BlobDataId): Promise<BlobDataRecord | null> {
    return await retry(() => this.db.getData(ctx, dataId), this.options)
  }

  async getBlob (ctx: MeasureContext, blobId: BlobId): Promise<BlobWithDataRecord | null> {
    return await retry(() => this.db.getBlob(ctx, blobId), this.options)
  }

  async listBlobs (ctx: MeasureContext, workspace: string, options: ListBlobOptions): Promise<ListBlobResult> {
    return await retry(() => this.db.listBlobs(ctx, workspace, options), this.options)
  }

  async createData (ctx: MeasureContext, data: BlobDataRecord): Promise<void> {
    await retry(() => this.db.createData(ctx, data), this.options)
  }

  async createBlob (ctx: MeasureContext, blob: Omit<BlobRecord, 'filename'>): Promise<void> {
    await retry(() => this.db.createBlob(ctx, blob), this.options)
  }

  async createBlobData (ctx: MeasureContext, data: BlobWithDataRecord): Promise<void> {
    await retry(() => this.db.createBlobData(ctx, data), this.options)
  }

  async deleteBlobList (ctx: MeasureContext, blobs: BlobIds): Promise<void> {
    await retry(() => this.db.deleteBlobList(ctx, blobs), this.options)
  }

  async deleteBlob (ctx: MeasureContext, blob: BlobId): Promise<void> {
    await retry(() => this.db.deleteBlob(ctx, blob), this.options)
  }

  async getMeta (ctx: MeasureContext, blobId: BlobId): Promise<BlobMeta | null> {
    return await retry(() => this.db.getMeta(ctx, blobId), this.options)
  }

  async setMeta (ctx: MeasureContext, blobId: BlobId, meta: BlobMeta): Promise<void> {
    await retry(() => this.db.setMeta(ctx, blobId, meta), this.options)
  }

  async setParent (ctx: MeasureContext, blob: BlobId, parent: BlobId | null): Promise<void> {
    await retry(() => this.db.setParent(ctx, blob, parent), this.options)
  }

  async getStats (ctx: MeasureContext): Promise<StatsResult> {
    return await retry(() => this.db.getStats(ctx), this.options)
  }

  async getWorkspaceStats (ctx: MeasureContext, workspace: string): Promise<WorkspaceStatsResult> {
    return await retry(() => this.db.getWorkspaceStats(ctx, workspace), this.options)
  }
}

export class LoggedDB implements BlobDB {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly db: BlobDB
  ) {}

  async getData (ctx: MeasureContext, dataId: BlobDataId): Promise<BlobDataRecord | null> {
    const params = { location: dataId.location }
    return await ctx.with('db.getData', {}, () => this.db.getData(this.ctx, dataId), params)
  }

  async getBlob (ctx: MeasureContext, blobId: BlobId): Promise<BlobWithDataRecord | null> {
    const params = { workspace: blobId.workspace }
    return await ctx.with('db.getBlob', {}, () => this.db.getBlob(this.ctx, blobId), params)
  }

  async listBlobs (ctx: MeasureContext, workspace: string, options: ListBlobOptions): Promise<ListBlobResult> {
    const params = { workspace }
    return await ctx.with('db.listBlobs', {}, () => this.db.listBlobs(this.ctx, workspace, options), params)
  }

  async createData (ctx: MeasureContext, data: BlobDataRecord): Promise<void> {
    const params = { type: data.type }
    await ctx.with('db.createData', {}, () => this.db.createData(this.ctx, data), params)
  }

  async createBlob (ctx: MeasureContext, blob: Omit<BlobRecord, 'filename'>): Promise<void> {
    const params = { workspace: blob.workspace, location: blob.location }
    await ctx.with('db.createBlob', {}, () => this.db.createBlob(this.ctx, blob), params)
  }

  async createBlobData (ctx: MeasureContext, data: BlobWithDataRecord): Promise<void> {
    const params = { workspace: data.workspace, location: data.location, type: data.type }
    await ctx.with('db.createBlobData', {}, () => this.db.createBlobData(this.ctx, data), params)
  }

  async deleteBlobList (ctx: MeasureContext, blobs: BlobIds): Promise<void> {
    const params = { workspace: blobs.workspace }
    await ctx.with('db.deleteBlobList', {}, () => this.db.deleteBlobList(this.ctx, blobs), params)
  }

  async deleteBlob (ctx: MeasureContext, blob: BlobId): Promise<void> {
    const params = { workspace: blob.workspace }
    await ctx.with('db.deleteBlob', {}, () => this.db.deleteBlob(this.ctx, blob), params)
  }

  async getMeta (ctx: MeasureContext, blobId: BlobId): Promise<BlobMeta | null> {
    const params = { workspace: blobId.workspace }
    return await this.ctx.with('db.getMeta', {}, () => this.db.getMeta(ctx, blobId), params)
  }

  async setMeta (ctx: MeasureContext, blobId: BlobId, meta: BlobMeta): Promise<void> {
    const params = { workspace: blobId.workspace }
    await this.ctx.with('db.setMeta', {}, () => this.db.setMeta(ctx, blobId, meta), params)
  }

  async setParent (ctx: MeasureContext, blob: BlobId, parent: BlobId | null): Promise<void> {
    const params = { workspace: blob.workspace }
    await ctx.with('db.setParent', {}, () => this.db.setParent(this.ctx, blob, parent), params)
  }

  async getStats (ctx: MeasureContext): Promise<StatsResult> {
    return await ctx.with('db.getStats', {}, () => this.db.getStats(this.ctx))
  }

  async getWorkspaceStats (ctx: MeasureContext, workspace: string): Promise<WorkspaceStatsResult> {
    const params = { workspace }
    return await ctx.with('db.getWorkspaceStats', {}, () => this.db.getWorkspaceStats(this.ctx, workspace), params)
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
    case 'object':
      if (value instanceof Date) {
        return `'${value.toISOString()}'`
      } else {
        return `'${JSON.stringify(value)}'`
      }
    default:
      throw new Error(`Unsupported value type: ${typeof value}`)
  }
}

function getMigrations (): [string, string][] {
  return [migrationV1(), migrationV2()]
}

function migrationV1 (): [string, string] {
  const sql = `
    CREATE TYPE IF NOT EXISTS blob.location AS ENUM ('eu', 'weur', 'eeur', 'wnam', 'enam', 'apac');

    CREATE TABLE IF NOT EXISTS blob.data (
      hash UUID NOT NULL,
      location blob.location NOT NULL,
      size INT8 NOT NULL,
      filename STRING(255) NOT NULL,
      type STRING(255) NOT NULL,
      CONSTRAINT pk_data PRIMARY KEY (hash, location)
    );

    CREATE TABLE IF NOT EXISTS blob.blob (
      workspace STRING(255) NOT NULL,
      name STRING(255) NOT NULL,
      hash UUID NOT NULL,
      location blob.location NOT NULL,
      parent STRING(255) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP DEFAULT NULL,
      CONSTRAINT pk_blob PRIMARY KEY (workspace, name),
      CONSTRAINT fk_data FOREIGN KEY (hash, location) REFERENCES blob.data (hash, location),
      CONSTRAINT fk_parent FOREIGN KEY (workspace, parent)  REFERENCES blob.blob (workspace, name) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blob.meta (
      workspace STRING(255) NOT NULL,
      name STRING(255) NOT NULL,
      meta JSONB NOT NULL,
      CONSTRAINT pk_meta PRIMARY KEY (workspace, name),
      CONSTRAINT fk_blob FOREIGN KEY (workspace, name) REFERENCES blob.blob (workspace, name)
    );
  `
  return ['init_tables_01', sql]
}

function migrationV2 (): [string, string] {
  const sql = `
    ALTER TABLE blob.meta DROP CONSTRAINT IF EXISTS fk_blob;

    UPDATE blob.blob
    SET workspace = w.uuid
    FROM global_account.workspace w
    WHERE workspace = w.data_id
      AND NOT EXISTS (
        SELECT 1
        FROM blob.blob existing
        WHERE existing.workspace = w.uuid::string
        AND existing.name = blob.blob.name
      );

    UPDATE blob.meta
    SET workspace = w.uuid
    FROM global_account.workspace w
    WHERE workspace = w.data_id
      AND NOT EXISTS (
        SELECT 1
        FROM blob.meta existing
        WHERE existing.workspace = w.uuid::string
        AND existing.name = blob.meta.name
      );

    ALTER TABLE blob.meta ADD CONSTRAINT fk_blob_meta FOREIGN KEY (workspace, name) REFERENCES blob.blob (workspace, name);
  `
  return ['migrate_workspaces_02', sql]
}
