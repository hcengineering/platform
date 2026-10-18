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

import core, {
  AccountRole,
  MeasureMetricsContext,
  type Account,
  type AccountUuid,
  type Class,
  type Doc,
  type MeasureContext,
  type Permission,
  type PersonId,
  type Ref,
  type Role,
  type SessionData,
  type Space,
  type SpaceType,
  type Tx,
  type TxCUD,
  TxFactory,
  type TypedSpace
} from '@hcengineering/core'
import type { PipelineContext } from '@hcengineering/server-core'
import { SpacePermissionsMiddleware } from '../spacePermissions'

const SPACE_CLASS = 'test:class:Project' as Ref<Class<Space>>
const OBJECT_CLASS = 'test:class:Issue' as Ref<Class<Doc>>
const OBJECT_MIXIN = 'test:mixin:IssueMixin' as Ref<Class<Doc>>
const TYPE_MIXIN = 'test:mixin:ProjectTypeData' as Ref<Class<Doc>>
const SPACE_TYPE = 'test:spaceType:Project' as Ref<SpaceType>
const SPACE = 'test:space:Project' as Ref<TypedSpace>
const ROLE = 'test:role:Reader' as Ref<Role>
const ALLOW_UPDATE_ISSUE = 'test:permission:UpdateIssue' as Ref<Permission>
const CLASS_ALLOWED = 'test:class:Issue_allowed' as Ref<Permission>

const member = 'member-uuid' as AccountUuid
const other = 'other-uuid' as AccountUuid

function makePermission (_id: Ref<Permission>, data: Partial<Permission>): Permission {
  return {
    _id,
    _class: core.class.Permission,
    space: core.space.Model,
    modifiedOn: 0,
    modifiedBy: core.account.System,
    label: '' as any,
    scope: 'space',
    ...data
  }
}

const permissions: Permission[] = [
  makePermission(core.permission.ForbidCreateObject, { txClass: core.class.TxCreateDoc, forbid: true }),
  makePermission(core.permission.ForbidUpdateObject, { txClass: core.class.TxUpdateDoc, forbid: true }),
  makePermission(core.permission.ForbidDeleteObject, { txClass: core.class.TxRemoveDoc, forbid: true }),
  makePermission(ALLOW_UPDATE_ISSUE, { txClass: core.class.TxUpdateDoc, objectClass: OBJECT_CLASS as any }),
  makePermission(CLASS_ALLOWED, {
    txClass: core.class.TxUpdateDoc,
    objectClass: OBJECT_CLASS as any,
    txMatch: { objectClass: OBJECT_CLASS },
    forbid: false
  })
]

function makeMiddleware (rolePermissions: Array<Ref<Permission>>): SpacePermissionsMiddleware {
  const role: Role = {
    _id: ROLE,
    _class: core.class.Role,
    space: core.space.Model,
    attachedTo: SPACE_TYPE,
    name: 'Reader',
    permissions: rolePermissions
  } as any
  const spaceType: SpaceType = {
    _id: SPACE_TYPE,
    _class: core.class.SpaceType,
    space: core.space.Model,
    targetClass: TYPE_MIXIN
  } as any
  const space: TypedSpace = {
    _id: SPACE,
    _class: SPACE_CLASS,
    space: core.space.Space,
    type: SPACE_TYPE,
    members: [member, other],
    [ROLE]: [member]
  } as any

  const hierarchy = {
    isDerived: (_class: Ref<Class<Doc>>, base: Ref<Class<Doc>>) =>
      _class === base ||
      (_class === SPACE_CLASS && (base === core.class.Space || base === core.class.TypedSpace)) ||
      (_class === TYPE_MIXIN && base === core.class.Space),
    getAncestors: (_class: Ref<Class<Doc>>) => [_class],
    getBaseClass: (_class: Ref<Class<Doc>>) => _class,
    findAttribute: () => undefined,
    as: (doc: Doc) => doc
  }
  const modelDb = {
    findAllSync: (_class: Ref<Class<Doc>>, query: any) => {
      if (_class === core.class.SpaceType) return [spaceType]
      if (_class === core.class.Role) return [role]
      if (_class === core.class.Permission) return query?.objectClass !== undefined ? [] : permissions
      return []
    }
  }
  const context: PipelineContext = { hierarchy, modelDb } as any
  const next = {
    findAll: async (_ctx: MeasureContext, _class: Ref<Class<Doc>>) => (_class === core.class.Space ? [space] : []),
    tx: async () => ({})
  }
  return new (SpacePermissionsMiddleware as any)(context, next)
}

function makeCtx (uuid: AccountUuid, system = false): MeasureContext<SessionData> {
  const account: Account = {
    uuid,
    role: AccountRole.User,
    primarySocialId: system ? core.account.System : ('social' as PersonId),
    socialIds: [],
    fullSocialIds: []
  }
  const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
  ctx.contextData = { account, broadcast: { txes: [], queue: [], sessions: {} } } as any
  return ctx
}

