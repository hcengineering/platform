//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import postgres from 'postgres'
import { type CardID, type WorkspaceID } from '@hcengineering/communication-types'

import config from './config'

export interface SyncRecord {
  workspace: WorkspaceID
  card: CardID
  attempt: number
}

export async function getDb (): Promise<PostgresDB> {
  const sql = postgres(config.DbUrl, {
    connection: {
      application_name: 'msg2file'
    },
    fetch_types: true,
    prepare: true
  })

  return await PostgresDB.create(sql)
}

export class PostgresDB {
  private readonly table = 'msg2file.sync_record'

  constructor (private readonly client: postgres.Sql) {}

  static async create (client: postgres.Sql): Promise<PostgresDB> {
    await this.init(client)
    return new PostgresDB(client)
  }

  static async init (client: postgres.Sql): Promise<void> {
    const sql = `
        CREATE SCHEMA IF NOT EXISTS msg2file;
        CREATE TABLE IF NOT EXISTS msg2file.sync_record
        (
            workspace UUID         NOT NULL,
            card      VARCHAR(255) NOT NULL,
            attempt   INT          NOT NULL,
            PRIMARY KEY (workspace, card)
        );
    `

    await client.unsafe(sql)
  }

  async getRecords (limit: number): Promise<SyncRecord[]> {
    const sql = `
        SELECT workspace, card
        FROM ${this.table}
        LIMIT ${limit};`

    const result = await this.client.unsafe(sql)

    return result.map((raw) => ({
      workspace: raw.workspace,
      card: raw.card
    })) as SyncRecord[]
  }

  async creteRecord (workspace: WorkspaceID, card: CardID): Promise<void> {
    const sql = `
        INSERT INTO ${this.table} (workspace, card, attempt)
        VALUES ($1::uuid, $2::varchar, 0)
        ON CONFLICT DO NOTHING;`

    await this.client.unsafe(sql, [workspace, card])
  }

  async removeRecord (workspace: WorkspaceID, card: CardID): Promise<void> {
    const sql = `
        DELETE
        FROM ${this.table}
        WHERE workspace = $1::uuid
          AND card = $2::varchar;`

    await this.client.unsafe(sql, [workspace, card])
  }

  async increaseAttempt (workspace: WorkspaceID, card: CardID): Promise<void> {
    const sql = `
        UPDATE ${this.table}
        SET attempt = attempt + 1
        WHERE workspace = $1::uuid
          AND card = $2::varchar;`

    await this.client.unsafe(sql, [workspace, card])
  }

  async close (): Promise<void> {
    await this.client.end({ timeout: 0 })
  }
}
