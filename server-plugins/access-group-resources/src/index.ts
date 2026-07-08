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

import core, {
  type AccessGroup,
  type AccountUuid,
  type Collaborator,
  type Doc,
  type GroupGrant,
  type Ref,
  type Tx,
  type TxCreateDoc,
  type TxRemoveDoc,
  type TxUpdateDoc,
  TxProcessor
} from '@hcengineering/core'
import type { TriggerControl } from '@hcengineering/server-core'

import { type GroupCollabRecord, normalizeLevel, reconcileGrant } from './reconcile'

/**
 * Load the group-provenance Collaborator records materialized for a single
 * GroupGrant (filtered by grantedByGroup — never touches other provenance).
 */
async function existingForGrant (control: TriggerControl, grant: GroupGrant): Promise<Collaborator[]> {
  return await control.findAll<Collaborator>(control.ctx, core.class.Collaborator, {
    attachedTo: grant.attachedTo,
    grantedVia: 'group',
    grantedByGroup: grant._id
  })
}

/**
 * Turn the pure reconcile diff for one GroupGrant into concrete Collaborator
 * create/remove transactions. All derived collaborators live on the grant's doc
 * and share its space.
 */
function reconcileTxes (control: TriggerControl, grant: GroupGrant, members: AccountUuid[], existing: Collaborator[]): Tx[] {
  const minimal: GroupCollabRecord[] = existing.map((c) => ({ _id: c._id, collaborator: c.collaborator, level: c.level }))
  const spaceById = new Map<Ref<Collaborator>, Collaborator['space']>(existing.map((c) => [c._id, c.space]))
  const plan = reconcileGrant(members, normalizeLevel(grant.level), minimal)
  const res: Tx[] = []

  for (const collaborator of plan.toCreate) {
    res.push(
      control.txFactory.createTxCreateDoc<Collaborator>(core.class.Collaborator, grant.space, {
        attachedTo: grant.attachedTo,
        attachedToClass: grant.attachedToClass,
        collaborator,
        collection: 'collaborators',
        grantedVia: 'group',
        grantedBy: grant.grantedBy,
        grantedByGroup: grant._id,
        level: normalizeLevel(grant.level)
      } as any)
    )
  }
  for (const id of plan.toRemove) {
    res.push(control.txFactory.createTxRemoveDoc(core.class.Collaborator, spaceById.get(id) ?? grant.space, id))
  }
  return res
}

/** Resolve the group's current membership; missing group ⇒ no members (teardown). */
async function groupMembers (control: TriggerControl, group: Ref<AccessGroup>): Promise<AccountUuid[]> {
  const g = (await control.findAll<AccessGroup>(control.ctx, core.class.AccessGroup, { _id: group }, { limit: 1 }))[0]
  return g?.members ?? []
}

/**
 * Trigger for GroupGrant create / remove / level-update. Materializes and
 * reconciles the derived group-collaborators (design 2.2 / P4.2). Runs as
 * System, so the CollaboratorGuardMiddleware lets the derived writes through.
 * @public
 */
export async function OnGroupGrantChanged (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    if (!control.hierarchy.isDerived((tx as any).objectClass, core.class.GroupGrant)) continue

    if (tx._class === core.class.TxCreateDoc) {
      const grant = TxProcessor.createDoc2Doc(tx as TxCreateDoc<GroupGrant>)
      const members = await groupMembers(control, grant.group)
      result.push(...reconcileTxes(control, grant, members, await existingForGrant(control, grant)))
    } else if (tx._class === core.class.TxUpdateDoc) {
      const upd = tx as TxUpdateDoc<GroupGrant>
      if (!('level' in upd.operations)) continue // only level changes affect materialization
      const grant = (
        await control.findAll<GroupGrant>(control.ctx, core.class.GroupGrant, { _id: upd.objectId }, { limit: 1 })
      )[0]
      if (grant === undefined) continue
      const members = await groupMembers(control, grant.group)
      result.push(...reconcileTxes(control, grant, members, await existingForGrant(control, grant)))
    } else if (tx._class === core.class.TxRemoveDoc) {
      const rm = tx as TxRemoveDoc<GroupGrant>
      // The grant is gone: every record it materialized is surplus. Query by the
      // removed grant's id (grantedByGroup) — teardown = reconcile against ∅.
      const orphans = await control.findAll<Collaborator>(control.ctx, core.class.Collaborator, {
        grantedVia: 'group',
        grantedByGroup: rm.objectId as unknown as Ref<GroupGrant>
      })
      for (const c of orphans) {
        result.push(control.txFactory.createTxRemoveDoc(core.class.Collaborator, c.space, c._id))
      }
    }
  }
  return result
}

/** True iff an AccessGroup update touches its `members` (set / $push / $pull). */
function touchesMembers (operations: Record<string, any>): boolean {
  if ('members' in operations) return true
  for (const op of ['$push', '$pull', '$pullAll'] as const) {
    const v = operations[op]
    if (v != null && typeof v === 'object' && 'members' in v) return true
  }
  return false
}

/**
 * Trigger for AccessGroup membership changes. Re-reconciles every GroupGrant of
 * the group so members added/removed gain/lose access on all granted docs.
 * @public
 */
export async function OnAccessGroupChanged (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxUpdateDoc) continue
    const upd = tx as TxUpdateDoc<AccessGroup>
    if (!control.hierarchy.isDerived(upd.objectClass, core.class.AccessGroup)) continue
    if (!touchesMembers(upd.operations as Record<string, any>)) continue

    const members = await groupMembers(control, upd.objectId)
    const grants = await control.findAll<GroupGrant>(control.ctx, core.class.GroupGrant, { group: upd.objectId })
    for (const grant of grants) {
      result.push(...reconcileTxes(control, grant, members, await existingForGrant(control, grant)))
    }
  }
  return result
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnGroupGrantChanged,
    OnAccessGroupChanged
  }
})

export { reconcileGrant, teardownGrant, normalizeLevel } from './reconcile'
export type { GroupCollabRecord, ReconcilePlan } from './reconcile'
