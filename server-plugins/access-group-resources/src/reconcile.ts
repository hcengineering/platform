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

import type { AccessLevel, AccountUuid, Collaborator, Ref } from '@hcengineering/core'

/**
 * The subset of a materialized group-provenance Collaborator that the reconcile
 * diff needs. Kept minimal so the algorithm stays pure and unit-testable
 * without a running DB.
 */
export interface GroupCollabRecord {
  _id: Ref<Collaborator>
  collaborator: AccountUuid
  level?: AccessLevel
}

/**
 * The desired-vs-actual diff for a single GroupGrant. `toCreate` lists the
 * members that need a fresh group-collaborator at `desiredLevel`; `toRemove`
 * lists the record ids to delete (non-members, wrong-level, or duplicates).
 */
export interface ReconcilePlan {
  toCreate: AccountUuid[]
  toRemove: Array<Ref<Collaborator>>
}

/**
 * Normalize an access level: a missing level counts as 'read' (fail-safe
 * minimal), matching the Collaborator/GroupGrant schema contract.
 */
export function normalizeLevel (level?: AccessLevel): AccessLevel {
  return level ?? 'read'
}

/**
 * Pure reconcile for ONE GroupGrant.
 *
 * Desired state: for every member `m` of the grant's group, exactly one
 * Collaborator `{ collaborator: m, level: desiredLevel, grantedVia: 'group',
 * grantedByGroup: <grant._id> }`. `existing` MUST already be pre-filtered to the
 * records carrying this grant's `grantedByGroup` — so records of other
 * provenance (manual/mention/structural) and of other grants are never in
 * scope and are therefore never removed.
 *
 * Guarantees (unit-tested in reconcile.test.ts):
 *  - level change → the wrong-level record is removed and a new one created
 *    (Collaborator records are immutable, so re-level = remove + create);
 *  - duplicates for the same member collapse to one;
 *  - a member removed from the group loses exactly its record here;
 *  - IDEMPOTENT: applying the plan and re-running yields an empty plan.
 */
export function reconcileGrant (
  members: AccountUuid[],
  desiredLevel: AccessLevel,
  existing: GroupCollabRecord[]
): ReconcilePlan {
  const wanted = normalizeLevel(desiredLevel)
  const memberSet = new Set<AccountUuid>(members)
  const toCreate: AccountUuid[] = []
  const toRemove: Array<Ref<Collaborator>> = []
  // Members that already have exactly one kept record at the correct level.
  const satisfied = new Set<AccountUuid>()

  for (const rec of existing) {
    const good =
      memberSet.has(rec.collaborator) && normalizeLevel(rec.level) === wanted && !satisfied.has(rec.collaborator)
    if (good) {
      satisfied.add(rec.collaborator)
    } else {
      // non-member, wrong level, or a duplicate of an already-kept member
      toRemove.push(rec._id)
    }
  }

  for (const m of members) {
    if (!satisfied.has(m)) toCreate.push(m)
  }

  return { toCreate, toRemove }
}

/**
 * Teardown for a removed GroupGrant: every record in scope is surplus. Equivalent
 * to reconciling against an empty membership.
 */
export function teardownGrant (existing: GroupCollabRecord[]): ReconcilePlan {
  return reconcileGrant([], 'read', existing)
}
