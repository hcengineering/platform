//
// Copyright © 2026 TraceX SAS.
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

import type { Card, CardSpace, MasterTag } from '@hcengineering/card'
import core, {
  type AccountUuid,
  type Client,
  type Data,
  type Permission,
  type PersonId,
  type RolesAssignment,
  type TypedSpace,
  TxFactory,
  matchQuery
} from '@hcengineering/core'

/** Preflights ordinary space creation permissions; the user session remains the final transaction authority. */
export function canCreateFormCard (
  client: Client,
  space: CardSpace,
  type: MasterTag,
  account: AccountUuid,
  author: PersonId,
  data?: Data<Card>
): boolean {
  const hierarchy = client.getHierarchy()
  if (!hierarchy.isDerived(space._class, core.class.TypedSpace)) return true
  const typed = space as unknown as TypedSpace
  const spaceType = client.getModel().findObject(typed.type)
  if (spaceType === undefined) return false
  const assignment = hierarchy.as(space, spaceType.targetClass) as unknown as RolesAssignment
  const roles = client.getModel().findAllSync(core.class.Role, { attachedTo: spaceType._id })
  const permissionIds = new Set(
    roles.filter((role) => (assignment[role._id] ?? []).includes(account)).flatMap((role) => role.permissions)
  )
  const permissions = client.getModel().findAllSync(core.class.Permission, {})
  const tx = new TxFactory(author).createTxCreateDoc(
    type._id,
    space._id,
    data ?? {
      title: '',
      parentInfo: [],
      blobs: {},
      rank: '',
      content: '' as Card['content']
    }
  )
  function matches (permission: Permission): boolean {
    if (permission.txClass !== core.class.TxCreateDoc) return false
    if (permission.objectClass !== undefined && !hierarchy.isDerived(type._id, permission.objectClass)) return false
    if (permission.txMatch === undefined) return true
    // Opening a form requires potential access; submission checks the actual field values.
    if (data === undefined) return permission.forbid !== true
    return matchQuery([tx], permission.txMatch, tx._class, hierarchy, true).length > 0
  }

  let withoutMatch: Permission | undefined
  for (const id of permissionIds) {
    const permission = permissions.find((permission) => permission._id === id)
    if (permission === undefined || !matches(permission)) continue
    if (permission.txMatch === undefined) withoutMatch = permission
    else return permission.forbid !== true
  }
  if (withoutMatch !== undefined) return withoutMatch.forbid !== true
  if (typed.restricted !== true) return true
  return !permissions.some(matches)
}

/** Keeps only active spaces that accept this card type, preserving the caller's stable order. */
export function compatibleFormSpaces (client: Client, type: MasterTag, spaces: CardSpace[]): CardSpace[] {
  return spaces.filter(
    (space) =>
      !space.archived &&
      (space.types.length === 0 || space.types.some((parent) => client.getHierarchy().isDerived(type._id, parent)))
  )
}
