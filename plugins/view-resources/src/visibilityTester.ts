//
// Copyright © 2024 Hardcore Engineering Inc.
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
  checkPermission,
  getCurrentAccount,
  toIdMap,
  type Doc,
  type Space,
  type TypedSpace,
  type Ref,
  type Permission
} from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { get } from 'svelte/store'
import { spaceSpace } from './utils'

function isTypedSpace (space: Space): space is TypedSpace {
  return getClient().getHierarchy().isDerived(space._class, core.class.TypedSpace)
}

async function checkObjectPermission (objectPermission: Ref<Permission>, doc?: Doc | Doc[]) : Promise<boolean> {
  if (doc === undefined) {
    return false
  }

  const client = getClient()
  const targets = Array.isArray(doc) ? doc : [doc]
  // Note: allow deleting objects in NOT typed spaces for now
  const targetSpaces = toIdMap(
    (await client.findAll(core.class.Space, { _id: { $in: targets.map((t) => t.space) } })).filter(isTypedSpace)
  )

  return !(
    await Promise.all(
      Array.from(targetSpaces.entries()).map(
        async (s) => await checkPermission(client, objectPermission, s[0], s[1])
      )
    )
  ).some((r) => r)
}

export async function canCreateObject (doc?: Doc | Doc[]): Promise<boolean> {
  return await checkObjectPermission(core.permission.ForbidDeleteObject, doc)
}

export async function canEditObject (doc?: Doc | Doc[]): Promise<boolean> {
  return await checkObjectPermission(core.permission.ForbidDeleteObject, doc)
}

export async function canDeleteObject (doc?: Doc | Doc[]): Promise<boolean> {
  return await checkObjectPermission(core.permission.ForbidDeleteObject, doc)
}

async function checkSpacePermission (spacePermission: Ref<Permission>, doc?: Doc | Doc[], typedSpacePermission?: Ref<Permission>): Promise<boolean> {
  if (doc === undefined || Array.isArray(doc)) {
    return false
  }

  const space = doc as Space

  if ((space.owners ?? []).includes(getCurrentAccount().uuid)) {
    return true
  }

  const client = getClient()

  const _spaceSpace = get(spaceSpace) ?? (await client.findOne(core.class.TypedSpace, { _id: core.space.Space }))

  if (await checkPermission(client, spacePermission, core.space.Space, _spaceSpace)) {
    return true
  }

  if (typedSpacePermission !== undefined && isTypedSpace(space) && (await checkPermission(client, typedSpacePermission, space._id, space))) {
    return true
  }

  return false
}

export async function canEditSpace (doc?: Doc | Doc[]): Promise<boolean> {
  return await checkSpacePermission(core.permission.UpdateObject, doc, core.permission.UpdateSpace)
}

export async function canArchiveSpace (doc?: Doc | Doc[]): Promise<boolean> {
  return await checkSpacePermission(core.permission.DeleteObject, doc, core.permission.ArchiveSpace)
}

export async function canDeleteSpace (doc?: Doc | Doc[]): Promise<boolean> {
  return await checkSpacePermission(core.permission.DeleteObject, doc)
}

export async function canJoinSpace (doc?: Doc | Doc[]): Promise<boolean> {
  if (doc === undefined || Array.isArray(doc)) {
    return false
  }

  const space = doc as Space

  return !(space.members ?? []).includes(getCurrentAccount().uuid)
}

export async function canLeaveSpace (doc?: Doc | Doc[]): Promise<boolean> {
  if (doc === undefined || Array.isArray(doc)) {
    return false
  }

  const space = doc as Space

  return (space.members ?? []).includes(getCurrentAccount().uuid)
}

export function isClipboardAvailable (doc?: Doc | Doc[]): boolean {
  return isSecureContext && navigator.clipboard !== undefined
}
