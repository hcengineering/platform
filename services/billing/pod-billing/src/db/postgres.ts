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

import {
  LiveKitEgressData,
  LiveKitSessionData,
  LiveKitUsageData,
  BillingDB,
  LiveKitSessionsUsageData,
  LiveKitEgressUsageData
} from '../types'
import postgres, { type Row, Sql } from 'postgres'
import { MeasureContext } from '@hcengineering/core'
import { LoggedDB } from './logged'
import { RetryDB } from './retry'
import { getMigrations } from './migrations'

const BATCH_SIZE = 100

export async function createDb (ctx: MeasureContext, connectionString: string): Promise<BillingDB> {
  const sql = postgres(connectionString, {
    max: 5,
    connection: {
      application_name: 'billing'
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

export class PostgresDB implements BillingDB {
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
    await this.execute('CREATE SCHEMA IF NOT EXISTS billing')
    await this.execute(`
        CREATE TABLE IF NOT EXISTS billing.migrations (
          name       VARCHAR(255) NOT NULL,
          created_on TIMESTAMP    NOT NULL DEFAULT now()
        )
    `)

    const appliedMigrations = (await this.execute<Row[]>('SELECT name FROM billing.migrations')).map((row) => row.name)
    ctx.info('applied migrations', { migrations: appliedMigrations })

    for (const [name, sql] of getMigrations()) {
      if (appliedMigrations.includes(name)) {
        continue
      }

      try {
        ctx.warn('applying migration', { migration: name })
        await this.execute(sql)
        await this.execute('INSERT INTO billing.migrations (name) VALUES ($1)', [name])
      } catch (err: any) {
        ctx.error('failed to apply migration', { migration: name, error: err })
        throw err
      }
    }
  }

  async getLiveKitStats (ctx: MeasureContext, workspace: string): Promise<LiveKitUsageData> {
    const params = [workspace]

    const sessionsQuery = `
        SELECT COALESCE(SUM(bandwidth), 0) AS totalBandwidth, COALESCE(SUM(minutes), 0) AS totalMinutes
        FROM billing.livekit_session
        WHERE workspace = $1
      `
    const sessionStats = await this.execute<LiveKitSessionsUsageData[]>(sessionsQuery, params)

    const egressQuery = `
        SELECT COALESCE(SUM(duration), 0) AS totalMinutes
        FROM billing.livekit_egress
        WHERE workspace = $1
      `
    const egressStats = await this.execute<LiveKitEgressUsageData[]>(egressQuery, params)

    return {
      sessions: sessionStats?.length > 0 ? sessionStats[0] : { totalBandwidth: 0, totalMinutes: 0 },
      egress: egressStats?.length > 0 ? egressStats[0] : { totalMinutes: 0 }
    }
  }

  async listLiveKitSessions (ctx: MeasureContext, workspace: string): Promise<LiveKitSessionData[] | null> {
    const query = `
        SELECT workspace, session_id, session_start, session_end, room, bandwidth, minutes
        FROM billing.livekit_session
        WHERE workspace = $1
      `
    const params = [workspace]

    return await this.execute<LiveKitSessionData[]>(query, params)
  }

  async listLiveKitEgress (ctx: MeasureContext, workspace: string): Promise<LiveKitEgressData[] | null> {
    const query = `
        SELECT workspace, egress_id, egress_start, egress_end, room, duration
        FROM billing.livekit_session
        WHERE workspace = $1
      `
    const params = [workspace]
    return await this.execute<LiveKitEgressData[]>(query, params)
  }

  async setLiveKitSessions (ctx: MeasureContext, workspace: string, data: LiveKitSessionData[]): Promise<void> {
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      const values = []
      const params = []
      let paramIndex = 1

      for (const item of batch) {
        const { sessionId, sessionStart, sessionEnd, room, bandwidth, minutes } = item
        values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`)
        params.push(workspace, sessionId, sessionStart, sessionEnd, room, bandwidth, minutes)
      }

      const query = `
        UPSERT INTO billing.livekit_session (workspace, session_id, session_start, session_end, room, bandwidth, minutes)
        VALUES ${values.join(',')}
      `
      await this.execute(query, params)
    }
  }

  async setLiveKitEgress (ctx: MeasureContext, workspace: string, data: LiveKitEgressData[]): Promise<void> {
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      const values = []
      const params = []
      let paramIndex = 1

      for (const item of batch) {
        const { egressId, egressStart, egressEnd, room, duration } = item
        values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`)
        params.push(workspace, egressId, egressStart, egressEnd, room, duration)
      }

      const query = `
        UPSERT INTO billing.livekit_egress (workspace, egress_id, egress_start, egress_end, room, duration)
        VALUES ${values.join(',')}
      `
      await this.execute(query, params)
    }
  }
}

function injectVars (sql: string, values: any[]): string {
  return sql.replaceAll(/(\$\d+)/g, (_, idx) => {
    return escape(values[parseInt(idx.substring(1)) - 1])
  })
}

function escape (value: any): string {
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
