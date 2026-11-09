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

import contact from '@hcengineering/contact'
import { AccountRole, OWNER_AUDIT_EVENTS, isOwnerAuditEventName, type OwnerAuditEventName } from '@hcengineering/core'
import type { WorkspaceAuditEvent } from '@hcengineering/account-client'
import { getEmbeddedLabel, type IntlString } from '@hcengineering/platform'
import { StateType, type DropdownIntlItem } from '@hcengineering/ui'
import setting from './plugin'

export const AUDIT_EVENT_LABELS: Record<OwnerAuditEventName, IntlString> = {
  'workspace.create': setting.string.WorkspaceCreated,
  'workspace.rename': setting.string.WorkspaceRenamed,
  'workspace.deletion.schedule': setting.string.WorkspaceDeletionScheduled,
  'workspace.invite.create': setting.string.InvitationCreated,
  'workspace.invite.revoke': setting.string.InvitationRevoked,
  'workspace.invite.limit.exceeded': setting.string.InvitationUsageLimitReached,
  'workspace.invite.send': setting.string.InvitationSent,
  'workspace.invite.resend': setting.string.InvitationResent,
  'workspace.access.link.create': setting.string.AccessLinkCreated,
  'workspace.member.join': setting.string.MemberJoined,
  'workspace.member.assign': setting.string.MemberAssigned,
  'workspace.member.role.change': setting.string.MemberRoleChanged,
  'workspace.member.remove': setting.string.MemberRemoved,
  'workspace.permission.assign': setting.string.PermissionAssigned,
  'workspace.permission.revoke': setting.string.PermissionRevoked,
  'workspace.guests.readonly.change': setting.string.ReadOnlyGuestAccessChanged,
  'workspace.guests.signup.change': setting.string.GuestSignUpPolicyChanged,
  'workspace.password.policy.change': setting.string.PasswordPolicyChanged,
  'integration.create': setting.string.IntegrationCreated,
  'integration.update': setting.string.IntegrationUpdated,
  'integration.delete': setting.string.IntegrationDeleted,
  'integration.secret.add': setting.string.IntegrationSecretAdded,
  'integration.secret.update': setting.string.IntegrationSecretUpdated,
  'integration.secret.delete': setting.string.IntegrationSecretDeleted,
  'integration.secret.read': setting.string.IntegrationSecretAccessed,
  'account.api-key.create': setting.string.ApiKeyCreated,
  'account.api-key.revoke': setting.string.ApiKeyRevoked,
  'account.guest.login': setting.string.GuestLoggedIn
}

export const AUDIT_EVENT_ITEMS: DropdownIntlItem[] = OWNER_AUDIT_EVENTS.map((id) => ({
  id,
  label: AUDIT_EVENT_LABELS[id]
}))

export const AUDIT_OUTCOME_LABELS: Record<WorkspaceAuditEvent['outcome'], IntlString> = {
  succeeded: setting.string.Succeeded,
  denied: setting.string.Denied,
  failed: setting.string.Failed
}

export const AUDIT_OUTCOME_TYPES: Record<WorkspaceAuditEvent['outcome'], StateType> = {
  succeeded: StateType.Positive,
  denied: StateType.Regular,
  failed: StateType.Negative
}

export const AUDIT_ATTRIBUTE_LABELS: Record<string, IntlString> = {
  targetAccountUuid: setting.string.AccountId,
  subjectAccountUuid: setting.string.AccountId,
  targetPersonUuid: contact.string.Person,
  role: setting.string.Role,
  targetRole: setting.string.NewRole,
  permission: setting.string.Permission,
  accountIds: setting.string.AffectedAccounts,
  region: setting.string.Region,
  autoJoin: setting.string.AutomaticJoin,
  isShareLink: setting.string.ShareLink,
  readOnlyGuestsAllowed: setting.string.ReadOnlyGuestsAllowed,
  guestSignUpAllowed: setting.string.GuestSignUpAllowed,
  days: setting.string.PasswordAgeDays,
  kind: setting.string.IntegrationKind
}

export function getAuditEventLabel (event: string): IntlString {
  return isOwnerAuditEventName(event) ? AUDIT_EVENT_LABELS[event] : setting.string.UnknownEvent
}

export function getAuditTarget (event: WorkspaceAuditEvent): string | undefined {
  const { targetAccountUuid, targetPersonUuid, subjectAccountUuid } = event.attributes
  const identity = event.targetType === 'account' || event.targetType === 'person' ? event.targetId : undefined
  const target = targetAccountUuid ?? targetPersonUuid ?? subjectAccountUuid ?? identity
  return typeof target === 'string' ? target : undefined
}

/** Keep stored role values readable without guessing a role for unknown future values. */
export function getAuditRoleLabel (role: string): IntlString {
  switch (role) {
    case AccountRole.ReadOnlyGuest:
      return setting.string.ReadonlyGuest
    case AccountRole.Guest:
      return setting.string.Guest
    case AccountRole.User:
      return setting.string.User
    case AccountRole.Maintainer:
      return setting.string.Maintainer
    case AccountRole.Owner:
      return setting.string.Owner
    case AccountRole.Admin:
      return setting.string.Admin
    default:
      return getEmbeddedLabel(role)
  }
}
