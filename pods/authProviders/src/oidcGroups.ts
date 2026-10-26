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

import { type OidcClaims } from './oidcClaims'

export type OidcGroupAccess = 'allowed' | 'denied' | 'missing' | 'overage'
export type OidcGroupsState = 'available' | 'missing' | 'overage'

export interface OidcGroups {
  state: OidcGroupsState
  groups: string[]
}

function normalizeGroup (value: string): string {
  return value.trim().toLowerCase()
}

export function parseAllowedGroups (value: string | undefined): string[] {
  return [
    ...new Set(
      (value ?? '')
        .split(',')
        .map(normalizeGroup)
        .filter((group) => group !== '')
    )
  ]
}

export function getOidcGroups (claims: OidcClaims | undefined): OidcGroups {
  if (claims == null) return { state: 'missing', groups: [] }

  if (claims._claim_names != null || claims._claim_sources != null || claims.hasgroups === true) {
    return { state: 'overage', groups: [] }
  }

  if (!Array.isArray(claims.groups)) return { state: 'missing', groups: [] }

  return {
    state: 'available',
    groups: [
      ...new Set(claims.groups.filter((group): group is string => typeof group === 'string').map(normalizeGroup))
    ]
  }
}

export function evaluateGroupAccess (
  claims: OidcClaims | undefined,
  allowedGroups: string | null | undefined
): OidcGroupAccess {
  // `null` is reserved for an invalid derived allowlist. It must not be
  // treated like an unset/empty explicit allowlist, which intentionally means
  // unrestricted access for backwards compatibility.
  if (allowedGroups === null) return 'denied'
  const allowed = parseAllowedGroups(allowedGroups)
  if (allowed.length === 0) return 'allowed'
  const oidcGroups = getOidcGroups(claims)
  if (oidcGroups.state !== 'available') return oidcGroups.state

  const actual = new Set(oidcGroups.groups)
  return allowed.some((group) => actual.has(group)) ? 'allowed' : 'denied'
}
