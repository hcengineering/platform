//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { Account } from '@hcengineering/core'
import { AccountRole, hasAccountRole } from '@hcengineering/core'
import { RoleCapability, type RoleCapabilityId } from '@hcengineering/setting'

/** Default roles that have each capability when no RoleCapabilitySettings is set */
const DEFAULT_ROLES_BY_CAPABILITY: Record<string, AccountRole[]> = {
  [RoleCapability.GenerateInviteLink]: [AccountRole.User, AccountRole.Maintainer, AccountRole.Owner],
  [RoleCapability.ManageInviteSettings]: [AccountRole.Maintainer, AccountRole.Owner]
}

/**
 * Returns whether the given account has the specified capability.
 * Uses roleByCapability if provided; otherwise for GenerateInviteLink falls back to inviteLinkGeneratorRoles; otherwise uses built-in defaults.
 * @public
 */
export function hasRoleCapability (
  account: Account,
  capabilityId: RoleCapabilityId | string,
  roleByCapability: Record<string, AccountRole[]> | undefined | null,
  inviteLinkGeneratorRoles?: AccountRole[] | undefined | null
): boolean {
  const roles = getRolesForCapability(capabilityId, roleByCapability, inviteLinkGeneratorRoles)
  return roles.some((role) => hasAccountRole(account, role))
}

/**
 * Returns the list of AccountRoles that have the given capability (for the current config/fallbacks).
 * @public
 */
export function getRolesForCapability (
  capabilityId: RoleCapabilityId | string,
  roleByCapability: Record<string, AccountRole[]> | undefined | null,
  inviteLinkGeneratorRoles?: AccountRole[] | undefined | null
): AccountRole[] {
  if (roleByCapability?.[capabilityId] != null && roleByCapability[capabilityId].length > 0) {
    return roleByCapability[capabilityId]
  }
  if (
    capabilityId === RoleCapability.GenerateInviteLink &&
    inviteLinkGeneratorRoles != null &&
    inviteLinkGeneratorRoles.length > 0
  ) {
    return inviteLinkGeneratorRoles
  }
  return DEFAULT_ROLES_BY_CAPABILITY[capabilityId] ?? []
}
