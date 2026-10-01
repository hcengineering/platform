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

/**
 * Regression tests for SpacePermissionsMiddleware and object-scoped permissions.
 *
 * Object-scoped permissions (`scope: 'object'`) are declared without `txClass`/`txMatch`/`forbid`
 * (see models/tracker/src/permissions.ts). This suite proves that adding such declarations to the
 * model does not change any allow/deny decision of the space permission check:
 *  - restricted-space fallback (user without a role): a Permission without txClass never matches,
 *    including the TxMixin branch of isTxClassMatched;
 *  - role path (user whose space role references an object-scoped permission): the permission
 *    never matches, so the decision falls through exactly as before.
 *
 * The matrix (4 tx kinds x 2 users x 2 space variants) is evaluated against a model without and with
 * the object-scoped declarations; results must be identical and equal to the expected develop baseline.
 *
 * Negative control: the same declarations with a behaviour-changing `txClass` (TxCreateDoc) must make the
 * matrix diverge, so the comparison demonstrably detects a change in the declarations.
 */

import core, {
  type Account,
  type AccountUuid,
  type Class,
  ClassifierKind,
  type Doc,
  DOMAIN_MODEL,
  generateId,
  Hierarchy,
  MeasureMetricsContext,
  type MeasureContext,
  type Mixin,
  ModelDb,
  type Obj,
  type Permission,
  type PersonId,
  type Ref,
  type Role,
  type SessionData,
  type Space,
  type SpaceType,
  type Tx,
  TxFactory,
  type TypedSpace
} from '@hcengineering/core'
import type { IntlString } from '@hcengineering/platform'
import type { PipelineContext } from '@hcengineering/server-core'
import { SpacePermissionsMiddleware } from '../spacePermissions'

// Test model mirroring the tracker shapes (the middleware package does not depend on tracker).
const ISSUE = 'test:class:Issue' as Ref<Class<Doc>>
const ISSUE_MIXIN = 'test:mixin:IssueExt' as Ref<Mixin<Doc>>
const PROJECT = 'test:class:Project' as Ref<Class<TypedSpace>>
const PROJECT_TYPE_MIXIN = 'test:mixin:ProjectTypeData' as Ref<Mixin<Space>>
const SPACE_TYPE = 'test:spaceType:Project' as Ref<SpaceType>
const ROLE = 'test:role:Member' as Ref<Role>

// Baseline (develop) space permissions on issues.
const PERM_UPDATE = 'test:permission:UpdateIssue' as Ref<Permission>
const PERM_REMOVE = 'test:permission:RemoveIssue' as Ref<Permission>

// Object-scoped declarations, same shape as tracker.permission.* in models/tracker/src/permissions.ts.
const OBJECT_PERMISSIONS: Array<Ref<Permission>> = [
  'tracker:permission:ReadIssue' as Ref<Permission>,
  'tracker:permission:CommentOnIssue' as Ref<Permission>,
  'tracker:permission:EditIssue' as Ref<Permission>,
  'tracker:permission:TransitionIssue' as Ref<Permission>,
  'tracker:permission:DeleteIssue' as Ref<Permission>
]
const EDIT_ISSUE = OBJECT_PERMISSIONS[2]

const RESTRICTED_SPACE = 'test:space:Restricted' as Ref<TypedSpace>
const OPEN_SPACE = 'test:space:Open' as Ref<TypedSpace>

const USER_WITHOUT_ROLE = 'user-without-role' as AccountUuid
const USER_WITH_ROLE = 'user-with-role' as AccountUuid

const txFactory = new TxFactory(core.account.System)
const userTxFactory = new TxFactory('test:social:user' as PersonId)

type TxKind = 'TxCreateDoc' | 'TxUpdateDoc' | 'TxRemoveDoc' | 'TxMixin'
const TX_KINDS: TxKind[] = ['TxCreateDoc', 'TxUpdateDoc', 'TxRemoveDoc', 'TxMixin']
type Decision = 'allow' | 'deny'

function createClassTx (
  _id: Ref<Class<Obj>>,
  _extends: Ref<Class<Obj>> | undefined,
  kind: ClassifierKind = ClassifierKind.CLASS
): Tx {
  return txFactory.createTxCreateDoc(
    core.class.Class,
    core.space.Model,
    { label: _id as unknown as IntlString, extends: _extends, kind, domain: DOMAIN_MODEL } as any,
    _id
  )
}

function createModelDocTx<T extends Doc> (_class: Ref<Class<T>>, _id: Ref<T>, attributes: Record<string, any>): Tx {
  return txFactory.createTxCreateDoc(_class, core.space.Model, attributes as any, _id)
}

