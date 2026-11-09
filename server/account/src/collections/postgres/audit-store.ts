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

import type { Sql } from 'postgres'
import type { WorkspaceUuid } from '@hcengineering/core'
import type { AuditAttributeValue, AuditRecord } from '@hcengineering/server-core'
import type { AuditEventStore, WorkspaceAuditQuery } from '../../types'

interface AuditEventRow {
  schemaVersion: 1
  eventId: string
  occurredAt: number | string
  sourceService: string
  event: AuditRecord['event']
  outcome: AuditRecord['outcome']
  actorAccountUuid?: string
  actorService?: string
  workspaceUuid?: string
  targetType?: string
  targetId?: string
  operationId?: string
  attributes: Record<string, AuditAttributeValue>
}

/** Append-only PostgreSQL journal. Duplicate deliveries preserve the original record. */
export class PostgresAuditEventStore implements AuditEventStore {
  constructor (
    private readonly client: Sql,
    private readonly ns: string
  ) {}

  async findWorkspace (
    workspace: WorkspaceUuid,
    query: WorkspaceAuditQuery,
    events?: readonly string[]
  ): Promise<AuditRecord[]> {
    const table = this.ns === '' ? 'audit_events' : `${this.ns}.audit_events`
    const values: (string | number | string[])[] = [workspace, query.from, query.to]
    const conditions = ['workspace_uuid = $1', 'occurred_at >= $2::int8', 'occurred_at < $3::int8']
    // Apply visibility before LIMIT so technical records cannot create gaps in owner pagination.
    if (events !== undefined) {
      values.push([...events])
      conditions.push(`event = ANY($${values.length}::text[])`)
    }
    if (query.event !== undefined) {
      values.push(query.event)
      conditions.push(`event = $${values.length}`)
    }
    if (query.outcome !== undefined) {
      values.push(query.outcome)
      conditions.push(`outcome = $${values.length}`)
    }
    if (query.cursor !== undefined) {
      values.push(query.cursor.occurredAt, query.cursor.eventId)
      conditions.push(`(occurred_at, event_id) < ($${values.length - 1}::int8, $${values.length}::uuid)`)
    }
    values.push((query.limit ?? 50) + 1)
    const rows = await this.client.unsafe<AuditEventRow[]>(
      `SELECT schema_version AS "schemaVersion", event_id AS "eventId", occurred_at AS "occurredAt",
              source_service AS "sourceService", event, outcome, actor_account_uuid AS "actorAccountUuid",
              actor_service AS "actorService", workspace_uuid AS "workspaceUuid", target_type AS "targetType",
              target_id AS "targetId", operation_id AS "operationId", attributes
       FROM ${table} WHERE ${conditions.join(' AND ')}
       ORDER BY occurred_at DESC, event_id DESC LIMIT $${values.length}`,
      values
    )
    return rows.map((row) => {
      const { attributes, ...envelope } = row
      return { ...attributes, ...envelope, occurredAt: Number(row.occurredAt) }
    })
  }

  async insert (record: AuditRecord): Promise<void> {
    const {
      eventId,
      schemaVersion,
      occurredAt,
      sourceService,
      event,
      outcome,
      actorAccountUuid,
      actorService,
      workspaceUuid,
      targetType,
      targetId,
      operationId,
      ...attributes
    } = record
    const table = this.ns === '' ? 'audit_events' : `${this.ns}.audit_events`
    await this.client.unsafe(
      `
      INSERT INTO ${table}
        (event_id, schema_version, occurred_at, source_service, event, outcome,
         actor_account_uuid, actor_service, workspace_uuid, target_type, target_id, operation_id, attributes)
      VALUES ($1::uuid, $2::int4, $3::int8, $4::text, $5::text, $6::text,
              $7::text, $8::text, $9::text, $10::text, $11::text, $12::text, $13::jsonb)
      ON CONFLICT (event_id) DO NOTHING
    `,
      [
        eventId,
        schemaVersion,
        occurredAt,
        sourceService,
        event,
        outcome,
        actorAccountUuid ?? null,
        actorService ?? null,
        workspaceUuid ?? null,
        targetType ?? null,
        targetId ?? null,
        operationId ?? null,
        JSON.stringify(attributes)
      ]
    )
  }
}