const factory = new TxFactory('social' as PersonId)
const objectId = 'test:issue:1' as Ref<Doc>

const createTx = (): TxCUD<Doc> => factory.createTxCreateDoc(OBJECT_CLASS, SPACE, { title: 'x' } as any)
const updateTx = (): TxCUD<Doc> => factory.createTxUpdateDoc(OBJECT_CLASS, SPACE, objectId, { title: 'y' } as any)
const mixinTx = (): TxCUD<Doc> =>
  factory.createTxMixin(objectId, OBJECT_CLASS, SPACE, OBJECT_MIXIN, { field: 1 } as any)
const removeTx = (): TxCUD<Doc> => factory.createTxRemoveDoc(OBJECT_CLASS, SPACE, objectId)
const spaceUpdateTx = (): TxCUD<Doc> =>
  factory.createTxUpdateDoc(SPACE_CLASS, core.space.Space, SPACE, { archived: true } as any)
const spaceRolesTx = (): TxCUD<Doc> =>
  factory.createTxMixin(SPACE, SPACE_CLASS, core.space.Space, TYPE_MIXIN, { [ROLE]: [member] } as any)
const spaceRemoveTx = (): TxCUD<Doc> => factory.createTxRemoveDoc(SPACE_CLASS, core.space.Space, SPACE)

async function isAllowed (mw: SpacePermissionsMiddleware, tx: Tx, uuid: AccountUuid = member): Promise<boolean> {
  try {
    await mw.tx(makeCtx(uuid), [tx])
    return true
  } catch (err: any) {
    return false
  }
}

describe('SpacePermissionsMiddleware forbid create/update object', () => {
  it('ForbidCreateObject blocks creating objects in the space only', async () => {
    const mw = makeMiddleware([core.permission.ForbidCreateObject])
    expect(await isAllowed(mw, createTx())).toBe(false)
    expect(await isAllowed(mw, updateTx())).toBe(true)
    expect(await isAllowed(mw, removeTx())).toBe(true)
  })

  it('ForbidUpdateObject blocks updates and mixin updates of objects in the space', async () => {
    const mw = makeMiddleware([core.permission.ForbidUpdateObject])
    expect(await isAllowed(mw, updateTx())).toBe(false)
    expect(await isAllowed(mw, mixinTx())).toBe(false)
    expect(await isAllowed(mw, createTx())).toBe(true)
    expect(await isAllowed(mw, removeTx())).toBe(true)
  })

  it('does not restrict members without the role', async () => {
    const mw = makeMiddleware([core.permission.ForbidCreateObject, core.permission.ForbidUpdateObject])
    expect(await isAllowed(mw, createTx(), other)).toBe(true)
    expect(await isAllowed(mw, updateTx(), other)).toBe(true)
  })

  it('does not restrict the system account', async () => {
    const mw = makeMiddleware([core.permission.ForbidCreateObject, core.permission.ForbidUpdateObject])
    await expect(mw.tx(makeCtx(member, true), [createTx(), updateTx()])).resolves.toBeDefined()
  })

  it('checks transactions inside TxApplyIf', async () => {
    const mw = makeMiddleware([core.permission.ForbidUpdateObject])
    const apply = factory.createTxApplyIf(core.space.Workspace, 'scope', [], [], [updateTx()], 'test')
    expect(await isAllowed(mw, apply)).toBe(false)
  })

  it('does not lock role holders out of managing the space itself', async () => {
    const mw = makeMiddleware([core.permission.ForbidCreateObject, core.permission.ForbidUpdateObject])
    expect(await isAllowed(mw, spaceUpdateTx())).toBe(true)
    expect(await isAllowed(mw, spaceRolesTx())).toBe(true)
  })

  it('keeps ForbidDeleteObject applying to the space itself', async () => {
    const mw = makeMiddleware([core.permission.ForbidDeleteObject])
    expect(await isAllowed(mw, spaceRemoveTx())).toBe(false)
  })

  it('forbid wins over an allowing permission regardless of order', async () => {
    const mw1 = makeMiddleware([ALLOW_UPDATE_ISSUE, core.permission.ForbidUpdateObject])
    expect(await isAllowed(mw1, updateTx())).toBe(false)
    const mw2 = makeMiddleware([core.permission.ForbidUpdateObject, ALLOW_UPDATE_ISSUE])
    expect(await isAllowed(mw2, updateTx())).toBe(false)
  })

  it('a class/attribute permission with txMatch takes precedence over the generic forbid', async () => {
    const mw = makeMiddleware([core.permission.ForbidUpdateObject, CLASS_ALLOWED])
    expect(await isAllowed(mw, updateTx())).toBe(true)
  })
})
