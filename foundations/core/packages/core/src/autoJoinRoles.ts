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

import { AccountRole } from './classes'

/**
 * Toggle {@link AccountRole.Guest} in {@link Space.autoJoinForRoles}; other roles are preserved.
 * @public
 */
export function setWorkspaceGuestAutoJoinRoles (
  existing: AccountRole[] | undefined,
  includeGuest: boolean
): AccountRole[] {
  const next = new Set(existing ?? [])
  if (includeGuest) {
    next.add(AccountRole.Guest)
  } else {
    next.delete(AccountRole.Guest)
  }
  return Array.from(next)
}
