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
import { getMetadata, type Metadata } from '@hcengineering/platform'
import setting, { type InviteSettings } from '@hcengineering/setting'

const settingInviteMetadata = setting.metadata as unknown as {
  DefaultInviteRole: Metadata<string | undefined>
  DefaultInviteLinkGeneratorRoles: Metadata<string[] | undefined>
}

const numericAccountRoles = new Set<number>(Object.values(AccountRole).filter((v) => typeof v === 'number') as number[])

export function normalizeInviteRole (value: string | AccountRole | undefined, fallback: AccountRole): AccountRole {
  if (value !== undefined && typeof value === 'number' && numericAccountRoles.has(value)) {
    return value as AccountRole
  }
  if (typeof value === 'string') {
    const n = value.toLowerCase()
    switch (n) {
      case 'guest':
        return AccountRole.Guest
      case 'user':
        return AccountRole.User
      case 'maintainer':
        return AccountRole.Maintainer
      case 'owner':
        return AccountRole.Owner
    }
  }
  return fallback
}

export function normalizeInviteRoles (
  values: Array<string | AccountRole> | undefined,
  fallback: AccountRole[]
): AccountRole[] {
  if (!Array.isArray(values) || values.length === 0) return [...fallback]
  const mapped = values.map((v) => normalizeInviteRole(v, AccountRole.User)).filter((r, i, arr) => arr.indexOf(r) === i)
  return mapped.length > 0 ? mapped : [...fallback]
}

export const DEFAULT_INVITE_LINK_GENERATOR_ROLES: AccountRole[] = [
  AccountRole.User,
  AccountRole.Maintainer,
  AccountRole.Owner
]

export const INVITE_SETTINGS_DEFAULT_EXPIRATION_HOURS = 48
export const INVITE_SETTINGS_DEFAULT_LIMIT = -1

export function getDefaultInviteRole (): AccountRole {
  return normalizeInviteRole(getMetadata(settingInviteMetadata.DefaultInviteRole), AccountRole.User)
}

export function getDefaultInviterRoles (): AccountRole[] {
  return normalizeInviteRoles(
    getMetadata(settingInviteMetadata.DefaultInviteLinkGeneratorRoles),
    DEFAULT_INVITE_LINK_GENERATOR_ROLES
  )
}

export interface ResolvedInviteSettings {
  expirationTime: number
  emailMask: string
  limit: number
  defaultInviteRole: AccountRole
  inviteLinkGeneratorRoles: AccountRole[]
  noLimit: boolean
}

export function resolveInviteSettings (doc: InviteSettings | undefined): ResolvedInviteSettings {
  const metaRole = getDefaultInviteRole()
  const metaGenerators = getDefaultInviterRoles()

  if (doc != null) {
    return {
      expirationTime: doc.expirationTime,
      emailMask: doc.emailMask,
      limit: doc.limit,
      defaultInviteRole: normalizeInviteRole(doc.defaultInviteRole as string | AccountRole | undefined, metaRole),
      inviteLinkGeneratorRoles:
        doc.inviteLinkGeneratorRoles != null && doc.inviteLinkGeneratorRoles.length > 0
          ? normalizeInviteRoles(
            doc.inviteLinkGeneratorRoles as Array<string | AccountRole>,
            DEFAULT_INVITE_LINK_GENERATOR_ROLES
          )
          : [...DEFAULT_INVITE_LINK_GENERATOR_ROLES],
      noLimit: doc.limit === -1
    }
  }

  return {
    expirationTime: INVITE_SETTINGS_DEFAULT_EXPIRATION_HOURS,
    emailMask: '',
    limit: INVITE_SETTINGS_DEFAULT_LIMIT,
    defaultInviteRole: metaRole,
    inviteLinkGeneratorRoles: metaGenerators,
    noLimit: true
  }
}
