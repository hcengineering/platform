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

import type { InviteSettings, RoleCapabilityId, RoleCapabilitySettings } from '@hcengineering/setting'
import { getCurrentAccount } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import setting, { RoleCapability } from '@hcengineering/setting'
import { hasRoleCapability } from './roleCapability'

/**
 * Returns whether the current account has the given role capability.
 * Fetches InviteSettings and RoleCapabilitySettings from the client.
 * @public
 */
export async function hasRoleCapabilityAsync (capabilityId: RoleCapabilityId | string): Promise<boolean> {
  const client = getClient()
  const [inviteSettings, roleCapabilitySettings] = await Promise.all([
    client.findAll(setting.class.InviteSettings, {}, { limit: 1 }),
    client.findAll(setting.class.RoleCapabilitySettings, {}, { limit: 1 })
  ])
  const firstInvite = inviteSettings[0] as InviteSettings | undefined
  const firstRoleCap = roleCapabilitySettings[0] as RoleCapabilitySettings | undefined
  const inviteLinkGeneratorRoles =
    capabilityId === RoleCapability.GenerateInviteLink &&
    firstInvite?.inviteLinkGeneratorRoles != null &&
    firstInvite.inviteLinkGeneratorRoles.length > 0
      ? firstInvite.inviteLinkGeneratorRoles
      : undefined
  const roleByCapability = firstRoleCap?.roleByCapability
  const account = getCurrentAccount()
  return hasRoleCapability(account, capabilityId, roleByCapability, inviteLinkGeneratorRoles)
}
