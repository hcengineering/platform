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

/** Workspace-member roles an admin may assign; mirrors server `assignableRoles`. */
export const ASSIGNABLE_ROLES: readonly AccountRole[] = [
  AccountRole.Guest,
  AccountRole.User,
  AccountRole.Maintainer,
  AccountRole.Owner
]

const ASSIGNABLE = new Set<string>(ASSIGNABLE_ROLES)

/**
 * Coerce a DropdownIntlItem.id (typed `string` after the dropdown round-trip)
 * back to an assignable AccountRole. AccountRole is a STRING enum ('USER', …);
 * the previous `Number(v)` produced NaN for every value. Throws on anything
 * else (including Admin/DocGuest/ReadOnlyGuest, which are not member roles)
 * so a mismatch surfaces in the UI instead of reaching the API.
 */
export function parseRole (v: unknown): AccountRole {
  if (typeof v === 'string' && ASSIGNABLE.has(v)) return v as AccountRole
  throw new Error(`parseRole: not an assignable workspace role: ${JSON.stringify(v)}`)
}
