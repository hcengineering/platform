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

import {
  BaseMiddleware,
  type Middleware,
  type PipelineContext,
  type TxMiddlewareResult
} from '@hcengineering/server-core'
import core, {
  type AccessGroup,
  type Account,
  AccountRole,
  type AccessLevel,
  type Class,
  type Collaborator,
  type Doc,
  getClassCollaborators,
  type GroupGrant,
  hasAccountRole,
  hasAtLeast,
  type MeasureContext,
  type Ref,
  type SessionData,
  type Space,
  type Tx,
  type TxApplyIf,
  type TxCreateDoc,
  type TxCUD,
  TxProcessor,
  type TxUpdateDoc
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'

import { isSystem } from './utils'

const VALID_LEVELS: ReadonlySet<string> = new Set<string>(['read', 'write', 'admin'])

function forbidden (): PlatformError<Record<string, any>> {
  return new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
}

/**
 * Fail-closed gate for client-initiated writes to access-granting Collaborator
 * records.
 *
 * A Collaborator record on a class whose ClassCollaborators has
 * `provideSecurity === true` is not merely a notification subscription — it
 * grants read visibility on the doc, bypassing space membership, and (via
 * `level`) write/admin authority. Such records must therefore only be created
 * or removed by an authorized caller. This middleware enforces the
 * authorization rules of the design (section 2.4):
 *
 *  - System (trigger) writes pass through untouched — structural,
 *    mention-materialized and group-materialized collaborators are written by
 *    server triggers.
 *  - Client TxCreateDoc on a secured class must be a `grantedVia: 'manual'`
 *    grant, self-attributed (`grantedBy === caller`), with a valid `level`,
 *    authorized by space membership / space-owner / workspace-maintainer+ /
 *    an admin-level grant the caller already holds on the doc.
 *  - Client TxRemoveDoc on a secured collaborator is allowed for the granting
 *    actor, the grantee themselves (self-decline, grantedVia records only),
 *    space-owners, workspace-maintainer+, or an admin-level grantee of the doc.
 *    Structural records (grantedVia === undefined) may only be removed by
 *    space-owners / workspace-maintainer+.
 *  - Any other CUD (TxUpdateDoc / TxMixin) on a secured collaborator is
 *    rejected: grant records are immutable, a level change is Remove + Create.
 *  - GroupGrant CUD is gated too (P4.1): create/remove/re-level only by
 *    space-owners / workspace-Maintainer+ / an admin-level grantee of the doc.
 *    A GroupGrant `level` update is allowed (it is the one mutable field — the
 *    reconcile trigger propagates it); every other GroupGrant update is rejected.
 *  - AccessGroup CUD is gated (P4.1/4.3): membership is security-relevant, so
 *    edits are restricted to the group's owners / Maintainer+, and a group with
 *    live GroupGrants cannot be deleted.
 *
 * Collaborators of non-secured classes (channels etc.) are untouched.
 *
 * Registered directly after GuestPermissionsMiddleware in the pipeline.
 */
export class CollaboratorGuardMiddleware extends BaseMiddleware implements Middleware {
  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<CollaboratorGuardMiddleware> {
    return new CollaboratorGuardMiddleware(context, next)
  }

  async tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    const account = ctx.contextData.account
    // Trigger / service path: unrestricted. All non-manual provenance
    // (mention/group/structural) is written exclusively here.
    if (!isSystem(account, ctx)) {
      for (const tx of txes) {
        await this.checkTx(ctx, tx, account)
      }
    }
    return await this.provideTx(ctx, txes)
  }

  private async checkTx (ctx: MeasureContext<SessionData>, tx: Tx, account: Account): Promise<void> {
    if (tx._class === core.class.TxApplyIf) {
      for (const inner of (tx as TxApplyIf).txes) {
        await this.checkTx(ctx, inner, account)
      }
      return
    }
    if (!TxProcessor.isExtendsCUD(tx._class)) return
    const cud = tx as TxCUD<Doc>
    if (this.context.hierarchy.isDerived(cud.objectClass, core.class.GroupGrant)) {
      await this.checkGroupGrantTx(ctx, cud, account)
      return
    }
    if (this.context.hierarchy.isDerived(cud.objectClass, core.class.AccessGroup)) {
      await this.checkAccessGroupTx(ctx, cud, account)
      return
    }
    if (!this.context.hierarchy.isDerived(cud.objectClass, core.class.Collaborator)) return

    if (cud._class === core.class.TxCreateDoc) {
      const createTx = cud as TxCreateDoc<Collaborator>
      const target = createTx.attachedToClass ?? (createTx.attributes as any)?.attachedToClass
      // fail-closed: an unclassifiable create of a Collaborator is rejected.
      if (target === undefined) throw forbidden()
      if (!this.isSecuredClass(target)) return // notification-only collaborator: unrestricted
      await this.checkCreate(ctx, createTx, account)
      return
    }

    // Remove / update / mixin: resolve the existing record to classify it.
    const existing = (
      await this.findAll<Collaborator>(
        ctx,
        core.class.Collaborator,
        { _id: cud.objectId as Ref<Collaborator> },
        { limit: 1 }
      )
    )[0]
    // fail-closed: cannot resolve the record we are asked to mutate → reject.
    if (existing === undefined) throw forbidden()
    if (!this.isSecuredClass(existing.attachedToClass)) return // notification-only: unrestricted

    if (cud._class === core.class.TxRemoveDoc) {
      await this.checkRemove(ctx, existing, account)
      return
    }
    // TxUpdateDoc / TxMixin on a secured grant record: immutable → reject.
    throw forbidden()
  }

  /** True iff the class opts into collaborator-based security (provideSecurity). */
  private isSecuredClass (target: Ref<Class<Doc>> | undefined): boolean {
    if (target === undefined) return false
    const collabSec = getClassCollaborators(this.context.modelDb, this.context.hierarchy, target)
    return collabSec?.provideSecurity === true
  }

  private async checkCreate (
    ctx: MeasureContext<SessionData>,
    createTx: TxCreateDoc<Collaborator>,
    account: Account
  ): Promise<void> {
    const attrs = createTx.attributes as Partial<Collaborator>

    // Clients may only create explicit MANUAL grants. mention/group provenance
    // and structural (undefined) records are the exclusive domain of triggers.
    if (attrs.grantedVia !== 'manual') throw forbidden()
    // The grant must be self-attributed — no impersonating another granter.
    if (attrs.grantedBy !== account.uuid) throw forbidden()
    // Level: absent ⇒ read (fail-safe). Present ⇒ must be a known level.
    if (attrs.level !== undefined && !VALID_LEVELS.has(attrs.level)) throw forbidden()

    const attachedTo = createTx.attachedTo ?? (createTx.attributes as any)?.attachedTo
    const attachedToClass = createTx.attachedToClass ?? (createTx.attributes as any)?.attachedToClass
    // C-01: authorize against the target doc's REAL space, never the client-chosen
    // objectSpace. The Postgres visibility grant keys on `attachedTo` alone, so a
    // grant written into a space the caller controls would otherwise confer access
    // to a doc that lives in a foreign space. resolveTargetSpace is fail-closed.
    const targetSpace = await this.resolveTargetSpace(ctx, createTx.objectSpace, attachedTo, attachedToClass)
    if (targetSpace === undefined) throw forbidden()
    const authorized = await this.canGrant(ctx, targetSpace, attachedTo, account)
    if (!authorized) throw forbidden()

    // H-NEW-01: cap the granted level against the granter's own authority. A plain
    // member (authorized above via the ≥User member path of canGrant) must NOT be able
    // to self-mint an 'admin' grant — that would make hasAdminGrant() true and unlock
    // canGrantGroup() and foreign-revoke, powers reserved for owners / maintainers /
    // admin-grantees. Only an already-privileged caller may grant 'admin'.
    if (attrs.level === 'admin' && !(await this.canGrantAdminLevel(ctx, targetSpace, attachedTo, account))) {
      throw forbidden()
    }
  }

  private async checkRemove (ctx: MeasureContext<SessionData>, record: Collaborator, account: Account): Promise<void> {
    // Grantee self-decline: only for actual grant records (grantedVia set),
    // never for structural collaborators (assignee/createdBy).
    if (record.grantedVia != null && record.collaborator === account.uuid) return
    // The actor who created the grant may revoke it.
    if (record.grantedVia != null && record.grantedBy === account.uuid) return

    const space = await this.loadSpace(ctx, record.space)
    // fail-closed: cannot resolve the space to prove ownership → reject.
    if (space === undefined) throw forbidden()
    if (space.owners?.includes(account.uuid) === true) return
    if (hasAccountRole(account, AccountRole.Maintainer)) return

    // Admin-level grantee of the doc may revoke grants on that doc, but NOT
    // structural records (those stay owner/maintainer-only).
    if (record.grantedVia != null && (await this.hasAdminGrant(ctx, record.attachedTo, account))) return

    throw forbidden()
  }

  /**
   * GroupGrant CUD gate (design 2.4 / P4.1). GroupGrants are strictly stronger
   * than manual grants (future members inherit access), so authority is NOT
   * lowered to ≥ User members: only space-owners, workspace-Maintainer+, or an
   * admin-level grantee of the doc may create/remove/modify one.
   *
   * Unlike Collaborator grant records, a GroupGrant's `level` IS mutable — the
   * reconcile trigger propagates a level change onto the derived collaborators.
   * A TxUpdateDoc is therefore allowed, but only when it touches nothing but
   * `level` (with a valid value). Any other field update, or a TxMixin, is
   * rejected.
   */
  private async checkGroupGrantTx (ctx: MeasureContext<SessionData>, cud: TxCUD<Doc>, account: Account): Promise<void> {
    if (cud._class === core.class.TxCreateDoc) {
      const createTx = cud as TxCreateDoc<GroupGrant>
      const attrs = createTx.attributes as Partial<GroupGrant>
      if (attrs.level !== undefined && !VALID_LEVELS.has(attrs.level)) throw forbidden()
      const target = createTx.attachedToClass ?? (createTx.attributes as any)?.attachedToClass
      // fail-closed: a GroupGrant only has meaning on a secured class.
      if (!this.isSecuredClass(target)) throw forbidden()
      const attachedTo = createTx.attachedTo ?? (createTx.attributes as any)?.attachedTo
      // C-01: authorize against the target doc's REAL space, not the client-chosen
      // objectSpace (same cross-space-laundering vector as manual grants).
      const targetSpace = await this.resolveTargetSpace(ctx, createTx.objectSpace, attachedTo, target)
      if (targetSpace === undefined) throw forbidden()
      if (!(await this.canGrantGroup(ctx, targetSpace, attachedTo, account))) throw forbidden()
      return
    }

    // Remove / update / mixin: resolve the existing grant.
    const existing = (
      await this.findAll<GroupGrant>(ctx, core.class.GroupGrant, { _id: cud.objectId as Ref<GroupGrant> }, { limit: 1 })
    )[0]
    // fail-closed: cannot resolve the grant we are asked to mutate → reject.
    if (existing === undefined) throw forbidden()

    if (cud._class === core.class.TxUpdateDoc) {
      const upd = cud as TxUpdateDoc<GroupGrant>
      // Only a pure level change is permitted; any other operation is rejected.
      const ops = upd.operations as Record<string, any>
      const keys = Object.keys(ops)
      if (keys.length !== 1 || keys[0] !== 'level') throw forbidden()
      if (ops.level !== undefined && !VALID_LEVELS.has(ops.level)) throw forbidden()
      if (!(await this.canGrantGroup(ctx, existing.space, existing.attachedTo, account))) throw forbidden()
      return
    }

    if (cud._class === core.class.TxRemoveDoc) {
      if (!(await this.canGrantGroup(ctx, existing.space, existing.attachedTo, account))) throw forbidden()
      return
    }
    // TxMixin (or anything else) on a GroupGrant: reject.
    throw forbidden()
  }

  /**
   * AccessGroup CUD gate (design 2.8 `owners` semantics / P4.1+4.3). An
   * AccessGroup's membership is security-relevant: adding oneself to a group that
   * already holds grants would escalate access. So editing is restricted to the
   * group's `owners` (or workspace-Maintainer+). Fail-closed throughout.
   *
   *  - Create: allowed for a real account (≥ User) that lists itself in `owners`
   *    (no orphan/unowned groups), or any Maintainer+.
   *  - Update: only an owner of the existing group, or Maintainer+.
   *  - Remove: only an owner / Maintainer+, AND only when no GroupGrant still
   *    references the group (a live grant must be revoked first).
   */
  private async checkAccessGroupTx (ctx: MeasureContext<SessionData>, cud: TxCUD<Doc>, account: Account): Promise<void> {
    if (cud._class === core.class.TxCreateDoc) {
      if (hasAccountRole(account, AccountRole.Maintainer)) return
      const attrs = (cud as TxCreateDoc<AccessGroup>).attributes as Partial<AccessGroup>
      // ≥ User and self-owned: the creator must be able to manage what they make.
      if (hasAccountRole(account, AccountRole.User) && attrs.owners?.includes(account.uuid) === true) return
      throw forbidden()
    }

    const existing = (
      await this.findAll<AccessGroup>(
        ctx,
        core.class.AccessGroup,
        { _id: cud.objectId as Ref<AccessGroup> },
        { limit: 1 }
      )
    )[0]
    // fail-closed: cannot resolve the group we are asked to mutate → reject.
    if (existing === undefined) throw forbidden()
    const isOwner = existing.owners?.includes(account.uuid) || hasAccountRole(account, AccountRole.Maintainer)
    if (!isOwner) throw forbidden()

    if (cud._class === core.class.TxRemoveDoc) {
      // A group with live grants may not be deleted (grants materialize access).
      const grants = await this.findAll<GroupGrant>(ctx, core.class.GroupGrant, { group: existing._id }, { limit: 1 })
      if (grants.length > 0) throw forbidden()
    }
    // TxUpdateDoc / TxMixin by an owner: allowed.
  }

  /**
   * Authority to create / remove / re-level a GroupGrant on the doc:
   *  - workspace Maintainer+, OR
   *  - space owner, OR
   *  - caller already holds an admin-level grant on the target doc.
   * Fail-closed: unresolvable space → not authorized. (No ≥ User member path.)
   */
  private async canGrantGroup (
    ctx: MeasureContext<SessionData>,
    space: Ref<Space>,
    attachedTo: Ref<Doc> | undefined,
    account: Account
  ): Promise<boolean> {
    if (hasAccountRole(account, AccountRole.Maintainer)) return true
    const spaceDoc = await this.loadSpace(ctx, space)
    if (spaceDoc === undefined) return false
    if (spaceDoc.owners?.includes(account.uuid) === true) return true
    return await this.hasAdminGrant(ctx, attachedTo, account)
  }

  /**
   * Authority to create a MANUAL grant on the doc, per design 2.4:
   *  - space member with workspace role ≥ User, OR
   *  - space owner, OR
   *  - workspace Maintainer+, OR
   *  - caller already holds an admin-level grant on the target doc.
   * Fail-closed: unresolvable space → not authorized.
   */
  private async canGrant (
    ctx: MeasureContext<SessionData>,
    space: Ref<Space>,
    attachedTo: Ref<Doc> | undefined,
    account: Account
  ): Promise<boolean> {
    if (hasAccountRole(account, AccountRole.Maintainer)) return true

    const spaceDoc = await this.loadSpace(ctx, space)
    if (spaceDoc === undefined) return false
    if (spaceDoc.owners?.includes(account.uuid) === true) return true
    if (hasAccountRole(account, AccountRole.User) && spaceDoc.members?.includes(account.uuid)) return true

    return await this.hasAdminGrant(ctx, attachedTo, account)
  }

  /**
   * H-NEW-01: authority to grant an 'admin'-level Collaborator. This is canGrant()
   * WITHOUT the plain ≥User member path: an admin grant confers authority
   * (hasAdminGrant → canGrantGroup + foreign-revoke), so it must only be mintable by a
   * caller who already holds admin-equivalent authority (maintainer / space owner /
   * pre-existing admin-grantee). The new record is not yet persisted, so hasAdminGrant()
   * below reflects only pre-existing grants — no self-reference.
   */
  private async canGrantAdminLevel (
    ctx: MeasureContext<SessionData>,
    space: Ref<Space>,
    attachedTo: Ref<Doc> | undefined,
    account: Account
  ): Promise<boolean> {
    if (hasAccountRole(account, AccountRole.Maintainer)) return true
    const spaceDoc = await this.loadSpace(ctx, space)
    if (spaceDoc === undefined) return false
    if (spaceDoc.owners?.includes(account.uuid) === true) return true
    return await this.hasAdminGrant(ctx, attachedTo, account)
  }

  /** True iff the caller holds a level ≥ admin Collaborator grant on the doc. */
  private async hasAdminGrant (
    ctx: MeasureContext<SessionData>,
    attachedTo: Ref<Doc> | undefined,
    account: Account
  ): Promise<boolean> {
    if (attachedTo === undefined) return false
    const grants = await this.findAll<Collaborator>(ctx, core.class.Collaborator, {
      attachedTo,
      collaborator: account.uuid
    })
    return grants.some((g) => hasAtLeast(g.level as AccessLevel | undefined, 'admin'))
  }

  private async loadSpace (ctx: MeasureContext<SessionData>, space: Ref<Space>): Promise<Space | undefined> {
    return (await this.findAll<Space>(ctx, core.class.Space, { _id: space }, { limit: 1 }))[0]
  }

  /**
   * Resolve the target doc's REAL space and enforce that the grant record's own
   * space (`objectSpace`) mirrors it (C-01). The Postgres visibility grant keys on
   * `attachedTo` alone (see postgres addSecurity: `collab_sec.attachedTo =
   * domain._id`), independent of the grant record's own space — so a grant whose
   * objectSpace does not match the target doc's space would confer cross-space
   * visibility. Authority must therefore be judged against the returned real space,
   * never the client-supplied objectSpace.
   *
   * Fail-closed → undefined (caller rejects) when: attachedTo/class missing, the
   * target doc cannot be loaded, or the record's space does not mirror it.
   */
  private async resolveTargetSpace (
    ctx: MeasureContext<SessionData>,
    recordSpace: Ref<Space>,
    attachedTo: Ref<Doc> | undefined,
    attachedToClass: Ref<Class<Doc>> | undefined
  ): Promise<Ref<Space> | undefined> {
    if (attachedTo === undefined || attachedToClass === undefined) return undefined
    const targetDoc = (await this.findAll<Doc>(ctx, attachedToClass, { _id: attachedTo }, { limit: 1 }))[0]
    if (targetDoc === undefined) return undefined
    if (recordSpace !== targetDoc.space) return undefined
    return targetDoc.space
  }
}
