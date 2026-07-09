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

/**
 * Tests for CollaboratorGuardMiddleware (design section 2.4).
 *
 * Verifies fail-closed authorization of client-initiated writes to
 * access-granting Collaborator records on provideSecurity classes, while
 * leaving System (trigger) writes and non-secured (notification) collaborators
 * untouched.
 */

import core, {
  AccountRole,
  generateId,
  Hierarchy,
  MeasureMetricsContext,
  systemAccountUuid,
  TxFactory,
  type Account,
  type AccountUuid,
  type Class,
  type Collaborator,
  type AccessGroup,
  type Doc,
  type GroupGrant,
  type MeasureContext,
  type PersonId,
  type Ref,
  type SessionData,
  type Space,
  type Tx
} from '@hcengineering/core'
import type { PipelineContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { CollaboratorGuardMiddleware } from '../collaboratorGuard'

const SECURED_CLASS = 'test:class:Issue' as Ref<Class<Doc>>
const CHANNEL_CLASS = 'test:class:Channel' as Ref<Class<Doc>>
const ISSUE_SPACE = 'test:space:Issue' as Ref<Space>
const ISSUE_ID = 'test:doc:Issue1' as Ref<Doc>

type FindAllFn = (ctx: MeasureContext, _class: Ref<Class<Doc>>, query: any, options?: object) => Promise<Doc[]>

function uuid (): AccountUuid {
  return generateId() as unknown as AccountUuid
}

function makeAccount (role: AccountRole, id?: AccountUuid): Account {
  const u = id ?? uuid()
  return {
    uuid: u,
    role,
    primarySocialId: 'test' as PersonId,
    socialIds: ['test' as PersonId],
    fullSocialIds: []
  }
}

function makeCtx (account: Account): MeasureContext<SessionData> {
  const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
  ctx.contextData = {
    account,
    broadcast: { txes: [], queue: [], sessions: {} }
  } as any
  return ctx
}

function makePipelineContext (): PipelineContext {
  const hierarchy = new Hierarchy()
  const model = { findAllSync: (_class: any, _query: any) => [] } as any
  return {
    workspace: { uuid: 'test-workspace' as any, url: 'test', dataId: 'test' as any },
    hierarchy,
    modelDb: model,
    branding: null as any,
    adapterManager: {} as any,
    storageAdapter: {} as any,
    contextVars: {},
    lastTx: '',
    lastHash: '',
    broadcastEvent: async () => {}
  } as any
}

/**
 * Build a guard whose model opts SECURED_CLASS into provideSecurity (but NOT
 * CHANNEL_CLASS). `findAll` supplies space + collaborator lookups.
 */
function makeMw (
  findAll: FindAllFn,
  nextFn?: (ctx: MeasureContext, txes: Tx[]) => Promise<TxMiddlewareResult>
): CollaboratorGuardMiddleware {
  const context = makePipelineContext()
  const next = nextFn !== undefined ? { tx: nextFn } : { tx: async (_c: MeasureContext, _t: Tx[]) => ({}) }
  const mw = new (CollaboratorGuardMiddleware as any)(context, next)
  mw.findAll = findAll
  mw.context.hierarchy.isDerived = (a: any, b: any) => a === b
  mw.context.hierarchy.getAncestors = (id: any) => [id]
  mw.context.modelDb = {
    findAllSync: (_class: any, _q: any) => [{ attachedTo: SECURED_CLASS, provideSecurity: true }]
  }
  return mw
}

function makeSpace (members: AccountUuid[], owners: AccountUuid[] = []): Space {
  return { _id: ISSUE_SPACE, members, owners } as any
}

/** findAll that serves an optional space and optional collaborators / group grants / access groups. */
function serve (opts: {
  space?: Space
  /** The attachedTo target doc the guard loads to authorize against its REAL space.
   *  Defaults to an Issue living in ISSUE_SPACE (mirrors the tx objectSpace). */
  targetDoc?: Doc
  collaborators?: Collaborator[]
  groupGrants?: GroupGrant[]
  accessGroups?: AccessGroup[]
}): FindAllFn {
  return async (_ctx, _class, query) => {
    if (_class === core.class.Space) {
      return opts.space !== undefined && query?._id === opts.space._id ? [opts.space] : []
    }
    if (_class === SECURED_CLASS) {
      // The target doc the grant attaches to. Default lives in ISSUE_SPACE so the
      // grant record's objectSpace (ISSUE_SPACE) mirrors it (the non-exploit case).
      const doc = opts.targetDoc ?? ({ _id: ISSUE_ID, _class: SECURED_CLASS, space: ISSUE_SPACE } as any)
      return query?._id === doc._id ? [doc] : []
    }
    if (_class === core.class.Collaborator) {
      let list = opts.collaborators ?? []
      if (query?._id !== undefined) list = list.filter((c) => c._id === query._id)
      if (query?.attachedTo !== undefined) list = list.filter((c) => c.attachedTo === query.attachedTo)
      if (query?.collaborator !== undefined) list = list.filter((c) => c.collaborator === query.collaborator)
      return list as any
    }
    if (_class === core.class.GroupGrant) {
      let list = opts.groupGrants ?? []
      if (query?._id !== undefined) list = list.filter((g) => g._id === query._id)
      if (query?.group !== undefined) list = list.filter((g) => (g as any).group === query.group)
      return list as any
    }
    if (_class === core.class.AccessGroup) {
      let list = opts.accessGroups ?? []
      if (query?._id !== undefined) list = list.filter((g) => g._id === query._id)
      return list as any
    }
    return []
  }
}

function makeCreateTx (
  account: Account,
  attrs: Partial<Collaborator>,
  targetClass: Ref<Class<Doc>> = SECURED_CLASS,
  attachedTo: Ref<Doc> = ISSUE_ID
): Tx {
  const factory = new TxFactory(account.primarySocialId)
  const inner = factory.createTxCreateDoc<Collaborator>(core.class.Collaborator, ISSUE_SPACE, attrs as any)
  return factory.createTxCollectionCUD(targetClass, attachedTo as any, ISSUE_SPACE, 'collaborators', inner)
}

function makeRemoveTx (account: Account, collabId: Ref<Collaborator>): Tx {
  const factory = new TxFactory(account.primarySocialId)
  return factory.createTxRemoveDoc(core.class.Collaborator, ISSUE_SPACE, collabId)
}

function makeUpdateTx (account: Account, collabId: Ref<Collaborator>): Tx {
  const factory = new TxFactory(account.primarySocialId)
  return factory.createTxUpdateDoc(core.class.Collaborator, ISSUE_SPACE, collabId, { level: 'admin' } as any)
}

function makeGroupCreateTx (
  account: Account,
  attrs: Partial<GroupGrant>,
  targetClass: Ref<Class<Doc>> = SECURED_CLASS,
  attachedTo: Ref<Doc> = ISSUE_ID
): Tx {
  const factory = new TxFactory(account.primarySocialId)
  const inner = factory.createTxCreateDoc<GroupGrant>(core.class.GroupGrant, ISSUE_SPACE, attrs as any)
  return factory.createTxCollectionCUD(targetClass, attachedTo as any, ISSUE_SPACE, 'groupGrants', inner)
}

function makeGroupRemoveTx (account: Account, grantId: Ref<GroupGrant>): Tx {
  const factory = new TxFactory(account.primarySocialId)
  return factory.createTxRemoveDoc(core.class.GroupGrant, ISSUE_SPACE, grantId)
}

function makeGroupUpdateTx (account: Account, grantId: Ref<GroupGrant>, operations: Record<string, any>): Tx {
  const factory = new TxFactory(account.primarySocialId)
  return factory.createTxUpdateDoc(core.class.GroupGrant, ISSUE_SPACE, grantId, operations as any)
}

function groupGrantRecord (over: Partial<GroupGrant>): GroupGrant {
  return {
    _id: over._id ?? generateId(),
    _class: core.class.GroupGrant,
    space: ISSUE_SPACE,
    attachedTo: ISSUE_ID,
    attachedToClass: SECURED_CLASS,
    collection: 'groupGrants',
    modifiedOn: Date.now(),
    modifiedBy: 'test' as PersonId,
    group: generateId() as any,
    grantedBy: uuid(),
    ...over
  } as any
}

const GROUP_ID = 'test:doc:Group1' as Ref<AccessGroup>

function makeAccessGroupCreateTx (account: Account, attrs: Partial<AccessGroup>): Tx {
  const factory = new TxFactory(account.primarySocialId)
  return factory.createTxCreateDoc<AccessGroup>(core.class.AccessGroup, ISSUE_SPACE, attrs as any)
}

function makeAccessGroupUpdateTx (account: Account, id: Ref<AccessGroup>, operations: Record<string, any>): Tx {
  const factory = new TxFactory(account.primarySocialId)
  return factory.createTxUpdateDoc(core.class.AccessGroup, ISSUE_SPACE, id, operations as any)
}

function makeAccessGroupRemoveTx (account: Account, id: Ref<AccessGroup>): Tx {
  const factory = new TxFactory(account.primarySocialId)
  return factory.createTxRemoveDoc(core.class.AccessGroup, ISSUE_SPACE, id)
}

function accessGroupRecord (over: Partial<AccessGroup>): AccessGroup {
  return {
    _id: over._id ?? GROUP_ID,
    _class: core.class.AccessGroup,
    space: ISSUE_SPACE,
    modifiedOn: Date.now(),
    modifiedBy: 'test' as PersonId,
    name: 'G',
    members: [],
    owners: [],
    ...over
  } as any
}

function collabRecord (over: Partial<Collaborator>): Collaborator {
  return {
    _id: over._id ?? generateId(),
    _class: core.class.Collaborator,
    space: ISSUE_SPACE,
    attachedTo: ISSUE_ID,
    attachedToClass: SECURED_CLASS,
    collection: 'collaborators',
    modifiedOn: Date.now(),
    modifiedBy: 'test' as PersonId,
    collaborator: uuid(),
    ...over
  } as any
}

describe('CollaboratorGuardMiddleware', () => {
  // ─── create ────────────────────────────────────────────────────────────────
  it('rejects manual grant create by non-member of the target space', async () => {
    const actor = makeAccount(AccountRole.User)
    const mw = makeMw(serve({ space: makeSpace([]) }))
    const tx = makeCreateTx(actor, { collaborator: uuid(), grantedVia: 'manual', grantedBy: actor.uuid, level: 'read' })
    await expect(mw.tx(makeCtx(actor), [tx])).rejects.toThrow()
  })

  it('rejects create with grantedVia mention from client', async () => {
    const actor = makeAccount(AccountRole.User)
    const mw = makeMw(serve({ space: makeSpace([actor.uuid]) }))
    const tx = makeCreateTx(actor, {
      collaborator: uuid(),
      grantedVia: 'mention' as any,
      grantedBy: actor.uuid,
      level: 'read'
    })
    await expect(mw.tx(makeCtx(actor), [tx])).rejects.toThrow()
  })

  it('rejects create with grantedBy !== actor', async () => {
    const actor = makeAccount(AccountRole.User)
    const mw = makeMw(serve({ space: makeSpace([actor.uuid]) }))
    const tx = makeCreateTx(actor, { collaborator: uuid(), grantedVia: 'manual', grantedBy: uuid(), level: 'read' })
    await expect(mw.tx(makeCtx(actor), [tx])).rejects.toThrow()
  })

  it('rejects create with invalid level string', async () => {
    const actor = makeAccount(AccountRole.User)
    const mw = makeMw(serve({ space: makeSpace([actor.uuid]) }))
    const tx = makeCreateTx(actor, {
      collaborator: uuid(),
      grantedVia: 'manual',
      grantedBy: actor.uuid,
      level: 'superuser' as any
    })
    await expect(mw.tx(makeCtx(actor), [tx])).rejects.toThrow()
  })

  it('allows manual read grant create by space member (role User)', async () => {
    const actor = makeAccount(AccountRole.User)
    let nextCalled = false
    const mw = makeMw(serve({ space: makeSpace([actor.uuid]) }), async () => {
      nextCalled = true
      return {}
    })
    const tx = makeCreateTx(actor, { collaborator: uuid(), grantedVia: 'manual', grantedBy: actor.uuid, level: 'read' })
    await mw.tx(makeCtx(actor), [tx])
    expect(nextCalled).toBe(true)
  })

  it('allows manual write grant create by space member', async () => {
    const actor = makeAccount(AccountRole.User)
    let nextCalled = false
    const mw = makeMw(serve({ space: makeSpace([actor.uuid]) }), async () => {
      nextCalled = true
      return {}
    })
    const tx = makeCreateTx(actor, {
      collaborator: uuid(),
      grantedVia: 'manual',
      grantedBy: actor.uuid,
      level: 'write'
    })
    await mw.tx(makeCtx(actor), [tx])
    expect(nextCalled).toBe(true)
  })

  it('allows create by admin-level grantee of the doc (no space membership)', async () => {
    const actor = makeAccount(AccountRole.User)
    let nextCalled = false
    const adminGrant = collabRecord({ collaborator: actor.uuid, grantedVia: 'manual', level: 'admin' })
    const mw = makeMw(serve({ space: makeSpace([]), collaborators: [adminGrant] }), async () => {
      nextCalled = true
      return {}
    })
    const tx = makeCreateTx(actor, { collaborator: uuid(), grantedVia: 'manual', grantedBy: actor.uuid, level: 'read' })
    await mw.tx(makeCtx(actor), [tx])
    expect(nextCalled).toBe(true)
  })

  it('rejects create by non-admin-level grantee (read-only) of the doc', async () => {
    const actor = makeAccount(AccountRole.User)
    const readGrant = collabRecord({ collaborator: actor.uuid, grantedVia: 'manual', level: 'read' })
    const mw = makeMw(serve({ space: makeSpace([]), collaborators: [readGrant] }))
    const tx = makeCreateTx(actor, { collaborator: uuid(), grantedVia: 'manual', grantedBy: actor.uuid, level: 'read' })
    await expect(mw.tx(makeCtx(actor), [tx])).rejects.toThrow()
  })

  it('allows workspace Maintainer to grant even without space membership', async () => {
    const actor = makeAccount(AccountRole.Maintainer)
    let nextCalled = false
    const mw = makeMw(serve({ space: makeSpace([]) }), async () => {
      nextCalled = true
      return {}
    })
    const tx = makeCreateTx(actor, {
      collaborator: uuid(),
      grantedVia: 'manual',
      grantedBy: actor.uuid,
      level: 'admin'
    })
    await mw.tx(makeCtx(actor), [tx])
    expect(nextCalled).toBe(true)
  })

  // ─── C-01: cross-space authority laundering ──────────────────────────────────
  // The Postgres visibility grant keys on `attachedTo` alone (collab_sec.attachedTo
  // = domain._id), independent of the grant record's own space. So authority MUST
  // be judged against the target doc's REAL space, never the client-chosen
  // objectSpace. A user who owns/joins space A must not be able to grant themselves
  // access to a doc that lives in a foreign space B by writing the grant into A.
  it('C-01: rejects manual grant whose objectSpace ≠ the target doc space', async () => {
    const actor = makeAccount(AccountRole.User)
    // actor OWNS ISSUE_SPACE (= tx objectSpace) but the target issue lives in a foreign space.
    const foreignDoc = { _id: ISSUE_ID, _class: SECURED_CLASS, space: 'test:space:Foreign' as Ref<Space> } as any
    const mw = makeMw(serve({ space: makeSpace([], [actor.uuid]), targetDoc: foreignDoc }))
    const tx = makeCreateTx(actor, {
      collaborator: uuid(),
      grantedVia: 'manual',
      grantedBy: actor.uuid,
      level: 'admin'
    })
    await expect(mw.tx(makeCtx(actor), [tx])).rejects.toThrow()
  })

  it('C-01: rejects GroupGrant whose objectSpace ≠ the target doc space', async () => {
    const actor = makeAccount(AccountRole.User)
    const foreignDoc = { _id: ISSUE_ID, _class: SECURED_CLASS, space: 'test:space:Foreign' as Ref<Space> } as any
    const mw = makeMw(serve({ space: makeSpace([], [actor.uuid]), targetDoc: foreignDoc }))
    const tx = makeGroupCreateTx(actor, { group: generateId() as any, grantedBy: actor.uuid, level: 'admin' })
    await expect(mw.tx(makeCtx(actor), [tx])).rejects.toThrow()
  })

  it('C-01 fail-closed: rejects manual grant when the target doc cannot be resolved', async () => {
    const actor = makeAccount(AccountRole.User)
    // Owner of the space, but the attachedTo doc does not exist → cannot prove its space.
    const mw = makeMw(
      serve({
        space: makeSpace([], [actor.uuid]),
        targetDoc: { _id: 'test:doc:Absent' as Ref<Doc>, _class: SECURED_CLASS, space: ISSUE_SPACE } as any
      })
    )
    const tx = makeCreateTx(actor, { collaborator: uuid(), grantedVia: 'manual', grantedBy: actor.uuid, level: 'read' })
    await expect(mw.tx(makeCtx(actor), [tx])).rejects.toThrow()
  })

  // ─── system / trigger path ───────────────────────────────────────────────────
  it('allows System (trigger) writes untouched', async () => {
    const sys = makeAccount(AccountRole.Owner, systemAccountUuid)
    let nextCalled = false
    const mw = makeMw(serve({}), async () => {
      nextCalled = true
      return {}
    })
    // group-provenance create that a client could never do:
    const tx = makeCreateTx(sys, {
      collaborator: uuid(),
      grantedVia: 'group',
      grantedByGroup: generateId()
    })
    await mw.tx(makeCtx(sys), [tx])
    expect(nextCalled).toBe(true)
  })

  // ─── remove ──────────────────────────────────────────────────────────────────
  it('allows grantee self-remove of own mention-grant', async () => {
    const actor = makeAccount(AccountRole.User)
    let nextCalled = false
    const rec = collabRecord({ collaborator: actor.uuid, grantedVia: 'mention', grantedByMessage: generateId() })
    const mw = makeMw(serve({ space: makeSpace([]), collaborators: [rec] }), async () => {
      nextCalled = true
      return {}
    })
    await mw.tx(makeCtx(actor), [makeRemoveTx(actor, rec._id)])
    expect(nextCalled).toBe(true)
  })

  it('rejects grantee self-remove of structural collaborator', async () => {
    const actor = makeAccount(AccountRole.User)
    // structural = grantedVia undefined; actor is the collaborator but not owner/maintainer
    const rec = collabRecord({ collaborator: actor.uuid })
    const mw = makeMw(serve({ space: makeSpace([]), collaborators: [rec] }))
    await expect(mw.tx(makeCtx(actor), [makeRemoveTx(actor, rec._id)])).rejects.toThrow()
  })

  it('allows granting actor to revoke a manual grant', async () => {
    const actor = makeAccount(AccountRole.User)
    let nextCalled = false
    const rec = collabRecord({ collaborator: uuid(), grantedVia: 'manual', grantedBy: actor.uuid })
    const mw = makeMw(serve({ space: makeSpace([]), collaborators: [rec] }), async () => {
      nextCalled = true
      return {}
    })
    await mw.tx(makeCtx(actor), [makeRemoveTx(actor, rec._id)])
    expect(nextCalled).toBe(true)
  })

  it('rejects remove of a manual grant by an unrelated non-privileged user', async () => {
    const stranger = makeAccount(AccountRole.User)
    const rec = collabRecord({ collaborator: uuid(), grantedVia: 'manual', grantedBy: uuid() })
    const mw = makeMw(serve({ space: makeSpace([]), collaborators: [rec] }))
    await expect(mw.tx(makeCtx(stranger), [makeRemoveTx(stranger, rec._id)])).rejects.toThrow()
  })

  it('allows space owner to remove a structural collaborator', async () => {
    const owner = makeAccount(AccountRole.User)
    let nextCalled = false
    const rec = collabRecord({ collaborator: uuid() }) // structural
    const mw = makeMw(serve({ space: makeSpace([], [owner.uuid]), collaborators: [rec] }), async () => {
      nextCalled = true
      return {}
    })
    await mw.tx(makeCtx(owner), [makeRemoveTx(owner, rec._id)])
    expect(nextCalled).toBe(true)
  })

  it('fail-closed: reject remove when the record cannot be resolved', async () => {
    const actor = makeAccount(AccountRole.User)
    const mw = makeMw(serve({ space: makeSpace([]), collaborators: [] }))
    await expect(mw.tx(makeCtx(actor), [makeRemoveTx(actor, generateId())])).rejects.toThrow()
  })

  // ─── update / immutability ────────────────────────────────────────────────────
  it('rejects TxUpdateDoc on grant records (immutable, level change = remove+create)', async () => {
    const actor = makeAccount(AccountRole.Maintainer)
    const rec = collabRecord({ collaborator: uuid(), grantedVia: 'manual', grantedBy: actor.uuid })
    const mw = makeMw(serve({ space: makeSpace([], [actor.uuid]), collaborators: [rec] }))
    await expect(mw.tx(makeCtx(actor), [makeUpdateTx(actor, rec._id)])).rejects.toThrow()
  })

  // ─── non-secured (notification) classes pass through ──────────────────────────
  it('passes through create of collaborators on non-provideSecurity classes (channels)', async () => {
    const actor = makeAccount(AccountRole.User)
    let nextCalled = false
    // CHANNEL_CLASS is not opted into provideSecurity in the model mock.
    const mw = makeMw(serve({}), async () => {
      nextCalled = true
      return {}
    })
    const tx = makeCreateTx(actor, { collaborator: uuid() }, CHANNEL_CLASS, 'test:doc:Channel1' as Ref<Doc>)
    await mw.tx(makeCtx(actor), [tx])
    expect(nextCalled).toBe(true)
  })

  it('passes through remove of collaborators on non-provideSecurity classes (channels)', async () => {
    const actor = makeAccount(AccountRole.User)
    let nextCalled = false
    const rec = collabRecord({ collaborator: uuid(), attachedToClass: CHANNEL_CLASS })
    const mw = makeMw(serve({ collaborators: [rec] }), async () => {
      nextCalled = true
      return {}
    })
    await mw.tx(makeCtx(actor), [makeRemoveTx(actor, rec._id)])
    expect(nextCalled).toBe(true)
  })

  // ─── GroupGrant CUD (P4.1) ─────────────────────────────────────────────────
  it('allows GroupGrant create by space owner', async () => {
    const owner = makeAccount(AccountRole.User)
    let nextCalled = false
    const mw = makeMw(serve({ space: makeSpace([], [owner.uuid]) }), async () => {
      nextCalled = true
      return {}
    })
    const tx = makeGroupCreateTx(owner, { group: generateId() as any, grantedBy: owner.uuid, level: 'read' })
    await mw.tx(makeCtx(owner), [tx])
    expect(nextCalled).toBe(true)
  })

  it('rejects GroupGrant create by a non-owner space member (role User, no ≥User path)', async () => {
    const member = makeAccount(AccountRole.User)
    const mw = makeMw(serve({ space: makeSpace([member.uuid]) }))
    const tx = makeGroupCreateTx(member, { group: generateId() as any, grantedBy: member.uuid, level: 'read' })
    await expect(mw.tx(makeCtx(member), [tx])).rejects.toThrow()
  })

  it('allows GroupGrant create by an admin-level grantee of the doc', async () => {
    const actor = makeAccount(AccountRole.User)
    let nextCalled = false
    const adminGrant = collabRecord({ collaborator: actor.uuid, grantedVia: 'manual', level: 'admin' })
    const mw = makeMw(serve({ space: makeSpace([]), collaborators: [adminGrant] }), async () => {
      nextCalled = true
      return {}
    })
    const tx = makeGroupCreateTx(actor, { group: generateId() as any, grantedBy: actor.uuid, level: 'write' })
    await mw.tx(makeCtx(actor), [tx])
    expect(nextCalled).toBe(true)
  })

  it('rejects GroupGrant create with invalid level', async () => {
    const owner = makeAccount(AccountRole.User)
    const mw = makeMw(serve({ space: makeSpace([], [owner.uuid]) }))
    const tx = makeGroupCreateTx(owner, { group: generateId() as any, grantedBy: owner.uuid, level: 'root' as any })
    await expect(mw.tx(makeCtx(owner), [tx])).rejects.toThrow()
  })

  it('allows GroupGrant level-only update (the one mutable field)', async () => {
    const owner = makeAccount(AccountRole.User)
    let nextCalled = false
    const rec = groupGrantRecord({ level: 'read' })
    const mw = makeMw(serve({ space: makeSpace([], [owner.uuid]), groupGrants: [rec] }), async () => {
      nextCalled = true
      return {}
    })
    await mw.tx(makeCtx(owner), [makeGroupUpdateTx(owner, rec._id, { level: 'write' })])
    expect(nextCalled).toBe(true)
  })

  it('rejects GroupGrant update of a non-level field', async () => {
    const owner = makeAccount(AccountRole.Maintainer)
    const rec = groupGrantRecord({ level: 'read' })
    const mw = makeMw(serve({ space: makeSpace([], [owner.uuid]), groupGrants: [rec] }))
    await expect(
      mw.tx(makeCtx(owner), [makeGroupUpdateTx(owner, rec._id, { group: generateId() as any })])
    ).rejects.toThrow()
  })

  it('rejects GroupGrant level update to an invalid value', async () => {
    const owner = makeAccount(AccountRole.Maintainer)
    const rec = groupGrantRecord({ level: 'read' })
    const mw = makeMw(serve({ space: makeSpace([], [owner.uuid]), groupGrants: [rec] }))
    await expect(mw.tx(makeCtx(owner), [makeGroupUpdateTx(owner, rec._id, { level: 'root' })])).rejects.toThrow()
  })

  it('allows GroupGrant remove by workspace Maintainer', async () => {
    const maint = makeAccount(AccountRole.Maintainer)
    let nextCalled = false
    const rec = groupGrantRecord({})
    const mw = makeMw(serve({ space: makeSpace([]), groupGrants: [rec] }), async () => {
      nextCalled = true
      return {}
    })
    await mw.tx(makeCtx(maint), [makeGroupRemoveTx(maint, rec._id)])
    expect(nextCalled).toBe(true)
  })

  it('rejects GroupGrant remove by an unrelated non-privileged user', async () => {
    const stranger = makeAccount(AccountRole.User)
    const rec = groupGrantRecord({})
    const mw = makeMw(serve({ space: makeSpace([stranger.uuid]), groupGrants: [rec] }))
    await expect(mw.tx(makeCtx(stranger), [makeGroupRemoveTx(stranger, rec._id)])).rejects.toThrow()
  })

  it('fail-closed: reject GroupGrant remove when the grant cannot be resolved', async () => {
    const owner = makeAccount(AccountRole.Maintainer)
    const mw = makeMw(serve({ space: makeSpace([]), groupGrants: [] }))
    await expect(mw.tx(makeCtx(owner), [makeGroupRemoveTx(owner, generateId())])).rejects.toThrow()
  })

  it('rejects GroupGrant create on a non-secured class (fail-closed)', async () => {
    const owner = makeAccount(AccountRole.Maintainer)
    const mw = makeMw(serve({ space: makeSpace([], [owner.uuid]) }))
    const tx = makeGroupCreateTx(
      owner,
      { group: generateId() as any, grantedBy: owner.uuid, level: 'read' },
      CHANNEL_CLASS,
      'test:doc:Channel1' as Ref<Doc>
    )
    await expect(mw.tx(makeCtx(owner), [tx])).rejects.toThrow()
  })

  // ─── AccessGroup CUD (P4.1/4.3) ────────────────────────────────────────────
  it('allows AccessGroup create when creator lists itself as owner', async () => {
    const actor = makeAccount(AccountRole.User)
    let nextCalled = false
    const mw = makeMw(serve({}), async () => {
      nextCalled = true
      return {}
    })
    await mw.tx(makeCtx(actor), [makeAccessGroupCreateTx(actor, { name: 'G', members: [], owners: [actor.uuid] })])
    expect(nextCalled).toBe(true)
  })

  it('rejects AccessGroup create when creator is not among owners (no orphan groups)', async () => {
    const actor = makeAccount(AccountRole.User)
    const mw = makeMw(serve({}))
    await expect(
      mw.tx(makeCtx(actor), [makeAccessGroupCreateTx(actor, { name: 'G', members: [], owners: [uuid()] })])
    ).rejects.toThrow()
  })

  it('allows AccessGroup membership update by an owner', async () => {
    const owner = makeAccount(AccountRole.User)
    let nextCalled = false
    const g = accessGroupRecord({ owners: [owner.uuid] })
    const mw = makeMw(serve({ accessGroups: [g] }), async () => {
      nextCalled = true
      return {}
    })
    await mw.tx(makeCtx(owner), [makeAccessGroupUpdateTx(owner, g._id, { $push: { members: uuid() } })])
    expect(nextCalled).toBe(true)
  })

  it('rejects AccessGroup membership update by a non-owner (escalation guard)', async () => {
    const stranger = makeAccount(AccountRole.User)
    const g = accessGroupRecord({ owners: [uuid()] })
    const mw = makeMw(serve({ accessGroups: [g] }))
    await expect(
      mw.tx(makeCtx(stranger), [makeAccessGroupUpdateTx(stranger, g._id, { $push: { members: stranger.uuid } })])
    ).rejects.toThrow()
  })

  it('rejects AccessGroup delete while a GroupGrant still references it', async () => {
    const owner = makeAccount(AccountRole.User)
    const g = accessGroupRecord({ owners: [owner.uuid] })
    const grant = groupGrantRecord({ group: g._id })
    const mw = makeMw(serve({ accessGroups: [g], groupGrants: [grant] }))
    await expect(mw.tx(makeCtx(owner), [makeAccessGroupRemoveTx(owner, g._id)])).rejects.toThrow()
  })

  it('allows AccessGroup delete by owner when no GroupGrant references it', async () => {
    const owner = makeAccount(AccountRole.User)
    let nextCalled = false
    const g = accessGroupRecord({ owners: [owner.uuid] })
    const mw = makeMw(serve({ accessGroups: [g], groupGrants: [] }), async () => {
      nextCalled = true
      return {}
    })
    await mw.tx(makeCtx(owner), [makeAccessGroupRemoveTx(owner, g._id)])
    expect(nextCalled).toBe(true)
  })
})
