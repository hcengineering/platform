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

import { randomUUID } from 'crypto'
import type { MeasureContext } from '@hcengineering/core'
import platform from '@hcengineering/platform'
import { hashAuditValue, recordAuditEvent, type AuditEvent } from '@hcengineering/server-core'
import { decodeToken } from '@hcengineering/server-token'
import type { WorkspaceInvite } from './types'

/** Add only verified caller identity to explicitly selected domain fields. */
export async function auditAccountEvent (ctx: MeasureContext, event: AuditEvent, token?: string): Promise<void> {
  let actor: AuditEvent = { event: event.event }
  if (token != null && token !== '') {
    try {
      const { account, workspace, extra } = decodeToken(token)
      actor = {
        event: event.event,
        actorAccountUuid: account,
        workspaceUuid: workspace,
        actorService: typeof extra?.service === 'string' ? extra.service : undefined,
        actorIsAdmin: extra?.admin === 'true',
        actorUsesApiKey: extra?.apiKey != null,
        authenticationSubjectUuid: typeof extra?.tfaAccount === 'string' ? extra.tfaAccount : undefined
      }
    } catch {
      // Invalid claims cannot identify the actor of a denied request.
    }
  }
  await recordAuditEvent(ctx, { ...actor, ...event })
}

/** Attribute an exhausted invite to its persisted workspace, never to request parameters. */
export async function auditInviteLimitExceeded (
  ctx: MeasureContext,
  invite: Pick<WorkspaceInvite, 'id' | 'workspaceUuid'>,
  token: string
): Promise<void> {
  await auditAccountEvent(
    ctx,
    {
      event: 'workspace.invite.limit.exceeded',
      outcome: 'denied',
      workspaceUuid: invite.workspaceUuid,
      targetType: 'invite',
      inviteIdHash: auditValueHash(invite.id, 'invite')
    },
    token
  )
}

/** Publish bounded chunks while preserving every recipient of a bulk change. */
export async function auditAccountBatchEvent (
  ctx: MeasureContext,
  token: string,
  event: AuditEvent,
  accountIds: readonly string[]
): Promise<void> {
  const operationId = randomUUID()
  const chunkCount = Math.max(1, Math.ceil(accountIds.length / 100))
  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
    await auditAccountEvent(
      ctx,
      {
        ...event,
        operationId,
        accountIds: accountIds.slice(chunkIndex * 100, (chunkIndex + 1) * 100),
        accountIdsCount: accountIds.length,
        chunkIndex,
        chunkCount
      },
      token
    )
  }
}

/** Correlate email subjects without writing their address to audit records. */
export function auditEmailHash (email: string): string | undefined {
  return auditValueHash(email.trim().toLowerCase(), 'email')
}

/** Hash a private identifier with the installation's audit key. */
export function auditValueHash (value: string, scope: string): string | undefined {
  return hashAuditValue(
    value,
    scope,
    process.env.AUDIT_HMAC_KEY || process.env.ACCOUNT_AUDIT_HMAC_KEY || process.env.SERVER_SECRET
  )
}

/** Distinguish expected credential/access denials from operation and server failures. */
export function isAccountAuditDenial (method: string, code: string): boolean {
  return (
    code === platform.status.Forbidden ||
    code === platform.status.Unauthorized ||
    ([
      'login',
      'loginOtp',
      'signUpOtp',
      'validateOtp',
      'verify2fa',
      'enable2fa',
      'disable2fa',
      'changePassword'
    ].includes(method) &&
      [
        platform.status.AccountNotFound,
        platform.status.PasswordLoginLocked,
        platform.status.InvalidOtp,
        platform.status.OtpLocked
      ].some((denial) => denial === code))
  )
}