function buildModel (
  withObjectPermissions: boolean,
  objectPermissionTxClass?: Ref<Class<Tx>>
): { hierarchy: Hierarchy, modelDb: ModelDb } {
  const txes: Tx[] = [
    createClassTx(core.class.Obj, undefined),
    createClassTx(core.class.Doc, core.class.Obj),
    createClassTx(core.class.Class, core.class.Doc),
    createClassTx(core.class.Mixin, core.class.Class),
    createClassTx(core.class.AttachedDoc, core.class.Doc),
    createClassTx(core.class.Space, core.class.Doc),
    createClassTx(core.class.TypedSpace, core.class.Space),
    createClassTx(core.class.SpaceType, core.class.Doc),
    createClassTx(core.class.Role, core.class.AttachedDoc),
    createClassTx(core.class.Permission, core.class.Doc),
    createClassTx(PROJECT, core.class.TypedSpace),
    createClassTx(PROJECT_TYPE_MIXIN, PROJECT, ClassifierKind.MIXIN),
    createClassTx(ISSUE, core.class.AttachedDoc),
    createClassTx(ISSUE_MIXIN, ISSUE, ClassifierKind.MIXIN),
    createModelDocTx(core.class.SpaceType, SPACE_TYPE, {
      name: 'Project type',
      descriptor: 'test:descriptor:Project',
      targetClass: PROJECT_TYPE_MIXIN,
      roles: 1
    }),
    createModelDocTx(core.class.Role, ROLE, {
      attachedTo: SPACE_TYPE,
      attachedToClass: core.class.SpaceType,
      collection: 'roles',
      name: 'Member',
      // The role references an object-scoped permission; without the declarations the ref dangles.
      permissions: [PERM_UPDATE, EDIT_ISSUE]
    }),
    createModelDocTx(core.class.Permission, PERM_UPDATE, {
      label: 'UpdateIssue',
      txClass: core.class.TxUpdateDoc,
      objectClass: ISSUE,
      scope: 'space'
    }),
    createModelDocTx(core.class.Permission, PERM_REMOVE, {
      label: 'RemoveIssue',
      txClass: core.class.TxRemoveDoc,
      objectClass: ISSUE,
      scope: 'space'
    })
  ]

  if (withObjectPermissions) {
    for (const id of OBJECT_PERMISSIONS) {
      txes.push(
        createModelDocTx(core.class.Permission, id, {
          label: `${id}Label`,
          description: `${id}Description`,
          scope: 'object',
          objectClass: ISSUE,
          // Only set by the negative control below; the real declarations have no txClass.
          ...(objectPermissionTxClass !== undefined ? { txClass: objectPermissionTxClass } : {})
        })
      )
    }
  }

  const hierarchy = new Hierarchy()
  for (const tx of txes) {
    hierarchy.tx(tx)
  }
  const modelDb = new ModelDb(hierarchy)
  modelDb.addTxes(new MeasureMetricsContext('test', {}), txes, false)
  return { hierarchy, modelDb }
}

function makeSpace (_id: Ref<TypedSpace>, restricted: boolean): TypedSpace {
  return {
    _id,
    _class: PROJECT,
    space: core.space.Space,
    modifiedOn: 0,
    modifiedBy: core.account.System,
    name: _id,
    description: '',
    private: false,
    archived: false,
    members: [USER_WITHOUT_ROLE, USER_WITH_ROLE],
    type: SPACE_TYPE,
    restricted,
    [PROJECT_TYPE_MIXIN]: { [ROLE]: [USER_WITH_ROLE] }
  } as any
}

function makeMiddleware (
  withObjectPermissions: boolean,
  objectPermissionTxClass?: Ref<Class<Tx>>
): SpacePermissionsMiddleware {
  const { hierarchy, modelDb } = buildModel(withObjectPermissions, objectPermissionTxClass)
  const spaces = [makeSpace(RESTRICTED_SPACE, true), makeSpace(OPEN_SPACE, false)]
  const context: PipelineContext = {
    workspace: { uuid: 'test-workspace' as any, url: 'test', dataId: 'test' as any },
    hierarchy,
    modelDb,
    branding: null,
    adapterManager: {} as any,
    storageAdapter: {} as any,
    contextVars: {},
    lastTx: '',
    lastHash: '',
    broadcastEvent: async () => {}
  } as any
  const next: any = {
    findAll: async (_ctx: MeasureContext, _class: Ref<Class<Doc>>) => (_class === core.class.Space ? spaces : []),
    tx: async () => ({})
  }
  return new (SpacePermissionsMiddleware as any)(context, next)
}

function makeCtx (uuid: AccountUuid): MeasureContext<SessionData> {
  const account: Account = {
    uuid,
    role: 'USER' as any,
    primarySocialId: 'test:social:user' as PersonId,
    socialIds: ['test:social:user' as PersonId],
    fullSocialIds: []
  }
  const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
  ctx.contextData = { account, broadcast: { txes: [], queue: [], sessions: {} } } as any
  return ctx
}

function makeTx (kind: TxKind, space: Ref<Space>): Tx {
  const issueId = generateId<Doc>()
  switch (kind) {
    case 'TxCreateDoc':
      return userTxFactory.createTxCreateDoc(ISSUE, space, { title: 'new' } as any, issueId)
    case 'TxUpdateDoc':
      return userTxFactory.createTxUpdateDoc(ISSUE, space, issueId, { title: 'changed' } as any)
    case 'TxRemoveDoc':
      return userTxFactory.createTxRemoveDoc(ISSUE, space, issueId)
    case 'TxMixin':
      // Non-empty attributes: hits the isMixinUpdateTx branch of isTxClassMatched.
      return userTxFactory.createTxMixin(issueId, ISSUE, space, ISSUE_MIXIN, { estimation: 1 } as any)
  }
}

