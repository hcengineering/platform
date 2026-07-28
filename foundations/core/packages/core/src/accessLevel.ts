//
// Copyright © 2025 Hardcore Engineering Inc.
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

import type { AccessLevel } from './classes'

/**
 * Ordinal rank of an access level: read < write < admin.
 *
 * `undefined` (missing level at a grant record) is treated as `read` — the
 * fail-safe minimal grant. This is the single place that maps the string-enum
 * to a comparable number, which is the evolution seam described in the design:
 * when `level` later becomes a `Ref<Role>`, only this helper (and hasAtLeast)
 * changes — every enforcement call-site keeps comparing via these helpers, not
 * via string equality.
 *
 * @public
 */
export function accessLevelRank (level?: AccessLevel): number {
  switch (level) {
    case 'admin':
      return 3
    case 'write':
      return 2
    default:
      // 'read' | undefined | any unexpected value → minimal
      return 1
  }
}

/**
 * True iff `level` grants at least the authority of `min` (ordinal compare).
 * Higher levels include lower ones (admin ⊇ write ⊇ read).
 *
 * @public
 */
export function hasAtLeast (level: AccessLevel | undefined, min: AccessLevel): boolean {
  return accessLevelRank(level) >= accessLevelRank(min)
}
