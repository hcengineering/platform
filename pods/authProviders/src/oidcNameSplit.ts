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

export interface OidcNameClaims {
  name?: string
  username?: string
  given_name?: string
  family_name?: string
}

export interface SplitName {
  first: string
  last: string
}

/**
 * Split an OIDC user's name into first/last fields, robust against IdPs
 * (notably Authentik with its default `profile` scope mapping) that have no
 * first/last separation and emit `given_name = full display name` with
 * `family_name` missing or blank.
 *
 * Without this guard, Huly's previous logic would stamp
 * `first = "Florian Preininger"` (from `given_name` verbatim) and derive
 * `last = "Preininger"` (from `name.split(' ').slice(1)` fallback), producing
 * the display name "Florian Preininger Preininger".
 *
 * Strict heuristic — Authentik-default shape is only assumed when:
 *   - `given_name.trim()` equals `name.trim()` exactly, AND
 *   - `family_name.trim()` is empty.
 *
 * No broad "given_name contains family_name" fallback (Codex plan-review
 * 2026-06-21): that would mangle legitimate compound names like
 * "Anna Lena Schmidt" / "van der Berg".
 */
export function splitOidcName (claims: OidcNameClaims): SplitName {
  const fullName = (claims.name ?? claims.username ?? '').trim()
  const givenRaw = (claims.given_name ?? '').trim()
  const familyRaw = (claims.family_name ?? '').trim()
  const nameParts = fullName.split(/\s+/).filter((s) => s.length > 0)

  // STRICT Authentik-default detection: given_name IS the full display name
  // AND family_name is missing/blank.
  const isAuthentikDefaultShape = givenRaw !== '' && givenRaw === fullName && familyRaw === ''

  const first: string = isAuthentikDefaultShape
    ? (nameParts[0] ?? '')
    : (givenRaw !== '' ? givenRaw : (nameParts[0] ?? ''))

  const last: string = isAuthentikDefaultShape
    ? nameParts.slice(1).join(' ')
    : (familyRaw !== '' ? familyRaw : nameParts.slice(1).join(' '))

  return { first, last }
}
