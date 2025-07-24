import {
  BaseMiddleware,
  type Middleware,
  type PipelineContext,
  type TxMiddlewareResult
} from '@hcengineering/server-core'
import core, {
  AccountRole,
  type Doc,
  hasAccountRole,
  type MeasureContext,
  type SessionData,
  type Space,
  type Tx,
  type TxApplyIf,
  type TxCUD,
  TxProcessor,
  type TxUpdateDoc
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'

export class GuestPermissionsMiddleware extends BaseMiddleware implements Middleware {
  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<GuestPermissionsMiddleware> {
    return new GuestPermissionsMiddleware(context, next)
  }

  async tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    const account = ctx.contextData.account
    if (hasAccountRole(account, AccountRole.User)) {
      return await this.provideTx(ctx, txes)
    }

    if (account.role === AccountRole.DocGuest || account.role === AccountRole.ReadOnlyGuest) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }

    for (const tx of txes) {
      this.processTx(ctx, tx)
    }

    return await this.provideTx(ctx, txes)
  }

  private processTx (ctx: MeasureContext<SessionData>, tx: Tx): void {
    const h = this.context.hierarchy
    if (tx._class === core.class.TxApplyIf) {
      const applyTx = tx as TxApplyIf
      for (const t of applyTx.txes) {
        this.processTx(ctx, t)
      }
      return
    }
    if (TxProcessor.isExtendsCUD(tx._class)) {
      const cudTx = tx as TxCUD<Doc>
      const isSpace = h.isDerived(cudTx.objectClass, core.class.Space)
      if (isSpace) {
        if (this.isForbiddenSpaceTx(cudTx as TxCUD<Space>)) {
          throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
        }
      } else if (cudTx.space !== core.space.DerivedTx && this.isForbiddenTx(cudTx)) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      }
    }
  }

  private isForbiddenTx (tx: TxCUD<Doc>): boolean {
    if (tx._class === core.class.TxMixin) return false
    return !this.hasMixinAccessLevel(tx)
  }

  private isForbiddenSpaceTx (tx: TxCUD<Space>): boolean {
    if (tx._class === core.class.TxRemoveDoc) return true
    if (tx._class === core.class.TxCreateDoc) {
      return !this.hasMixinAccessLevel(tx)
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

  private hasMixinAccessLevel (tx: TxCUD<Doc>): boolean {
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
      return accessLevelMixin.updateAccessLevel === AccountRole.Guest
    }
    return false
  }
}
