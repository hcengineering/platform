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

import card, { type Card, type CardSpace, type MasterTag } from '@hcengineering/card'
import core, {
  type AccountUuid, type Class, type Client, type Doc, type Permission,
  type PersonId, type Ref, type Role, type RolesAssignment, type SpaceType
} from '@hcengineering/core'
import { canCreateFormCard, compatibleFormSpaces } from '../forms-space'

const account = 'member' as AccountUuid
const author = 'email-id' as PersonId
const type = { _id: 'card-type', _class: card.class.MasterTag } as MasterTag
const spaceType = { _id: 'space-type', targetClass: 'space-roles' } as SpaceType
const role = { _id: 'creator-role', permissions: ['allow-create'] } as Role
const permission = {
  _id: 'allow-create', objectClass: card.class.Card, txClass: core.class.TxCreateDoc, forbid: false
} as Permission
const data = { title: 'Allowed', parentInfo: [], blobs: {}, rank: '', content: '' as Card['content'] }

function setup (permissions: Permission[] = [permission], assigned = true) {
  const hierarchy = {
    getBaseClass: (clazz: string) => clazz,
    isDerived: (child: string, parent: string) =>
      child === parent || (child === type._id && parent === card.class.Card) ||
      (child === card.class.CardSpace && parent === core.class.TypedSpace),
    as: (space: CardSpace) => ({ [role._id]: assigned && space._id !== 'denied' ? [account] : [] } as RolesAssignment)
  }
  const client = {
    getHierarchy: () => hierarchy,
    getModel: () => ({
      findObject: () => spaceType,
      findAllSync: (clazz: Ref<Class<Doc>>) => clazz === core.class.Role ? [role] : permissions
    })
  } as unknown as Client
  const space = {
    _id: 'space-one', _class: card.class.CardSpace, type: spaceType._id, restricted: true,
    archived: false, types: [type._id]
  } as unknown as CardSpace
  return { client, space }
}

describe('form destination permissions', () => {
  it('allows an assigned creator and rejects a workspace member without the required space role', () => {
    const assigned = setup()
    expect(canCreateFormCard(assigned.client, assigned.space, type, account, author, data)).toBe(true)
    const missing = setup([permission], false)
    expect(canCreateFormCard(missing.client, missing.space, type, account, author, data)).toBe(false)
  })

  it('honors explicit creation prohibitions even for unrestricted spaces', () => {
    const { client, space } = setup([{ ...permission, forbid: true }])
    expect(canCreateFormCard(client, { ...space, restricted: false } as CardSpace, type, account, author, data)).toBe(false)
  })

  it('evaluates conditional permissions against the actual submission', () => {
    const { client, space } = setup([
      { ...permission, txMatch: { 'attributes.title': 'Allowed' } },
      { ...permission, _id: 'default-deny' as Ref<Permission>, forbid: true }
    ])
    expect(canCreateFormCard(client, space, type, account, author)).toBe(true)
    expect(canCreateFormCard(client, space, type, account, author, data)).toBe(true)
    expect(canCreateFormCard(client, space, type, account, author, { ...data, title: 'Other' })).toBe(false)
  })

  it('skips incompatible and archived spaces and selects the first permitted compatible space', () => {
    const { client, space } = setup()
    const incompatible = { ...space, _id: 'incompatible', types: ['different-type'] } as CardSpace
    const archived = { ...space, _id: 'archived', archived: true } as CardSpace
    const second = { ...space, _id: 'second' } as CardSpace
    const denied = { ...space, _id: 'denied' } as CardSpace
    const ordered = compatibleFormSpaces(client, type, [incompatible, archived, denied, space, second])
    expect(ordered.map((space) => space._id)).toEqual([denied._id, space._id, second._id])
    expect(ordered.find((space) => canCreateFormCard(client, space, type, account, author, data))?._id).toBe(space._id)
  })
})
