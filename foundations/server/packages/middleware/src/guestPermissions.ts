import {
  BaseMiddleware,
  type Middleware,
  type PipelineContext,
  type TxMiddlewareResult
} from '@hcengineering/server-core'
import core, {
  type Account,
  AccountRole,
  type Class,
  type Collaborator,
  type Doc,
  type ClassPermission,
  getClassCollaborators,
  hasAtLeast,
  type Permission,
  hasAccountRole,
  type MeasureContext,
  type PersonId,
  type Ref,
  type SessionData,
  type Space,
  type Tx,
  type TxApplyIf,
  type TxCUD,
  TxProcessor,
  type TxUpdateDoc
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import contact, { type Person } from '@hcengineering/contact'

/** Cached state loaded from GuestPermissionsSettings configuration document. */
interface GuestPermissionsCache {
  roleAllowedClasses: Map<AccountRole, Set<Ref<Class<Doc>>>>
}

export class GuestPermissionsMiddleware extends BaseMiddleware implements Middleware {
  private permissionsCache: GuestPermissionsCache | undefined = undefined
  private initPromise: Promise<void> | undefined = undefined

  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<GuestPermissionsMiddleware> {
    return new GuestPermissionsMiddleware(context, next)
  }

  private async getPermissionsCache (ctx: MeasureContext): Promise<GuestPermissionsCache> {
    if (this.permissionsCache !== undefined) return this.permissionsCache
    if (this.initPromise === undefined) {
      this.initPromise = this.loadPermissionsCache(ctx)
    }
    await this.initPromise
    this.initPromise = undefined
    return this.permissionsCache ?? { roleAllowedClasses: new Map() }
  }

  private async loadPermissionsCache (ctx: MeasureContext): Promise<void> {
    try {
      const docs = await this.findAll(ctx, core.class.ModulePermissionGroup, {}, {})
      if (docs.length > 0) {
        const rolePermissions = new Map<AccountRole, Set<Ref<Permission>>>()
        const allPermissionIds = new Set<Ref<Permission>>()
        for (const group of docs as any[]) {
          if (group.enabled === false) continue
          const role = ((group.role as AccountRole | undefined) ??
            (Array.isArray(group.roles) && group.roles.length > 0 ? (group.roles[0] as AccountRole) : undefined) ??
            AccountRole.Guest) as AccountRole
          const permissions = (group.permissions ?? []) as Ref<Permission>[]
          const disabled = new Set<Ref<Permission>>((group.disabledPermissions ?? []) as Ref<Permission>[])
          const current = rolePermissions.get(role) ?? new Set<Ref<Permission>>()
          for (const permissionId of permissions) {
            if (disabled.has(permissionId)) continue
            current.add(permissionId)
            allPermissionIds.add(permissionId)
          }
          rolePermissions.set(role, current)
        }
        const classPermissions =
          allPermissionIds.size > 0
            ? await this.findAll(
              ctx,
              core.class.ClassPermission as Ref<Class<Doc>>,
              { _id: { $in: Array.from(allPermissionIds) } } as any
            )
            : []
        const permissionToClass = new Map<Ref<Permission>, Ref<Class<Doc>>>(
          classPermissions
            .map(
              (permission) => [permission._id as Ref<Permission>, (permission as ClassPermission).targetClass] as const
            )
            .filter((entry): entry is readonly [Ref<Permission>, Ref<Class<Doc>>] => entry[1] !== undefined)
        )
        const roleAllowedClasses = new Map<AccountRole, Set<Ref<Class<Doc>>>>()
        for (const [role, permissions] of rolePermissions.entries()) {
          const allowedClasses = new Set<Ref<Class<Doc>>>()
          for (const permissionId of permissions) {
            const targetClass = permissionToClass.get(permissionId)
            if (targetClass !== undefined) allowedClasses.add(targetClass)
          }
          roleAllowedClasses.set(role, allowedClasses)
        }
        this.permissionsCache = { roleAllowedClasses }
      } else {
        this.permissionsCache = { roleAllowedClasses: new Map() }
      }
    } catch {
      this.permissionsCache = { roleAllowedClasses: new Map() }
    }
  }

  private invalidateCacheIfNeeded (txes: Tx[]): void {
    for (const tx of txes) {
      if (TxProcessor.isExtendsCUD(tx._class)) {
        const cudTx = tx as TxCUD<Doc>
        if (cudTx.objectClass === core.class.ModulePermissionGroup) {
          this.permissionsCache = undefined
          return
        }
      }
    }
  }

  async tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    const account = ctx.contextData.account
    if (hasAccountRole(account, AccountRole.User)) {
      this.invalidateCacheIfNeeded(txes)
      return await this.provideTx(ctx, txes)
    }

    if (account.role === AccountRole.DocGuest || account.role === AccountRole.ReadOnlyGuest) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }

    for (const tx of txes) {
      await this.processTx(ctx, tx)
    }

    return await this.provideTx(ctx, txes)
  }

  private async processTx (ctx: MeasureContext<SessionData>, tx: Tx): Promise<void> {
    const h = this.context.hierarchy
    if (tx._class === core.class.TxApplyIf) {
      const applyTx = tx as TxApplyIf
      for (const t of applyTx.txes) {
        await this.processTx(ctx, t)
      }
      return
    }
    if (TxProcessor.isExtendsCUD(tx._class)) {
      const { account } = ctx.contextData
      const cudTx = tx as TxCUD<Doc>
      const isSpace = h.isDerived(cudTx.objectClass, core.class.Space)
      if (isSpace) {
        if (await this.isForbiddenSpaceTx(ctx, cudTx as TxCUD<Space>, account)) {
          throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
        }
      } else if (cudTx.space !== core.space.DerivedTx && (await this.isForbiddenTx(ctx, cudTx, account))) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      }
      if (await this.isForbiddenCollabOnlyGuestFieldUpdate(ctx, cudTx, account)) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      }
    }
  }

  /**
   * Class-agnostic, level-aware veto for field updates / removes on docs whose
   * class has opted into access-granting collaborators (provideSecurity: true,
   * mentionsGrantAccess: true on the ClassCollaborators model entry).
   *
   * The caller is "collab-only" on the target doc when their only route to it is
   * a per-doc Collaborator grant, i.e. they are NOT a space member and:
   *   - they are a guest-tier account, OR
   *   - they are a regular User and the space is PRIVATE (a public space is a
   *     normal collaborative space reached without a grant → unchanged behavior).
   * Workspace-privileged accounts (Maintainer+) and space members always pass.
   *
   * For a collab-only caller the grant LEVEL decides (P2.3, ordinal read<write<admin):
   *   - TxUpdateDoc (field write): allowed only if the caller holds a Collaborator
   *     record with level >= write on the doc (max over all their records);
   *     a read-only grant (or no grant) is vetoed.
   *   - TxRemoveDoc (L-RM): deleting the doc itself is reserved for space
   *     members/owners and is vetoed regardless of grant level.
   *   - Comments via chunter.class.ChatMessage keep flowing (createAccessLevel).
   *
   * L-GP fail-closed: an unresolvable space forbids. If the class has not opted
   * in, this veto is a no-op (returns false).
   */
  private async isForbiddenCollabOnlyGuestFieldUpdate (
    ctx: MeasureContext<SessionData>,
    cudTx: TxCUD<Doc>,
    account: Account
  ): Promise<boolean> {
    // L-RM: veto covers both field-updates AND removes.
    if (cudTx._class !== core.class.TxUpdateDoc && cudTx._class !== core.class.TxRemoveDoc) return false

    const classCollab = getClassCollaborators(this.context.modelDb, this.context.hierarchy, cudTx.objectClass)
    if (classCollab?.provideSecurity !== true) return false
    if (classCollab.mentionsGrantAccess !== true) return false

    const space = (await this.findAll<Space>(ctx, core.class.Space, { _id: cudTx.objectSpace }))[0]
    // L-GP: fail-closed — if the doc's space cannot be resolved we cannot prove
    // the caller is a space member, so the veto must FORBID.
    if (space === undefined) return true
    if (space.members?.includes(account.uuid)) return false

    // Non-member. Decide whether the caller is "collab-only" (subject to the veto).
    const isGuest =
      account.role === AccountRole.Guest ||
      account.role === AccountRole.DocGuest ||
      account.role === AccountRole.ReadOnlyGuest
    if (!isGuest) {
      // Workspace-privileged accounts keep broad authority (unchanged).
      if (hasAccountRole(account, AccountRole.Maintainer)) return false
      // A regular User is only collab-only on a PRIVATE space; on a public space
      // they participate through normal visibility (no grant) → unchanged pass.
      // Fail-closed: treat anything other than an explicit public flag as private.
      if (!space.private) return false
    }

    // Collab-only caller. Field updates require level >= write; removes stay
    // vetoed. A person may hold several records (e.g. mention:read + manual:write)
    // — the highest level wins.
    if (cudTx._class === core.class.TxUpdateDoc) {
      const grants = await this.findAll<Collaborator>(ctx, core.class.Collaborator, {
        attachedTo: cudTx.objectId,
        collaborator: account.uuid
      })
      if (grants.some((g) => hasAtLeast(g.level, 'write'))) return false
    }

    return true
  }

  /**
   * Returns the covered-class ancestor of the objectClass if one exists in the new permissions model,
   * or undefined if the class is not covered.
   */
  private getCoveredClass (
    objectClass: Ref<Class<Doc>>,
    allowedClasses: Set<Ref<Class<Doc>>>
  ): Ref<Class<Doc>> | undefined {
    if (allowedClasses.size === 0) return undefined
    const h = this.context.hierarchy
    for (const coveredClass of allowedClasses) {
      if (h.isDerived(objectClass, coveredClass)) {
        return coveredClass
      }
    }
    return undefined
  }

  private isCreatedByAccount (doc: Doc, account: Account): boolean {
    const creator = doc.createdBy
    if (creator === undefined) return false
    if (creator === account.primarySocialId) return true
    return account.socialIds.includes(creator)
  }

  private async isGuestMutationOnOwnDoc (ctx: MeasureContext, tx: TxCUD<Doc>, account: Account): Promise<boolean> {
    if (tx._class !== core.class.TxUpdateDoc && tx._class !== core.class.TxRemoveDoc) return false
    const docs = await this.findAll(ctx, tx.objectClass, { _id: tx.objectId }, { limit: 1 })
    const doc = docs[0] as Doc | undefined
    if (doc === undefined) return false
    return this.isCreatedByAccount(doc, account)
  }

  private async isForbiddenTx (ctx: MeasureContext, tx: TxCUD<Doc>, account: Account): Promise<boolean> {
    if (tx._class === core.class.TxMixin) return false

    // For TxCreateDoc, check the new permission model first for covered types.
    if (tx._class === core.class.TxCreateDoc) {
      const cache = await this.getPermissionsCache(ctx)
      const roleAllowedClasses = cache.roleAllowedClasses.get(account.role) ?? new Set<Ref<Class<Doc>>>()
      const coveredClass = this.getCoveredClass(tx.objectClass, roleAllowedClasses)
      if (coveredClass !== undefined) {
        return false
      }
      // Uncovered class: fall through to TxAccessLevel check.
    }

    if (await this.hasMixinAccessLevel(ctx, tx, account)) {
      return false
    }

    if (tx._class === core.class.TxUpdateDoc || tx._class === core.class.TxRemoveDoc) {
      if (await this.isGuestMutationOnOwnDoc(ctx, tx, account)) {
        return false
      }
    }

    return true
  }

  private async isForbiddenSpaceTx (ctx: MeasureContext, tx: TxCUD<Space>, account: Account): Promise<boolean> {
    if (tx._class === core.class.TxRemoveDoc) return true
    if (tx._class === core.class.TxCreateDoc) {
      return !(await this.hasMixinAccessLevel(ctx, tx, account))
    }
    if (tx._class === core.class.TxUpdateDoc) {
      const updateTx = tx as TxUpdateDoc<Space>
      const ops = updateTx.operations
      const keys = ['members', 'private', 'archived', 'owners', 'autoJoin']
      if (keys.some((key) => (ops as any)[key] !== undefined)) {
        return true
      }
      if (ops.$push !== undefined || ops.$pull !== undefined) {
        return true
      }
    }
    return false
  }

  private async hasMixinAccessLevel (ctx: MeasureContext, tx: TxCUD<Doc>, account: Account): Promise<boolean> {
    const h = this.context.hierarchy
    const accessLevelMixin = h.classHierarchyMixin(tx.objectClass, core.mixin.TxAccessLevel)
    if (accessLevelMixin === undefined) return false
    if (tx._class === core.class.TxCreateDoc) {
      return accessLevelMixin.createAccessLevel === AccountRole.Guest
    }
    if (tx._class === core.class.TxRemoveDoc) {
      return accessLevelMixin.removeAccessLevel === AccountRole.Guest
    }
    if (tx._class === core.class.TxUpdateDoc) {
      if (accessLevelMixin.isIdentity === true && account.socialIds.includes(tx.objectId as unknown as PersonId)) {
        return true
      }
      if (accessLevelMixin.isIdentity === true && h.isDerived(tx.objectClass, contact.class.Person)) {
        const person = (await this.findAll(ctx, tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0] as
          | Person
          | undefined
        return person?.personUuid === account.uuid
      }
      return accessLevelMixin.updateAccessLevel === AccountRole.Guest
    }
    return false
  }
}
