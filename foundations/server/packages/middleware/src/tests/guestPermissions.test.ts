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
 * Tests for GuestPermissionsMiddleware
 *
 * Verifies that:
 *  - Non-guest users pass through without restriction.
 *  - DocGuest / ReadOnlyGuest users are always forbidden.
 *  - For covered classes (resolved from module allowedPermissions):
 *      new permission model is authoritative; TxAccessLevel is ignored.
 *      Create in any space → permitted.
 *  - For uncovered classes: TxAccessLevel fallback is used.
 */

import core, {
  AccountRole,
  generateId,
  Hierarchy,
  MeasureMetricsContext,
  type Account,
  type Class,
  type Doc,
  type MeasureContext,
  type PersonId,
  type Ref,
  type SessionData,
  type Space,
  type Tx,
  TxFactory
} from '@hcengineering/core'
import type { PipelineContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { GuestPermissionsMiddleware } from '../guestPermissions'

const COVERED_CLASS = 'test:class:CoveredClass' as Ref<Class<Doc>>
const UNCOVERED_CLASS = 'test:class:UncoveredClass' as Ref<Class<Doc>>
const COVERED_CLASS_PERMISSION = 'test:permission:CoveredClassPermission' as Ref<Doc>
const MODULE_PERMISSION_GROUP_CLASS = core.class.ModulePermissionGroup
const ALLOWED_SPACE = 'test:space:Allowed' as Ref<Space>
const FORBIDDEN_SPACE = 'test:space:Forbidden' as Ref<Space>

function makeAccount (role: AccountRole): Account {
  return {
    uuid: generateId() as any,
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

type FindAllFn = (ctx: MeasureContext, _class: Ref<Class<Doc>>, query: object, options?: object) => Promise<Doc[]>

function makePipelineContext (findAll?: FindAllFn): PipelineContext {
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

function makeMiddleware (
  findAll: FindAllFn,
  nextFn?: (ctx: MeasureContext, txes: Tx[]) => Promise<TxMiddlewareResult>
): GuestPermissionsMiddleware {
  const context = makePipelineContext(findAll)
  const next = nextFn !== undefined ? { tx: nextFn } : { tx: async (_ctx: MeasureContext, _txes: Tx[]) => ({}) }
  const mw = new (GuestPermissionsMiddleware as any)(context, next)
  // Override findAll to inject our test data
  mw.findAll = findAll
  return mw
}

function makeCreateTx (objectClass: Ref<Class<Doc>>, objectSpace: Ref<Space>): Tx {
  const factory = new TxFactory('test:account:System' as PersonId)
  return factory.createTxCreateDoc(objectClass, objectSpace, {})
}

// Helper: buildGuestSettings - simulate the document that loadPermissionsCache would find
function makeGuestSettingsDoc (allowedPermissions: Ref<Doc>[], disabledPermissions?: Ref<Doc>[]): Doc {
  return {
    _id: generateId(),
    _class: MODULE_PERMISSION_GROUP_CLASS,
    space: 'core:space:Workspace' as Ref<Space>,
    modifiedOn: Date.now(),
    modifiedBy: 'test' as PersonId,
    application: 'test:app:tracker' as Ref<Doc>,
    role: AccountRole.Guest,
    permissions: allowedPermissions,
    ...(disabledPermissions !== undefined && disabledPermissions.length > 0 ? { disabledPermissions } : {}),
    spaceClass: 'core:class:Space' as Ref<Class<Doc>>,
    enabled: true
  } as any
}

describe('GuestPermissionsMiddleware', () => {
  // ─── Non-guest users pass through ───────────────────────────────────────────
  describe('non-guest users', () => {
    it('User role: passes through without restriction', async () => {
      let nextCalled = false
      const mw = makeMiddleware(
        async () => [],
        async (ctx, txes) => {
          nextCalled = true
          return {}
        }
      )
      const tx = makeCreateTx(COVERED_CLASS, FORBIDDEN_SPACE)
      const ctx = makeCtx(makeAccount(AccountRole.User))
      await mw.tx(ctx, [tx])
      expect(nextCalled).toBe(true)
    })

    it('Owner role: passes through without restriction', async () => {
      let nextCalled = false
      const mw = makeMiddleware(
        async () => [],
        async () => {
          nextCalled = true
          return {}
        }
      )
      const tx = makeCreateTx(COVERED_CLASS, FORBIDDEN_SPACE)
      const ctx = makeCtx(makeAccount(AccountRole.Owner))
      await mw.tx(ctx, [tx])
      expect(nextCalled).toBe(true)
    })
  })

  // ─── DocGuest / ReadOnlyGuest are always forbidden ──────────────────────────
  describe('DocGuest and ReadOnlyGuest', () => {
    it('DocGuest: throws Forbidden for any tx', async () => {
      const mw = makeMiddleware(async () => [])
      const tx = makeCreateTx(COVERED_CLASS, ALLOWED_SPACE)
      const ctx = makeCtx(makeAccount(AccountRole.DocGuest))
      await expect(mw.tx(ctx, [tx])).rejects.toThrow()
    })

    it('ReadOnlyGuest: throws Forbidden for any tx', async () => {
      const mw = makeMiddleware(async () => [])
      const tx = makeCreateTx(COVERED_CLASS, ALLOWED_SPACE)
      const ctx = makeCtx(makeAccount(AccountRole.ReadOnlyGuest))
      await expect(mw.tx(ctx, [tx])).rejects.toThrow()
    })
  })

  // ─── New permission model (covered class) ───────────────────────────────────
  describe('covered class – new permission model', () => {
    const settingsDoc = makeGuestSettingsDoc([COVERED_CLASS_PERMISSION])

    const findAllWithSettings: FindAllFn = async (_ctx, _class) => {
      if (_class === MODULE_PERMISSION_GROUP_CLASS) return [settingsDoc]
      if (_class === core.class.ClassPermission) {
        return [{ _id: COVERED_CLASS_PERMISSION, targetClass: COVERED_CLASS } as any]
      }
      return []
    }

    function patchHierarchy (mw: GuestPermissionsMiddleware): void {
      ;(mw as any).context.hierarchy.isDerived = (a: any, b: any) => {
        if (b === core.class.Space) return false
        return a === b
      }
      ;(mw as any).context.hierarchy.classHierarchyMixin = () => undefined
      ;(mw as any).context.hierarchy.getAncestors = () => []
    }

    it('allows create for covered class in any space (TxAccessLevel is irrelevant)', async () => {
      let nextCalled = false
      const mw = makeMiddleware(findAllWithSettings, async () => {
        nextCalled = true
        return {}
      })
      patchHierarchy(mw)
      const tx = makeCreateTx(COVERED_CLASS, ALLOWED_SPACE)
      const ctx = makeCtx(makeAccount(AccountRole.Guest))
      await mw.tx(ctx, [tx])
      expect(nextCalled).toBe(true)
    })

    it('also allows create in another space when class is covered', async () => {
      let nextCalled = false
      const mw = makeMiddleware(findAllWithSettings, async () => {
        nextCalled = true
        return {}
      })
      patchHierarchy(mw)
      const tx = makeCreateTx(COVERED_CLASS, FORBIDDEN_SPACE)
      const ctx = makeCtx(makeAccount(AccountRole.Guest))
      await mw.tx(ctx, [tx])
      expect(nextCalled).toBe(true)
    })

    it('ignores permissions listed in disabledPermissions (falls back to TxAccessLevel)', async () => {
      const docWithDisabled = makeGuestSettingsDoc([COVERED_CLASS_PERMISSION], [COVERED_CLASS_PERMISSION])
      const findAll: FindAllFn = async (_ctx, _class) => {
        if (_class === MODULE_PERMISSION_GROUP_CLASS) return [docWithDisabled]
        if (_class === core.class.ClassPermission) {
          return [{ _id: COVERED_CLASS_PERMISSION, targetClass: COVERED_CLASS } as any]
        }
        return []
      }
      const mw = makeMiddleware(findAll)
      patchHierarchy(mw)
      const tx = makeCreateTx(COVERED_CLASS, ALLOWED_SPACE)
      const ctx = makeCtx(makeAccount(AccountRole.Guest))
      await expect(mw.tx(ctx, [tx])).rejects.toThrow()
    })
  })

  // ─── Uncovered class falls back to TxAccessLevel ────────────────────────────
  describe('uncovered class – TxAccessLevel fallback', () => {
    it('forbids create when class has no TxAccessLevel mixin and no GuestPermissionsSettings', async () => {
      const mw = makeMiddleware(async () => [])
      const tx = makeCreateTx(UNCOVERED_CLASS, ALLOWED_SPACE)
      const ctx = makeCtx(makeAccount(AccountRole.Guest))
      await expect(mw.tx(ctx, [tx])).rejects.toThrow()
    })

    it('allows create when TxAccessLevel.createAccessLevel === Guest (uncovered type)', async () => {
      // Settings exist but UNCOVERED_CLASS is NOT in allowedPermissions-derived classes
      const settingsDoc = makeGuestSettingsDoc([COVERED_CLASS_PERMISSION])
      let nextCalled = false

      const mw = makeMiddleware(
        async (_ctx, _class) => {
          if (_class === MODULE_PERMISSION_GROUP_CLASS) return [settingsDoc]
          if (_class === core.class.ClassPermission) {
            return [{ _id: COVERED_CLASS_PERMISSION, targetClass: COVERED_CLASS } as any]
          }
          return []
        },
        async () => {
          nextCalled = true
          return {}
        }
      )

      // Simulate TxAccessLevel mixin via hierarchy mock on the middleware context
      ;(mw as any).context.hierarchy.classHierarchyMixin = (_class: any, _mixin: any) => {
        if (_class === UNCOVERED_CLASS) {
          return { createAccessLevel: AccountRole.Guest }
        }
        return undefined
      }
      ;(mw as any).context.hierarchy.isDerived = (a: any, b: any) => {
        if (b === core.class.Space) return false
        return a === b
      }
      ;(mw as any).context.hierarchy.getAncestors = () => []

      const tx = makeCreateTx(UNCOVERED_CLASS, ALLOWED_SPACE)
      const ctx = makeCtx(makeAccount(AccountRole.Guest))
      await mw.tx(ctx, [tx])
      expect(nextCalled).toBe(true)
    })
  })

  // ─── Precedence: covered class ignores TxAccessLevel even if it would deny ──
  describe('precedence – new model overrides TxAccessLevel for covered types', () => {
    it('allows covered class create in allowed space regardless of missing TxAccessLevel', async () => {
      const settingsDoc = makeGuestSettingsDoc([COVERED_CLASS_PERMISSION])
      let nextCalled = false

      const mw = makeMiddleware(
        async (_ctx, _class) => {
          if (_class === MODULE_PERMISSION_GROUP_CLASS) return [settingsDoc]
          if (_class === core.class.ClassPermission) {
            return [{ _id: COVERED_CLASS_PERMISSION, targetClass: COVERED_CLASS } as any]
          }
          return []
        },
        async () => {
          nextCalled = true
          return {}
        }
      )

      // Ensure hierarchy says TxAccessLevel is absent for the covered class
      ;(mw as any).context.hierarchy.classHierarchyMixin = (_class: any, _mixin: any) => undefined
      ;(mw as any).context.hierarchy.isDerived = (a: any, b: any) => {
        if (b === core.class.Space) return false
        return a === b
      }
      ;(mw as any).context.hierarchy.getAncestors = () => []

      const tx = makeCreateTx(COVERED_CLASS, ALLOWED_SPACE)
      const ctx = makeCtx(makeAccount(AccountRole.Guest))
      await mw.tx(ctx, [tx])
      expect(nextCalled).toBe(true)
    })

    it('allows covered class create in any space even if TxAccessLevel would deny', async () => {
      const settingsDoc = makeGuestSettingsDoc([COVERED_CLASS_PERMISSION])

      const mw = makeMiddleware(async (_ctx, _class) => {
        if (_class === MODULE_PERMISSION_GROUP_CLASS) return [settingsDoc]
        if (_class === core.class.ClassPermission) {
          return [{ _id: COVERED_CLASS_PERMISSION, targetClass: COVERED_CLASS } as any]
        }
        return []
      })

      // TxAccessLevel would allow (createAccessLevel === Guest) – should be ignored
      ;(mw as any).context.hierarchy.classHierarchyMixin = (_class: any, _mixin: any) => {
        if (_class === COVERED_CLASS) return { createAccessLevel: AccountRole.Guest }
        return undefined
      }
      ;(mw as any).context.hierarchy.isDerived = (a: any, b: any) => {
        if (b === core.class.Space) return false
        return a === b
      }
      ;(mw as any).context.hierarchy.getAncestors = () => []

      const tx = makeCreateTx(COVERED_CLASS, FORBIDDEN_SPACE)
      const ctx = makeCtx(makeAccount(AccountRole.Guest))
      await mw.tx(ctx, [tx])
    })
  })

  // ─── Own-document mutations for guests ───────────────────────────────────────
  describe('guest update/remove own documents', () => {
    const GUEST_SOCIAL = 'test:guest-social' as PersonId

    function makeGuestAccountWithSocial (): Account {
      return {
        uuid: generateId() as any,
        role: AccountRole.Guest,
        primarySocialId: GUEST_SOCIAL,
        socialIds: [GUEST_SOCIAL],
        fullSocialIds: []
      }
    }

    function patchHierarchyNoTxAccessLevel (mw: GuestPermissionsMiddleware): void {
      ;(mw as any).context.hierarchy.classHierarchyMixin = () => undefined
      ;(mw as any).context.hierarchy.isDerived = (a: any, b: any) => {
        if (b === core.class.Space) return false
        return a === b
      }
      ;(mw as any).context.hierarchy.getAncestors = () => []
    }

    it('allows guest to update document created by same account', async () => {
      const objectId = generateId()
      const findAll: FindAllFn = async (_ctx, _class, query: any) => {
        if (_class === UNCOVERED_CLASS && query?._id === objectId) {
          return [
            {
              _id: objectId,
              _class: UNCOVERED_CLASS,
              space: ALLOWED_SPACE,
              modifiedOn: Date.now(),
              modifiedBy: GUEST_SOCIAL,
              createdBy: GUEST_SOCIAL
            } as any
          ]
        }
        return []
      }
      let nextCalled = false
      const mw = makeMiddleware(findAll, async () => {
        nextCalled = true
        return {}
      })
      patchHierarchyNoTxAccessLevel(mw)
      const factory = new TxFactory(GUEST_SOCIAL)
      const tx = factory.createTxUpdateDoc(UNCOVERED_CLASS, ALLOWED_SPACE, objectId, { name: 'x' } as any)
      await mw.tx(makeCtx(makeGuestAccountWithSocial()), [tx])
      expect(nextCalled).toBe(true)
    })

    it('allows guest to remove document created by same account', async () => {
      const objectId = generateId()
      const findAll: FindAllFn = async (_ctx, _class, query: any) => {
        if (_class === UNCOVERED_CLASS && query?._id === objectId) {
          return [
            {
              _id: objectId,
              _class: UNCOVERED_CLASS,
              space: ALLOWED_SPACE,
              modifiedOn: Date.now(),
              modifiedBy: GUEST_SOCIAL,
              createdBy: GUEST_SOCIAL
            } as any
          ]
        }
        return []
      }
      let nextCalled = false
      const mw = makeMiddleware(findAll, async () => {
        nextCalled = true
        return {}
      })
      patchHierarchyNoTxAccessLevel(mw)
      const factory = new TxFactory(GUEST_SOCIAL)
      const tx = factory.createTxRemoveDoc(UNCOVERED_CLASS, ALLOWED_SPACE, objectId)
      await mw.tx(makeCtx(makeGuestAccountWithSocial()), [tx])
      expect(nextCalled).toBe(true)
    })

    it('forbids guest to update document created by another account', async () => {
      const objectId = generateId()
      const otherSocial = 'test:other-social' as PersonId
      const findAll: FindAllFn = async (_ctx, _class, query: any) => {
        if (_class === UNCOVERED_CLASS && query?._id === objectId) {
          return [
            {
              _id: objectId,
              _class: UNCOVERED_CLASS,
              space: ALLOWED_SPACE,
              modifiedOn: Date.now(),
              modifiedBy: otherSocial,
              createdBy: otherSocial
            } as any
          ]
        }
        return []
      }
      const mw = makeMiddleware(findAll)
      patchHierarchyNoTxAccessLevel(mw)
      const factory = new TxFactory(GUEST_SOCIAL)
      const tx = factory.createTxUpdateDoc(UNCOVERED_CLASS, ALLOWED_SPACE, objectId, { name: 'x' } as any)
      await expect(mw.tx(makeCtx(makeGuestAccountWithSocial()), [tx])).rejects.toThrow()
    })
  })

  // ─── Cache invalidation ──────────────────────────────────────────────────────
  describe('cache invalidation', () => {
    it('invalidates cache when GuestPermissionsSettings is updated', async () => {
      const findAll: FindAllFn = async (_ctx, _class) => {
        if (_class === MODULE_PERMISSION_GROUP_CLASS) {
          return [makeGuestSettingsDoc([COVERED_CLASS_PERMISSION])]
        }
        if (_class === core.class.ClassPermission) {
          return [{ _id: COVERED_CLASS_PERMISSION, targetClass: COVERED_CLASS } as any]
        }
        return []
      }
      const mw = makeMiddleware(findAll)
      ;(mw as any).context.hierarchy.isDerived = (a: any, b: any) => {
        if (b === core.class.Space) return false
        return a === b
      }
      ;(mw as any).context.hierarchy.classHierarchyMixin = () => undefined
      ;(mw as any).context.hierarchy.getAncestors = () => []

      // First tx as guest should load cache
      const userCtx = makeCtx(makeAccount(AccountRole.User))
      const settingsTx: Tx = {
        _id: generateId(),
        _class: core.class.TxCreateDoc,
        space: core.space.Tx,
        modifiedOn: Date.now(),
        modifiedBy: 'test' as PersonId,
        objectId: generateId(),
        objectClass: MODULE_PERMISSION_GROUP_CLASS,
        objectSpace: 'core:space:Workspace' as Ref<Space>
      } as any

      // Owner updates settings – should invalidate cache
      await mw.tx(userCtx, [settingsTx])
      // Cache should be cleared after settings update
      expect((mw as any).permissionsCache).toBeUndefined()
    })
  })

  // ─── collab-only guest veto: fail-closed (L-GP) + covers remove (L-RM) ────────
  describe('collab-only guest veto (mention-grants opt-in)', () => {
    const ISSUE_CLASS = 'test:class:Issue' as Ref<Class<Doc>>
    const ISSUE_SPACE = 'test:space:Issue' as Ref<Space>

    // Build a middleware whose model opts ISSUE_CLASS into mention-grants
    // (provideSecurity + mentionsGrantAccess). `space` controls what findAll
    // returns for the doc's space (undefined => unresolvable); `grants` is what a
    // Collaborator lookup returns for the caller on the target doc.
    function makeCollabMw (space: Space | undefined, grants: any[] = []): GuestPermissionsMiddleware {
      const mw = makeMiddleware(async (_ctx, _class) => {
        if (_class === core.class.Collaborator) return grants
        return space !== undefined ? [space] : []
      })
      ;(mw as any).context.hierarchy.getAncestors = (id: any) => [id]
      ;(mw as any).context.hierarchy.isDerived = (a: any, b: any) => a === b
      ;(mw as any).context.hierarchy.classHierarchyMixin = () => undefined
      ;(mw as any).context.modelDb = {
        findAllSync: (_class: any, _q: any) => [
          { attachedTo: ISSUE_CLASS, provideSecurity: true, mentionsGrantAccess: true }
        ]
      }
      return mw
    }

    // Spaces default to private: a non-member reaching an issue in a private space
    // can only be there through a per-doc collaborator grant (the P2.2 capability),
    // so it is subject to the level-aware write veto. Public spaces (private:false)
    // are normal collaborative spaces where non-member members participate freely.
    function makeSpace (members: any[], isPrivate = true): Space {
      return { _id: ISSUE_SPACE, members, private: isPrivate } as any
    }

    function grant (level?: 'read' | 'write' | 'admin'): any {
      return { collaborator: 'test:collab', level }
    }

    it('L-GP: fail-closed — unresolvable space forbids a guest field update', async () => {
      const mw = makeCollabMw(undefined)
      const guest = makeAccount(AccountRole.Guest)
      const factory = new TxFactory('test:account:System' as PersonId)
      const tx = factory.createTxUpdateDoc(ISSUE_CLASS, ISSUE_SPACE, generateId() as any, {})
      const forbidden = await (mw as any).isForbiddenCollabOnlyGuestFieldUpdate(makeCtx(guest), tx, guest)
      expect(forbidden).toBe(true)
    })

    it('L-RM: collab-only guest TxRemoveDoc on opted-in doc is forbidden', async () => {
      const guest = makeAccount(AccountRole.Guest)
      const mw = makeCollabMw(makeSpace([])) // guest is NOT a space member
      const factory = new TxFactory('test:account:System' as PersonId)
      const tx = factory.createTxRemoveDoc(ISSUE_CLASS, ISSUE_SPACE, generateId() as any)
      const forbidden = await (mw as any).isForbiddenCollabOnlyGuestFieldUpdate(makeCtx(guest), tx, guest)
      expect(forbidden).toBe(true)
    })

    it('space-member guest is NOT vetoed (update stays allowed)', async () => {
      const guest = makeAccount(AccountRole.Guest)
      const mw = makeCollabMw(makeSpace([guest.uuid]))
      const factory = new TxFactory('test:account:System' as PersonId)
      const tx = factory.createTxUpdateDoc(ISSUE_CLASS, ISSUE_SPACE, generateId() as any, {})
      const forbidden = await (mw as any).isForbiddenCollabOnlyGuestFieldUpdate(makeCtx(guest), tx, guest)
      expect(forbidden).toBe(false)
    })

    it('non-member User on a PUBLIC space passes the veto (normal collaboration)', async () => {
      // Public-space non-members reach the doc through ordinary space visibility,
      // not a per-doc grant, so their existing access is preserved unchanged.
      const user = makeAccount(AccountRole.User)
      const mw = makeCollabMw(makeSpace([], false))
      const factory = new TxFactory('test:account:System' as PersonId)
      const tx = factory.createTxRemoveDoc(ISSUE_CLASS, ISSUE_SPACE, generateId() as any)
      const forbidden = await (mw as any).isForbiddenCollabOnlyGuestFieldUpdate(makeCtx(user), tx, user)
      expect(forbidden).toBe(false)
    })

    // ─── P2.3: level-aware write enforcement (read blocks, write/admin allows) ──
    function updateTx (): Tx {
      const factory = new TxFactory('test:account:System' as PersonId)
      return factory.createTxUpdateDoc(ISSUE_CLASS, ISSUE_SPACE, generateId() as any, {})
    }
    function removeTx (): Tx {
      const factory = new TxFactory('test:account:System' as PersonId)
      return factory.createTxRemoveDoc(ISSUE_CLASS, ISSUE_SPACE, generateId() as any)
    }

    it('P2.3: collab-only User with READ grant cannot update issue fields', async () => {
      const user = makeAccount(AccountRole.User)
      const mw = makeCollabMw(makeSpace([]), [grant('read')])
      const forbidden = await (mw as any).isForbiddenCollabOnlyGuestFieldUpdate(makeCtx(user), updateTx(), user)
      expect(forbidden).toBe(true)
    })

    it('P2.3: collab-only User with WRITE grant CAN update issue fields', async () => {
      const user = makeAccount(AccountRole.User)
      const mw = makeCollabMw(makeSpace([]), [grant('write')])
      const forbidden = await (mw as any).isForbiddenCollabOnlyGuestFieldUpdate(makeCtx(user), updateTx(), user)
      expect(forbidden).toBe(false)
    })

    it('P2.3: collab-only User with ADMIN grant CAN update issue fields', async () => {
      const user = makeAccount(AccountRole.User)
      const mw = makeCollabMw(makeSpace([]), [grant('admin')])
      const forbidden = await (mw as any).isForbiddenCollabOnlyGuestFieldUpdate(makeCtx(user), updateTx(), user)
      expect(forbidden).toBe(false)
    })

    it('P2.3: multiple grants — max level wins (mention read + manual write allows)', async () => {
      const user = makeAccount(AccountRole.User)
      const mw = makeCollabMw(makeSpace([]), [grant('read'), grant('write')])
      const forbidden = await (mw as any).isForbiddenCollabOnlyGuestFieldUpdate(makeCtx(user), updateTx(), user)
      expect(forbidden).toBe(false)
    })

    it('P2.3: collab-only User with NO grant cannot update (private space)', async () => {
      const user = makeAccount(AccountRole.User)
      const mw = makeCollabMw(makeSpace([]), [])
      const forbidden = await (mw as any).isForbiddenCollabOnlyGuestFieldUpdate(makeCtx(user), updateTx(), user)
      expect(forbidden).toBe(true)
    })

    it('P2.3: collab-only User with WRITE grant still cannot REMOVE the issue', async () => {
      // Deleting the doc is reserved for space members/owners; write/admin grants
      // only free field updates, never a remove of the target doc itself.
      const user = makeAccount(AccountRole.User)
      const mw = makeCollabMw(makeSpace([]), [grant('write')])
      const forbidden = await (mw as any).isForbiddenCollabOnlyGuestFieldUpdate(makeCtx(user), removeTx(), user)
      expect(forbidden).toBe(true)
    })

    // ─── C-02: the veto must actually fire in the tx() pipeline for role >= User,
    //     not only when the private method is called directly (the P2.3 tests above
    //     bypassed tx() and so missed the >= User early-return that skipped the veto). ──
    it('C-02: collab-only User with READ grant is blocked at tx() (pipeline-level)', async () => {
      const user = makeAccount(AccountRole.User)
      const mw = makeCollabMw(makeSpace([]), [grant('read')])
      await expect(mw.tx(makeCtx(user), [updateTx()])).rejects.toThrow()
    })

    it('C-02: collab-only User with WRITE grant passes tx()', async () => {
      const user = makeAccount(AccountRole.User)
      const mw = makeCollabMw(makeSpace([]), [grant('write')])
      await expect(mw.tx(makeCtx(user), [updateTx()])).resolves.toBeDefined()
    })

    it('C-02: space member passes tx() field update (a member is never vetoed)', async () => {
      const user = makeAccount(AccountRole.User)
      const mw = makeCollabMw(makeSpace([user.uuid]), [grant('read')])
      await expect(mw.tx(makeCtx(user), [updateTx()])).resolves.toBeDefined()
    })

    it('P2.3: collab-only Guest with READ grant still cannot update (regression)', async () => {
      const guest = makeAccount(AccountRole.Guest)
      const mw = makeCollabMw(makeSpace([]), [grant('read')])
      const forbidden = await (mw as any).isForbiddenCollabOnlyGuestFieldUpdate(makeCtx(guest), updateTx(), guest)
      expect(forbidden).toBe(true)
    })

    it('P2.3: collab-only Guest with WRITE grant CAN update fields (level is role-independent)', async () => {
      const guest = makeAccount(AccountRole.Guest)
      const mw = makeCollabMw(makeSpace([]), [grant('write')])
      const forbidden = await (mw as any).isForbiddenCollabOnlyGuestFieldUpdate(makeCtx(guest), updateTx(), guest)
      expect(forbidden).toBe(false)
    })

    it('P2.3: Maintainer non-member of a private space passes (workspace-privileged)', async () => {
      const maint = makeAccount(AccountRole.Maintainer)
      const mw = makeCollabMw(makeSpace([]), [])
      const forbidden = await (mw as any).isForbiddenCollabOnlyGuestFieldUpdate(makeCtx(maint), updateTx(), maint)
      expect(forbidden).toBe(false)
    })
  })
})
