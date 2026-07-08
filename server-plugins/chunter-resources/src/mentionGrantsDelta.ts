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

import type { AccountUuid, Class, Collaborator, Ref, Space } from '@hcengineering/core'

/**
 * A `grantedVia:'mention'` Collaborator record scoped to a single message
 * (`grantedByMessage === message._id`). Only the fields needed to build a
 * `TxRemoveDoc` plus the account for diffing are carried.
 *
 * @public
 */
export interface ExistingMentionGrant {
  _id: Ref<Collaborator>
  _class: Ref<Class<Collaborator>>
  space: Ref<Space>
  collaborator: AccountUuid
}

/**
 * @public
 */
export interface MentionGrantDelta {
  toCreate: AccountUuid[]
  toRemove: ExistingMentionGrant[]
}

/**
 * Pure reconciliation of the mention-provenance Collaborator records for ONE
 * message against the set of accounts that should currently hold a mention
 * grant (the `desired` list — already consent- and author-gate-filtered by the
 * caller).
 *
 * - `toCreate`: desired accounts that have no existing mention record yet
 *   (deduplicated). The caller writes them with `grantedVia:'mention'`,
 *   `grantedByMessage:<msg>`, `level:'read'`.
 * - `toRemove`: existing mention records whose account is no longer desired.
 *   Passing `desired = []` (message deleted, or the last mention removed on an
 *   edit) yields `toRemove = existing`, `toCreate = []`.
 *
 * Contract: the caller MUST pass only records scoped to this message
 * (`grantedVia:'mention' && grantedByMessage === message._id`). The function
 * never sees structural (`grantedVia === undefined`), `manual` or `group`
 * records, so those are provably never created or removed — a person granted
 * via several provenances keeps access until the LAST source is gone.
 *
 * @public
 */
export function computeMentionGrantDelta (
  desired: AccountUuid[],
  existing: ExistingMentionGrant[]
): MentionGrantDelta {
  const existingAccounts = new Set(existing.map((r) => r.collaborator))
  const desiredSet = new Set(desired)
  const toCreate = Array.from(desiredSet).filter((a) => !existingAccounts.has(a))
  const toRemove = existing.filter((r) => !desiredSet.has(r.collaborator))
  return { toCreate, toRemove }
}
