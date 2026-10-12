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
  ClassifierKind,
  type AccountUuid,
  type Class,
  type Client,
  type Doc,
  type Permission,
  type PersonId,
  type Ref,
  type Role,
  type RolesAssignment,
  type SpaceType,
  type SpaceTypeDescriptor
} from '@hcengineering/core'
import { canCreateFormCard, compatibleFormSpaces } from '../forms-space'

const account = 'member' as AccountUuid
const author = 'email-id' as PersonId
const metadata: Pick<Doc, 'space' | 'modifiedBy' | 'modifiedOn'> = {
  space: core.space.Model,
  modifiedBy: author,
  modifiedOn: 0
}
const type: MasterTag = {
  ...metadata,
  _id: 'card-type' as Ref<MasterTag>,
  _class: card.class.MasterTag,
  label: card.string.Card,
  kind: ClassifierKind.CLASS
}
const spaceType: SpaceType = {
  ...metadata,
  _id: 'space-type' as Ref<SpaceType>,
  _class: core.class.SpaceType,
  name: 'Space type',
  descriptor: 'space-type-descriptor' as Ref<SpaceTypeDescriptor>,
  targetClass: core.class.TypedSpace,
  roles: 1
}
const role: Role = {
  ...metadata,
  _id: 'creator-role' as Ref<Role>,
  _class: core.class.Role,
  name: 'Creator',
  attachedTo: spaceType._id,
  attachedToClass: core.class.SpaceType,
  collection: 'roles',
  permissions: ['allow-create' as Ref<Permission>]
}
const permission: Permission = {
  ...metadata,
  _id: 'allow-create' as Ref<Permission>,
  _class: core.class.Permission,
  label: card.string.AllowCreatingCards,
  objectClass: card.class.Card,
  txClass: core.class.TxCreateDoc,
  forbid: false
}
const data = { title: 'Allowed', parentInfo: [], blobs: {}, rank: '', content: '' as Card['content'] }

interface FormSpaceTestSetup {
  client: Client
  space: CardSpace
}

function setup (permissions: Permission[] = [permission], assigned = true): FormSpaceTestSetup {
  const hierarchy = {
    getBaseClass: (clazz: string) => clazz,
    isDerived: (child: string, parent: string) =>
      child === parent ||
      (child === type._id && parent === card.class.Card) ||
      (child === card.class.CardSpace && parent === core.class.TypedSpace),
    as: (space: CardSpace): RolesAssignment => ({ [role._id]: assigned && space._id !== 'denied' ? [account] : [] })
  }
  const client = {
    getHierarchy: () => hierarchy,
    getModel: () => ({
      findObject: () => spaceType,
      findAllSync: (clazz: Ref<Class<Doc>>) => (clazz === core.class.Role ? [role] : permissions)
    })
  } as unknown as Client
  const space: CardSpace = {
    ...metadata,
    _id: 'space-one' as Ref<CardSpace>,
    _class: card.class.CardSpace,
    type: spaceType._id,
    restricted: true,
    archived: false,
    types: [type._id],
    name: 'Space',
    description: '',
    private: false,
    members: [account]
  }
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
    expect(canCreateFormCard(client, { ...space, restricted: false }, type, account, author, data)).toBe(false)
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
    const incompatible: CardSpace = {
      ...space,
      _id: 'incompatible' as Ref<CardSpace>,
      types: ['different-type' as Ref<MasterTag>]
    }
    const archived: CardSpace = { ...space, _id: 'archived' as Ref<CardSpace>, archived: true }
    const second: CardSpace = { ...space, _id: 'second' as Ref<CardSpace> }
    const denied: CardSpace = { ...space, _id: 'denied' as Ref<CardSpace> }
    const ordered = compatibleFormSpaces(client, type, [incompatible, archived, denied, space, second])
    expect(ordered.map((space) => space._id)).toEqual([denied._id, space._id, second._id])
    expect(ordered.find((space) => canCreateFormCard(client, space, type, account, author, data))?._id).toBe(space._id)
  })
})
