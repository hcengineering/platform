//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

/**
 * Unit tests for GuestPermissionsMiddleware - permission rules (removeRules, updateRules) and verifyPermissionRules.
 */

import core, {
  AccountRole,
  type Class,
  type Doc,
  type FindResult,
  generateId,
  Hierarchy,
  type MeasureContext,
  MeasureMetricsContext,
  ModelDb,
  type PersonId,
  type Ref,
  type Space,
  type SessionData,
  TxFactory,
  toFindResult
} from '@hcengineering/core'
import type { Middleware, PipelineContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { GuestPermissionsMiddleware } from '../guestPermissions'

const testClass = 'guest-perms:class:TestDoc' as Ref<Class<Doc>>
const testSpace = 'guest-perms:space:Test' as Ref<Space>
const guestPersonId = 'guest-perms:person:Guest' as PersonId
const otherPersonId = 'guest-perms:person:Other' as PersonId

interface TxAccessLevelMixin {
  createAccessLevel?: AccountRole
  removeAccessLevel?: AccountRole
  updateAccessLevel?: AccountRole
  removeRules?: Partial<Record<AccountRole, Array<{ requireOwnership?: boolean }>>>
  updateRules?: Partial<Record<AccountRole, Array<{ requireOwnership?: boolean }>>>
  isIdentity?: boolean
}

function createGuestAccount (personId: PersonId = guestPersonId): SessionData['account'] {
  return {
    uuid: 'guest-uuid' as any,
    role: AccountRole.Guest,
    primarySocialId: personId,
    socialIds: [personId],
    fullSocialIds: []
  }
}

function createPipelineContext (txAccessMixin: TxAccessLevelMixin): { context: PipelineContext, hierarchy: Hierarchy } {
  const hierarchy = new Hierarchy()
  const model = new ModelDb(hierarchy)

  jest.spyOn(hierarchy, 'classHierarchyMixin').mockImplementation((_class, mixin) => {
    if (mixin === core.mixin.TxAccessLevel) {
      return txAccessMixin as any
    }
    return undefined
  })

  jest.spyOn(hierarchy, 'isDerived').mockReturnValue(false)

  const context: PipelineContext = {
    workspace: { uuid: 'test' as any, url: 'test', dataId: 'test' as any },
    hierarchy,
    modelDb: model,
    branding: null as any,
    adapterManager: {} as any,
    storageAdapter: {} as any,
    contextVars: {},
    lastTx: '',
    lastHash: '',
    broadcastEvent: async () => {}
  }
  return { context, hierarchy }
}

async function createMiddleware (ctx: PipelineContext, next: Middleware): Promise<GuestPermissionsMiddleware> {
  const measureCtx = new MeasureMetricsContext('test', {}) as MeasureContext
  return await GuestPermissionsMiddleware.create(measureCtx, ctx, next)
}

function createNextMiddleware (
  txHandler: () => Promise<TxMiddlewareResult>,
  findAllHandler: () => Promise<FindResult<Doc>>
): Middleware {
  const middleware: Middleware = {
    tx: txHandler,
    findAll: findAllHandler as any,
    loadModel: async () => [],
    searchFulltext: async () => ({ docs: [], total: 0 }),
    groupBy: async () => new Map(),
    domainRequest: async (_ctx: any, domain: any, _params: any) => ({ domain, value: null }),
    handleBroadcast: async () => {},
    closeSession: async () => {}
  } as any
  return middleware
}

describe('GuestPermissionsMiddleware - permission rules', () => {
  const txFactory = new TxFactory(guestPersonId)
  const docId = generateId<Doc>()

  it('should allow Guest to remove when removeAccessLevel is Guest and no removeRules', async () => {
    const mixin: TxAccessLevelMixin = {
      removeAccessLevel: AccountRole.Guest
    }
    const { context } = createPipelineContext(mixin)
    const nextTx = jest.fn().mockResolvedValue({})
    const next = createNextMiddleware(nextTx, async () => toFindResult([]))
    const middleware = await createMiddleware(context, next)

    const removeTx = txFactory.createTxRemoveDoc(testClass, testSpace, docId)
    const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
    ctx.contextData = { account: createGuestAccount() } as any

    await expect(middleware.tx(ctx, [removeTx])).resolves.toEqual({})
    expect(nextTx).toHaveBeenCalled()
  })

  it('should allow Guest to remove when removeRules has requireOwnership and user is creator', async () => {
    const mixin: TxAccessLevelMixin = {
      removeAccessLevel: AccountRole.Guest,
      removeRules: { [AccountRole.Guest]: [{ requireOwnership: true }] }
    }
    const docWithCreator = {
      _id: docId,
      _class: testClass,
      space: testSpace,
      modifiedOn: 1,
      modifiedBy: guestPersonId,
      createdBy: guestPersonId
    }
    const { context } = createPipelineContext(mixin)
    const nextTx = jest.fn().mockResolvedValue({})
    const next = createNextMiddleware(nextTx, async () => toFindResult([docWithCreator], 1))
    const middleware = await createMiddleware(context, next)

    const removeTx = txFactory.createTxRemoveDoc(testClass, testSpace, docId)
    removeTx.modifiedBy = guestPersonId
    const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
    ctx.contextData = { account: createGuestAccount(guestPersonId) } as any

    await expect(middleware.tx(ctx, [removeTx])).resolves.toEqual({})
    expect(nextTx).toHaveBeenCalled()
  })

  it('should forbid Guest to remove when removeRules has requireOwnership and user is not creator', async () => {
    const mixin: TxAccessLevelMixin = {
      removeAccessLevel: AccountRole.Guest,
      removeRules: { [AccountRole.Guest]: [{ requireOwnership: true }] }
    }
    const docByOther = {
      _id: docId,
      _class: testClass,
      space: testSpace,
      modifiedOn: 1,
      modifiedBy: guestPersonId,
      createdBy: otherPersonId
    }
    const { context } = createPipelineContext(mixin)
    const nextTx = jest.fn().mockResolvedValue({})
    const next = createNextMiddleware(nextTx, async () => toFindResult([docByOther], 1))
    const middleware = await createMiddleware(context, next)

    const removeTx = txFactory.createTxRemoveDoc(testClass, testSpace, docId)
    removeTx.modifiedBy = guestPersonId
    const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
    ctx.contextData = { account: createGuestAccount(guestPersonId) } as any

    await expect(middleware.tx(ctx, [removeTx])).rejects.toMatchObject({
      status: expect.objectContaining({ code: 'platform:status:Forbidden' })
    })
    expect(nextTx).not.toHaveBeenCalled()
  })

  it('should allow Guest to update when updateAccessLevel is Guest and no updateRules', async () => {
    const mixin: TxAccessLevelMixin = {
      updateAccessLevel: AccountRole.Guest
    }
    const { context } = createPipelineContext(mixin)
    const nextTx = jest.fn().mockResolvedValue({})
    const next = createNextMiddleware(nextTx, async () => toFindResult([]))
    const middleware = await createMiddleware(context, next)

    const updateTx = txFactory.createTxUpdateDoc(testClass, testSpace, docId, {})
    const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
    ctx.contextData = { account: createGuestAccount() } as any

    await expect(middleware.tx(ctx, [updateTx])).resolves.toEqual({})
    expect(nextTx).toHaveBeenCalled()
  })

  it('should allow Guest to update when updateRules has requireOwnership and user is creator', async () => {
    const mixin: TxAccessLevelMixin = {
      updateAccessLevel: AccountRole.Guest,
      updateRules: { [AccountRole.Guest]: [{ requireOwnership: true }] }
    }
    const docWithCreator = {
      _id: docId,
      _class: testClass,
      space: testSpace,
      modifiedOn: 1,
      modifiedBy: guestPersonId,
      createdBy: guestPersonId
    }
    const { context } = createPipelineContext(mixin)
    const nextTx = jest.fn().mockResolvedValue({})
    const next = createNextMiddleware(nextTx, async () => toFindResult([docWithCreator], 1))
    const middleware = await createMiddleware(context, next)

    const updateTx = txFactory.createTxUpdateDoc(testClass, testSpace, docId, {} as any)
    updateTx.modifiedBy = guestPersonId
    const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
    ctx.contextData = { account: createGuestAccount(guestPersonId) } as any

    await expect(middleware.tx(ctx, [updateTx])).resolves.toEqual({})
    expect(nextTx).toHaveBeenCalled()
  })

  it('should forbid Guest to update when updateRules has requireOwnership and user is not creator', async () => {
    const mixin: TxAccessLevelMixin = {
      updateAccessLevel: AccountRole.Guest,
      updateRules: { [AccountRole.Guest]: [{ requireOwnership: true }] }
    }
    const docByOther = {
      _id: docId,
      _class: testClass,
      space: testSpace,
      modifiedOn: 1,
      modifiedBy: guestPersonId,
      createdBy: otherPersonId
    }
    const { context } = createPipelineContext(mixin)
    const nextTx = jest.fn().mockResolvedValue({})
    const next = createNextMiddleware(nextTx, async () => toFindResult([docByOther], 1))
    const middleware = await createMiddleware(context, next)

    const updateTx = txFactory.createTxUpdateDoc(testClass, testSpace, docId, {} as any)
    updateTx.modifiedBy = guestPersonId
    const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
    ctx.contextData = { account: createGuestAccount(guestPersonId) } as any

    await expect(middleware.tx(ctx, [updateTx])).rejects.toMatchObject({
      status: expect.objectContaining({ code: 'platform:status:Forbidden' })
    })
    expect(nextTx).not.toHaveBeenCalled()
  })

  it('should allow Guest when rules array is empty', async () => {
    const mixin: TxAccessLevelMixin = {
      removeAccessLevel: AccountRole.Guest,
      removeRules: { [AccountRole.Guest]: [] }
    }
    const { context } = createPipelineContext(mixin)
    const nextTx = jest.fn().mockResolvedValue({})
    const next = createNextMiddleware(nextTx, async () => toFindResult([]))
    const middleware = await createMiddleware(context, next)

    const removeTx = txFactory.createTxRemoveDoc(testClass, testSpace, docId)
    const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
    ctx.contextData = { account: createGuestAccount() } as any

    await expect(middleware.tx(ctx, [removeTx])).resolves.toEqual({})
    expect(nextTx).toHaveBeenCalled()
  })
})
