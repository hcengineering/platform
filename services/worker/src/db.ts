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
import { WorkspaceUuid } from '@hcengineering/core'

export interface DelayedEventRecord {
  id: string
  workspace: WorkspaceUuid
  target_date: number
  topic: string
  data: any
}

const delayedEventsTable = 'time_machine.delayed_events'

export class TimeMachineDB {
  constructor (private readonly client: postgres.Sql) {}

  static async init (dbUrl: string): Promise<TimeMachineDB> {
    const client = postgres(dbUrl, {
      connection: {
        application_name: 'time-machine'
      }
    })

    const sql = `
        CREATE SCHEMA IF NOT EXISTS time_machine;
        
        CREATE TABLE IF NOT EXISTS ${delayedEventsTable} (
          id TEXT NOT NULL,
          workspace UUID NOT NULL,
          target_date INT8 NOT NULL,
          topic TEXT NOT NULL,
          data JSONB NOT NULL,
          PRIMARY KEY (id, workspace)
        );

        CREATE INDEX IF NOT EXISTS idx_delayed_events_target_date ON ${delayedEventsTable} (target_date);
    `

    await client.unsafe(sql)
    return new TimeMachineDB(client)
  }

  async upsertEvent (record: DelayedEventRecord): Promise<void> {
    await this.client`
      INSERT INTO time_machine.delayed_events (id, workspace, target_date, topic, data)
      VALUES (${record.id}, ${record.workspace}, ${record.target_date}, ${record.topic}, ${record.data})
      ON CONFLICT (id, workspace) DO UPDATE 
      SET target_date = EXCLUDED.target_date,
          topic = EXCLUDED.topic,
          data = EXCLUDED.data
    `
  }

  async removeEvents (workspace: WorkspaceUuid, idPattern: string): Promise<void> {
    await this.client`
      DELETE FROM time_machine.delayed_events 
      WHERE workspace = ${workspace} AND id ILIKE ${idPattern}
    `
  }

  async getExpiredEvents (): Promise<DelayedEventRecord[]> {
    const now = Date.now()
    const res = await this.client`
      SELECT id, workspace, target_date, topic, data 
      FROM time_machine.delayed_events 
      WHERE target_date <= ${now}
    `
    return res.map((r: any) => ({
      id: r.id,
      workspace: r.workspace,
      target_date: Number(r.target_date),
      topic: r.topic,
      data: r.data
    }))
  }

  async deleteEvents (events: DelayedEventRecord[]): Promise<void> {
    if (events.length === 0) return
    await this.client.begin(async (sql: postgres.Sql) => {
      for (const event of events) {
        await sql`
          DELETE FROM time_machine.delayed_events 
          WHERE id = ${event.id} AND workspace = ${event.workspace}
        `
      }
    })
  }

  async close (): Promise<void> {
    await this.client.end()
  }
}
