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

/** Shared producer names and workspace-owner visibility. Technical events remain in the permanent journal. */
export const AUDIT_EVENT_CATALOG = {
  'account.2fa.disable': 'technical',
  'account.2fa.enable': 'technical',
  'account.2fa.secret.generate': 'technical',
  'account.2fa.verify': 'technical',
  'account.api-key.create': 'owner',
  'account.api-key.revoke': 'owner',
  'account.assistant.add': 'technical',
  'account.assistant.token.refresh': 'technical',
  'account.delete': 'technical',
  'account.email.confirm': 'technical',
  'account.guest.login': 'owner',
  'account.guest.token.exchange': 'technical',
  'account.login': 'technical',
  'account.mailbox.create': 'technical',
  'account.mailbox.delete': 'technical',
  'account.mailbox.secret.read': 'technical',
  'account.merge': 'technical',
  'account.otp.request': 'technical',
  'account.otp.signup.request': 'technical',
  'account.otp.validate': 'technical',
  'account.password.change': 'technical',
  'account.password.reset.request': 'technical',
  'account.password.restore': 'technical',
  'account.password.setup.request': 'technical',
  'account.profile.name.change': 'technical',
  'account.rpc': 'technical',
  'account.signup': 'technical',
  'account.social.add': 'technical',
  'account.social.release': 'technical',
  'account.social.verification.request': 'technical',
  'document.publish': 'technical',
  'integration.create': 'owner',
  'integration.delete': 'owner',
  'integration.secret.add': 'owner',
  'integration.secret.delete': 'owner',
  'integration.secret.read': 'owner',
  'integration.secret.update': 'owner',
  'integration.secrets.list': 'technical',
  'integration.update': 'owner',
  'person.merge': 'technical',
  'person.social.add': 'technical',
  'person.social.update': 'technical',
  'workspace.access.link.create': 'owner',
  'workspace.create': 'owner',
  'workspace.data.cleanup': 'technical',
  'workspace.deletion.schedule': 'owner',
  'workspace.guests.readonly.change': 'owner',
  'workspace.guests.signup.change': 'owner',
  'workspace.invite.create': 'owner',
  'workspace.invite.limit.exceeded': 'owner',
  'workspace.invite.resend': 'owner',
  'workspace.invite.revoke': 'owner',
  'workspace.invite.send': 'owner',
  'workspace.lifecycle.update': 'technical',
  'workspace.member.assign': 'owner',
  'workspace.member.join': 'owner',
  'workspace.member.remove': 'owner',
  'workspace.member.role.change': 'owner',
  'workspace.operation.schedule': 'technical',
  'workspace.password.policy.change': 'owner',
  'workspace.permission.assign': 'owner',
  'workspace.permission.revoke': 'owner',
  'workspace.rename': 'owner'
} as const

export type AuditEventName = keyof typeof AUDIT_EVENT_CATALOG
export type OwnerAuditEventName = {
  [Name in AuditEventName]: (typeof AUDIT_EVENT_CATALOG)[Name] extends 'owner' ? Name : never
}[AuditEventName]

/** Unknown names stay hidden until explicitly classified by the server. */
export function isOwnerAuditEventName (name: string): name is OwnerAuditEventName {
  return (
    Object.prototype.hasOwnProperty.call(AUDIT_EVENT_CATALOG, name) &&
    AUDIT_EVENT_CATALOG[name as AuditEventName] === 'owner'
  )
}

export const OWNER_AUDIT_EVENTS: readonly OwnerAuditEventName[] =
  Object.keys(AUDIT_EVENT_CATALOG).filter(isOwnerAuditEventName)

/** Filters for the current workspace journal. Time bounds are inclusive/exclusive. */
export interface WorkspaceAuditQuery {
  from: number
  to: number
  event?: string
  outcome?: 'succeeded' | 'denied' | 'failed'
  cursor?: { occurredAt: number, eventId: string }
  limit?: number
}

/** Owner-visible projection; private audit attributes are never returned. */
export interface WorkspaceAuditEvent {
  eventId: string
  occurredAt: number
  sourceService: string
  event: string
  outcome: 'succeeded' | 'denied' | 'failed'
  actorAccountUuid?: string
  actorService?: string
  targetType?: string
  targetId?: string
  operationId?: string
  attributes: Record<string, string | number | boolean | readonly string[] | null>
}

export interface WorkspaceAuditPage {
  events: WorkspaceAuditEvent[]
  nextCursor?: { occurredAt: number, eventId: string }
}
