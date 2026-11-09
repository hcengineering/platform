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

import {
  AccountRole,
  OWNER_AUDIT_EVENTS,
  isOwnerAuditEventName,
  type Branding,
  type MeasureContext
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import type { AuditRecord } from '@hcengineering/server-core'
import { decodeTokenVerbose } from '@hcengineering/server-token'
import type { AccountDB, WorkspaceAuditEvent, WorkspaceAuditPage, WorkspaceAuditQuery } from './types'

const VISIBLE_ATTRIBUTES = [
  'targetAccountUuid',
  'subjectAccountUuid',
  'targetPersonUuid',
  'role',
  'targetRole',
  'permission',
  'accountIds',
  'accountIdsCount',
  'chunkIndex',
  'chunkCount',
  'region',
  'autoJoin',
  'isShareLink',
  'readOnlyGuestsAllowed',
  'guestSignUpAllowed',
  'days',
  'workspaceEvent',
  'workspaceMode',
  'mode',
  'operation',
  'kind',
  'method',
  'errorCode'
] as const

function badRequest (): never {
  throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
}

function validateQuery (query: WorkspaceAuditQuery | null | undefined): asserts query is WorkspaceAuditQuery {
  if (query == null || typeof query !== 'object' || Array.isArray(query)) badRequest()
  if (
    !Number.isSafeInteger(query.from) ||
    query.from < 0 ||
    !Number.isSafeInteger(query.to) ||
    query.to <= query.from ||
    (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100)) ||
    (query.event !== undefined && (typeof query.event !== 'string' || !isOwnerAuditEventName(query.event))) ||
    (query.outcome !== undefined && !['succeeded', 'denied', 'failed'].includes(query.outcome))
  ) {
    badRequest()
  }
  if (query.cursor !== undefined) {
    if (query.cursor === null || typeof query.cursor !== 'object') badRequest()
    const { occurredAt, eventId } = query.cursor
    if (
      !Number.isSafeInteger(occurredAt) ||
      occurredAt < 0 ||
      typeof eventId !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(eventId)
    ) {
      badRequest()
    }
  }
}

function presentEvent (record: AuditRecord): WorkspaceAuditEvent {
  const attributes: WorkspaceAuditEvent['attributes'] = {}
  for (const key of VISIBLE_ATTRIBUTES) {
    const value = record[key]
    if (value !== undefined) attributes[key] = value
  }
  return {
    eventId: record.eventId,
    occurredAt: record.occurredAt,
    sourceService: record.sourceService,
    event: record.event,
    outcome: record.outcome,
    actorAccountUuid: record.actorAccountUuid ?? undefined,
    actorService: record.actorService ?? undefined,
    targetType: record.targetType ?? undefined,
    targetId: record.targetId ?? undefined,
    operationId: record.operationId ?? undefined,
    attributes
  }
}

/** Read only the verified token workspace, using the caller's current persisted owner role. */
export async function getWorkspaceAuditEvents (
  ctx: MeasureContext,
  db: AccountDB,
  _branding: Branding | null,
  token: string,
  query?: WorkspaceAuditQuery | null
): Promise<WorkspaceAuditPage> {
  const { account, workspace, extra } = decodeTokenVerbose(ctx, token)
  if (
    workspace == null ||
    workspace === '' ||
    extra?.apiKey != null ||
    (await db.getWorkspaceRole(account, workspace)) !== AccountRole.Owner
  ) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  validateQuery(query)
  const limit = query.limit ?? 50
  const records = await db.audit.findWorkspace(workspace, { ...query, limit }, OWNER_AUDIT_EVENTS)
  const events = records.slice(0, limit).map(presentEvent)
  const last = events[events.length - 1]
  return {
    events,
    nextCursor:
      records.length > limit && last !== undefined ? { occurredAt: last.occurredAt, eventId: last.eventId } : undefined
  }
}
