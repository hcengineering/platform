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

import { AccountRole } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import type { InviteSettings } from '@hcengineering/setting'
import {
  DEFAULT_INVITE_LINK_GENERATOR_ROLES,
  getDefaultInviterRoles,
  getDefaultInviteRole,
  INVITE_SETTINGS_DEFAULT_EXPIRATION_HOURS,
  INVITE_SETTINGS_DEFAULT_LIMIT,
  normalizeInviteRole,
  normalizeInviteRoles,
  resolveInviteSettings
} from '../inviteSettingsUtils'

jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return {
    ...actual,
    getMetadata: jest.fn()
  }
})

const mockGetMetadata = getMetadata as jest.MockedFunction<typeof getMetadata>

function inviteDoc (
  partial: Partial<InviteSettings> & Pick<InviteSettings, 'expirationTime' | 'emailMask' | 'limit'>
): InviteSettings {
  return partial as InviteSettings
}

describe('inviteSettingsUtils', () => {
  beforeEach(() => {
    mockGetMetadata.mockReturnValue(undefined)
  })

  describe('normalizeInviteRole', () => {
    it('maps string role names case-insensitively', () => {
      expect(normalizeInviteRole('GUEST', AccountRole.User)).toBe(AccountRole.Guest)
      expect(normalizeInviteRole('User', AccountRole.Guest)).toBe(AccountRole.User)
      expect(normalizeInviteRole('MAINTAINER', AccountRole.Guest)).toBe(AccountRole.Maintainer)
      expect(normalizeInviteRole('owner', AccountRole.Guest)).toBe(AccountRole.Owner)
    })

    it('returns valid AccountRole numbers as-is', () => {
      expect(normalizeInviteRole(AccountRole.Maintainer, AccountRole.Guest)).toBe(AccountRole.Maintainer)
    })

    it('returns fallback for unknown string', () => {
      expect(normalizeInviteRole('admin', AccountRole.User)).toBe(AccountRole.User)
    })

    it('returns fallback for undefined', () => {
      expect(normalizeInviteRole(undefined, AccountRole.Owner)).toBe(AccountRole.Owner)
    })

    it('returns fallback for invalid number', () => {
      expect(normalizeInviteRole(999 as AccountRole, AccountRole.Guest)).toBe(AccountRole.Guest)
    })
  })

  describe('normalizeInviteRoles', () => {
    it('returns fallback copy when values missing or empty', () => {
      const fallback = [AccountRole.Guest, AccountRole.User]
      expect(normalizeInviteRoles(undefined, fallback)).toEqual(fallback)
      expect(normalizeInviteRoles([], fallback)).toEqual(fallback)
      expect(normalizeInviteRoles(undefined, fallback)).not.toBe(fallback)
    })

    it('maps and deduplicates roles', () => {
      expect(normalizeInviteRoles(['user', 'USER', 'maintainer'], [AccountRole.Guest])).toEqual([
        AccountRole.User,
        AccountRole.Maintainer
      ])
    })

    it('maps unrecognized strings to User (inner fallback)', () => {
      expect(normalizeInviteRoles(['nope', 'x'], [AccountRole.Guest])).toEqual([AccountRole.User])
    })
  })

  describe('getDefaultInviteRole / getDefaultInviterRoles', () => {
    it('uses User and default generator list when metadata unset', () => {
      mockGetMetadata.mockReturnValue(undefined)
      expect(getDefaultInviteRole()).toBe(AccountRole.User)
      expect(getDefaultInviterRoles()).toEqual(DEFAULT_INVITE_LINK_GENERATOR_ROLES)
    })

    it('reads default invite role from metadata string', () => {
      mockGetMetadata.mockReturnValue('maintainer')
      expect(getDefaultInviteRole()).toBe(AccountRole.Maintainer)
    })
  })

  describe('resolveInviteSettings', () => {
    it('returns defaults when doc is undefined', () => {
      mockGetMetadata.mockReturnValue(undefined)
      const r = resolveInviteSettings(undefined)
      expect(r).toEqual({
        expirationTime: INVITE_SETTINGS_DEFAULT_EXPIRATION_HOURS,
        emailMask: '',
        limit: INVITE_SETTINGS_DEFAULT_LIMIT,
        defaultInviteRole: AccountRole.User,
        inviteLinkGeneratorRoles: DEFAULT_INVITE_LINK_GENERATOR_ROLES,
        noLimit: true
      })
    })

    it('uses doc fields and noLimit when limit is not -1', () => {
      const doc = inviteDoc({
        expirationTime: 12,
        emailMask: '*@corp.test',
        limit: 100,
        defaultInviteRole: AccountRole.Guest,
        inviteLinkGeneratorRoles: [AccountRole.Owner]
      })
      const r = resolveInviteSettings(doc)
      expect(r.expirationTime).toBe(12)
      expect(r.emailMask).toBe('*@corp.test')
      expect(r.limit).toBe(100)
      expect(r.defaultInviteRole).toBe(AccountRole.Guest)
      expect(r.inviteLinkGeneratorRoles).toEqual([AccountRole.Owner])
      expect(r.noLimit).toBe(false)
    })

    it('sets noLimit true when doc.limit is -1', () => {
      const doc = inviteDoc({
        expirationTime: 48,
        emailMask: '',
        limit: -1,
        defaultInviteRole: AccountRole.User,
        inviteLinkGeneratorRoles: [AccountRole.User]
      })
      expect(resolveInviteSettings(doc).noLimit).toBe(true)
    })

    it('uses DEFAULT_INVITE_LINK_GENERATOR_ROLES copy when doc list empty', () => {
      const doc = inviteDoc({
        expirationTime: 48,
        emailMask: '',
        limit: -1,
        defaultInviteRole: AccountRole.User,
        inviteLinkGeneratorRoles: []
      })
      const r = resolveInviteSettings(doc)
      expect(r.inviteLinkGeneratorRoles).toEqual(DEFAULT_INVITE_LINK_GENERATOR_ROLES)
      expect(r.inviteLinkGeneratorRoles).not.toBe(DEFAULT_INVITE_LINK_GENERATOR_ROLES)
    })

    it('normalizes string defaultInviteRole using metadata fallback', () => {
      mockGetMetadata.mockReturnValue('user')
      const doc = inviteDoc({
        expirationTime: 1,
        emailMask: '',
        limit: -1,
        defaultInviteRole: 'guest' as unknown as AccountRole,
        inviteLinkGeneratorRoles: [AccountRole.User]
      })
      expect(resolveInviteSettings(doc).defaultInviteRole).toBe(AccountRole.Guest)
    })
  })
})
