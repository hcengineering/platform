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
import type { AuditRecord } from '@hcengineering/server-core'
import type { AuditEventStore } from '../../types'

/** Append-only PostgreSQL journal. Duplicate deliveries preserve the original record. */
export class PostgresAuditEventStore implements AuditEventStore {
  constructor (
    private readonly client: Sql,
    private readonly ns: string
  ) {}

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
