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

export function evaluateGroupAccess (
  claims: OidcClaims | undefined,
  allowedGroups: string | undefined
): OidcGroupAccess {
  const allowed = parseAllowedGroups(allowedGroups)
  if (allowed.length === 0) return 'allowed'
  if (claims == null) return 'missing'

  if (claims._claim_names != null || claims._claim_sources != null || claims.hasgroups === true) {
    return 'overage'
  }

  const groups = claims.groups
  if (!Array.isArray(groups)) return 'missing'

  const actual = new Set(groups.filter((group): group is string => typeof group === 'string').map(normalizeGroup))
  return allowed.some((group) => actual.has(group)) ? 'allowed' : 'denied'
}
