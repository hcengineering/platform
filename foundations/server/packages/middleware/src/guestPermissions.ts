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
  type Doc,
  type ClassPermission,
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
          const roles = (group.roles ?? [AccountRole.Guest]) as AccountRole[]
          const permissions = (group.permissions ?? []) as Ref<Permission>[]
          for (const role of roles) {
            const current = rolePermissions.get(role) ?? new Set<Ref<Permission>>()
            for (const permissionId of permissions) {
              current.add(permissionId)
              allPermissionIds.add(permissionId)
            }
            rolePermissions.set(role, current)
          }
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
    }
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

    return !(await this.hasMixinAccessLevel(ctx, tx, account))
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
