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
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { AccountRole, type Account } from '@hcengineering/core'
import { RoleCapability } from '@hcengineering/setting'
import { DEFAULT_INVITE_LINK_GENERATOR_ROLES } from '../inviteSettingsUtils'
import { getRolesForCapability, hasRoleCapability } from '../roleCapability'

function account (role: AccountRole): Account {
  return { role } as any
}

describe('roleCapability (Generate invite link permission)', () => {
  describe('getRolesForCapability', () => {
    it('uses RoleCapabilitySettings when set', () => {
      expect(
        getRolesForCapability(RoleCapability.GenerateInviteLink, {
          [RoleCapability.GenerateInviteLink]: [AccountRole.Owner]
        })
      ).toEqual([AccountRole.Owner])
    })

    it('uses inviteLinkGeneratorRoles when capability map missing', () => {
      expect(
        getRolesForCapability(RoleCapability.GenerateInviteLink, undefined, [AccountRole.Guest, AccountRole.User])
      ).toEqual([AccountRole.Guest, AccountRole.User])
    })

    it('falls back to DEFAULT_INVITE_LINK_GENERATOR_ROLES (shared with invite settings)', () => {
      expect(getRolesForCapability(RoleCapability.GenerateInviteLink, undefined, undefined)).toBe(
        DEFAULT_INVITE_LINK_GENERATOR_ROLES
      )
    })
  })

  describe('hasRoleCapability', () => {
    it('allows User when falling back to default generator roles', () => {
      expect(
        hasRoleCapability(account(AccountRole.User), RoleCapability.GenerateInviteLink, undefined, undefined)
      ).toBe(true)
    })

    it('denies User when only Owner may generate', () => {
      expect(
        hasRoleCapability(account(AccountRole.User), RoleCapability.GenerateInviteLink, undefined, [AccountRole.Owner])
      ).toBe(false)
    })

    it('allows Owner when only Owner may generate', () => {
      expect(
        hasRoleCapability(account(AccountRole.Owner), RoleCapability.GenerateInviteLink, undefined, [AccountRole.Owner])
      ).toBe(true)
    })
  })
})