async function decide (
  mw: SpacePermissionsMiddleware,
  user: AccountUuid,
  space: Ref<Space>,
  kind: TxKind
): Promise<Decision> {
  try {
    await mw.tx(makeCtx(user), [makeTx(kind, space)])
    return 'allow'
  } catch (err: any) {
    return 'deny'
  }
}

async function evaluateMatrix (
  withObjectPermissions: boolean,
  objectPermissionTxClass?: Ref<Class<Tx>>
): Promise<Record<string, Decision>> {
  const mw = makeMiddleware(withObjectPermissions, objectPermissionTxClass)
  const result: Record<string, Decision> = {}
  for (const space of [RESTRICTED_SPACE, OPEN_SPACE]) {
    for (const user of [USER_WITHOUT_ROLE, USER_WITH_ROLE]) {
      for (const kind of TX_KINDS) {
        result[`${space} | ${user} | ${kind}`] = await decide(mw, user, space, kind)
      }
    }
  }
  return result
}

// Decisions on develop (no object-scoped declarations in the model).
const EXPECTED_BASELINE: Record<string, Decision> = {
  [`${RESTRICTED_SPACE} | ${USER_WITHOUT_ROLE} | TxCreateDoc`]: 'allow',
  [`${RESTRICTED_SPACE} | ${USER_WITHOUT_ROLE} | TxUpdateDoc`]: 'deny',
  [`${RESTRICTED_SPACE} | ${USER_WITHOUT_ROLE} | TxRemoveDoc`]: 'deny',
  [`${RESTRICTED_SPACE} | ${USER_WITHOUT_ROLE} | TxMixin`]: 'deny',
  [`${RESTRICTED_SPACE} | ${USER_WITH_ROLE} | TxCreateDoc`]: 'allow',
  [`${RESTRICTED_SPACE} | ${USER_WITH_ROLE} | TxUpdateDoc`]: 'allow',
  [`${RESTRICTED_SPACE} | ${USER_WITH_ROLE} | TxRemoveDoc`]: 'deny',
  [`${RESTRICTED_SPACE} | ${USER_WITH_ROLE} | TxMixin`]: 'allow',
  [`${OPEN_SPACE} | ${USER_WITHOUT_ROLE} | TxCreateDoc`]: 'allow',
  [`${OPEN_SPACE} | ${USER_WITHOUT_ROLE} | TxUpdateDoc`]: 'allow',
  [`${OPEN_SPACE} | ${USER_WITHOUT_ROLE} | TxRemoveDoc`]: 'allow',
  [`${OPEN_SPACE} | ${USER_WITHOUT_ROLE} | TxMixin`]: 'allow',
  [`${OPEN_SPACE} | ${USER_WITH_ROLE} | TxCreateDoc`]: 'allow',
  [`${OPEN_SPACE} | ${USER_WITH_ROLE} | TxUpdateDoc`]: 'allow',
  [`${OPEN_SPACE} | ${USER_WITH_ROLE} | TxRemoveDoc`]: 'allow',
  [`${OPEN_SPACE} | ${USER_WITH_ROLE} | TxMixin`]: 'allow'
}

describe('SpacePermissionsMiddleware - object-scoped permissions without txClass', () => {
  it('model fixture: object-scoped declarations are present only in the "with" model', () => {
    const without = buildModel(false).modelDb.findAllSync(core.class.Permission, { scope: 'object' })
    const withDecl = buildModel(true).modelDb.findAllSync(core.class.Permission, { scope: 'object' })
    expect(without).toHaveLength(0)
    expect(withDecl.map((p) => p._id).sort()).toEqual([...OBJECT_PERMISSIONS].sort())
    for (const p of withDecl) {
      expect(p.txClass).toBeUndefined()
      expect(p.txMatch).toBeUndefined()
      expect(p.forbid).toBeUndefined()
    }
  })

  it('baseline decisions without object-scoped declarations match develop behaviour', async () => {
    expect(await evaluateMatrix(false)).toEqual(EXPECTED_BASELINE)
  })

  it('decisions are identical after adding object-scoped declarations', async () => {
    const before = await evaluateMatrix(false)
    const after = await evaluateMatrix(true)
    expect(Object.keys(after)).toHaveLength(TX_KINDS.length * 2 * 2)
    expect(after).toEqual(before)
  })

  it('negative control: the same declarations with txClass TxCreateDoc change the decisions', async () => {
    const before = await evaluateMatrix(false)
    const mutated = await evaluateMatrix(true, core.class.TxCreateDoc)
    expect(mutated).not.toEqual(before)

    // In a restricted space, a user without a role now hits the fallback restriction on create.
    const changed = Object.keys(before).filter((key) => before[key] !== mutated[key])
    expect(changed).toEqual([`${RESTRICTED_SPACE} | ${USER_WITHOUT_ROLE} | TxCreateDoc`])
    expect(before[changed[0]]).toBe('allow')
    expect(mutated[changed[0]]).toBe('deny')
  })
})
