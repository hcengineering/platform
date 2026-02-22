//
// Copyright © 2024 Hardcore Engineering Inc.
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
  type Class,
  type Doc,
  type Permission,
  type Ref,
  type Role,
  type RolesAssignment,
  type Space,
  type SpaceType,
  type Tx,
  type TxApplyIf,
  type TxCUD,
  type TxCreateDoc,
  type TxMixin,
  TxProcessor,
  type TxRemoveDoc,
  type TxUpdateDoc,
  type TypedSpace,
  type MeasureContext,
  type SessionData,
  type AccountUuid,
  matchQuery
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import { type Middleware, type TxMiddlewareResult, type PipelineContext } from '@hcengineering/server-core'
import contact from '@hcengineering/contact'
import { BaseMiddleware } from '@hcengineering/server-core'

/**
 * @public
 */
export class SpacePermissionsMiddleware extends BaseMiddleware implements Middleware {
  private whitelistSpaces = new Set<Ref<Space>>()
  private readonly restrictedSpaces = new Set<Ref<Space>>()
  private assignmentBySpace: Record<Ref<Space>, RolesAssignment> = {}
  private permissionsBySpace: Record<Ref<Space>, Record<AccountUuid, Set<Permission>>> = {}
  private typeBySpace: Record<Ref<Space>, Ref<SpaceType>> = {}
  wasInit: Promise<void> | boolean = false

  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<SpacePermissionsMiddleware> {
    return new SpacePermissionsMiddleware(context, next)
  }

  private async init (ctx: MeasureContext): Promise<void> {
    if (this.wasInit === true) {
      return
    }
    if (this.wasInit === false) {
      this.wasInit = (async () => {
        const spaces: Space[] = (await this.next?.findAll(ctx, core.class.Space, {})) ?? []

        for (const space of spaces) {
          if (this.isTypedSpace(space)) {
            this.addRestrictedSpace(space)
          }
        }

        this.whitelistSpaces = new Set(spaces.filter((s) => !this.isTypedSpaceClass(s._class)).map((p) => p._id))
      })()
    }
    if (this.wasInit instanceof Promise) {
      await this.wasInit
      this.wasInit = true
    }
  }

  private getPermissions (): Permission[] {
    return this.context.modelDb.findAllSync(core.class.Permission, {})
  }

  private getRoles (spaceTypeId: Ref<SpaceType>): Role[] {
    return this.context.modelDb.findAllSync(core.class.Role, { attachedTo: spaceTypeId })
  }

  private setPermissions (
    spaceId: Ref<Space>,
    roles: Role[],
    assignment: RolesAssignment,
    permissions: Permission[]
  ): void {
    for (const role of roles) {
      const roleMembers: AccountUuid[] = assignment[role._id] ?? []

      for (const member of roleMembers) {
        if (this.permissionsBySpace[spaceId][member] === undefined) {
          this.permissionsBySpace[spaceId][member] = new Set()
        }

        for (const permission of role.permissions) {
          const p = permissions.find((p) => p._id === permission)
          if (p === undefined) continue
          this.permissionsBySpace[spaceId][member].add(p)
        }
      }
    }
  }

  private addRestrictedSpace (space: TypedSpace): void {
    this.permissionsBySpace[space._id] = {}

    const spaceType = this.context.modelDb.findAllSync(core.class.SpaceType, { _id: space.type })[0]

    if (spaceType === undefined) {
      return
    }

    if (space.restricted === true) {
      this.restrictedSpaces.add(space._id)
    } else {
      this.restrictedSpaces.delete(space._id)
    }

    this.typeBySpace[space._id] = space.type

    const asMixin: RolesAssignment = this.context.hierarchy.as(
      space,
      spaceType.targetClass
    ) as unknown as RolesAssignment

    const allPossibleRoles = this.context.modelDb.findAllSync(core.class.Role, {})
    const requiredValues: Record<string, any> = {}
    for (const role of allPossibleRoles) {
      const v = asMixin[role._id]
      if (v !== undefined) {
        requiredValues[role._id] = asMixin[role._id]
      }
    }

    this.assignmentBySpace[space._id] = requiredValues

    this.setPermissions(space._id, this.getRoles(spaceType._id), asMixin, this.getPermissions())
  }

  private isTypedSpaceClass (_class: Ref<Class<Space>>): boolean {
    const h = this.context.hierarchy

    return h.isDerived(_class, core.class.TypedSpace)
  }

  private isTypedSpace (space: Space): space is TypedSpace {
    return this.isTypedSpaceClass(space._class)
  }

  /**
   * @private
   *
   * Checks if the required permission is present in the space for the given context
   */
  private checkPermission (
    ctx: MeasureContext<SessionData>,
    space: Ref<TypedSpace>,
    tx: TxCUD<Doc>,
    isSpace: boolean
  ): boolean {
    const account = ctx.contextData.account
    if (account.primarySocialId === core.account.System) return true
    const permissions = this.permissionsBySpace[space]?.[account.uuid] ?? []
    let withoutMatch: Permission | undefined
    for (const permission of permissions) {
      if (!isTxClassMatched(tx, permission)) continue
      if (
        permission.objectClass !== undefined &&
        !this.context.hierarchy.isDerived(getTxObjectClass(tx), permission.objectClass)
      ) {
        continue
      }
      if (permission.txMatch === undefined) {
        withoutMatch = permission
        continue
      } else {
        const checkMatch = matchQuery([tx], permission.txMatch, tx._class, this.context.hierarchy, true)
        if (checkMatch.length === 0) {
          continue
        }
      }
      return permission.forbid !== undefined ? !permission.forbid : true
    }

    if (withoutMatch !== undefined) {
      return withoutMatch.forbid !== undefined ? !withoutMatch.forbid : true
    }

    if (isSpace || !this.restrictedSpaces.has(space)) {
      return true
    }

    const attachedDocAncestors = this.context.hierarchy.getAncestors(core.class.AttachedDoc)
    const ancestors = this.context.hierarchy.getAncestors(getTxObjectClass(tx))
    const targetAncestors = ancestors.filter((a) => !attachedDocAncestors.includes(a))

    const allPermissions = this.context.modelDb.findAllSync(core.class.Permission, {
      objectClass: { $in: targetAncestors }
    })
    for (const permission of allPermissions) {
      if (!isTxClassMatched(tx, permission)) continue
      if (
        permission.objectClass !== undefined &&
        !this.context.hierarchy.isDerived(getTxObjectClass(tx), permission.objectClass)
      ) {
        continue
      }
      if (permission.txMatch === undefined) {
        return false
      } else {
        const checkMatch = matchQuery([tx], permission.txMatch, tx._class, this.context.hierarchy, true)
        if (checkMatch.length === 0) {
          continue
        }
        return false
      }
    }

    return true
  }

  private throwForbidden (): void {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  // /**
  //  * @private
  //  *
  //  * Throws if the required permission is missing in the space for the given context
  //  */
  // private async needPermission (ctx: MeasureContext, space: Ref<TypedSpace>, id: Ref<Permission>): Promise<void> {
  //   if (this.checkPermission(ctx, space, id)) {
  //     return
  //   }

  //   this.throwForbidden()
  // }

  private handleCreate (tx: TxCUD<Space>): void {
    const createTx = tx as TxCreateDoc<Space>
    if (!this.context.hierarchy.isDerived(createTx.objectClass, core.class.Space)) return
    if (this.isTypedSpaceClass(createTx.objectClass)) {
      const res = TxProcessor.buildDoc2Doc<TypedSpace>([createTx])
      if (res != null) {
        this.addRestrictedSpace(res)
      }
    } else {
      this.whitelistSpaces.add(createTx.objectId)
    }
  }

  private handleMixin (tx: TxCUD<Space>): void {
    if (!this.isTypedSpaceClass(tx.objectClass)) {
      return
    }

    const spaceId = tx.objectId
    const spaceTypeId = this.typeBySpace[spaceId]

    if (spaceTypeId === undefined) {
      return
    }

    const spaceType = this.context.modelDb.findAllSync(core.class.SpaceType, { _id: spaceTypeId }).shift()

    if (spaceType === undefined) {
      return
    }

    const mixinDoc = tx as TxMixin<Space, Space>

    if (mixinDoc.mixin !== spaceType.targetClass) {
      return
    }

    // Note: currently the whole assignment is always included into the mixin update
    // so we can just rebuild the permissions
    const assignment: RolesAssignment = mixinDoc.attributes as RolesAssignment

    const allPossibleRoles = this.context.modelDb.findAllSync(core.class.Role, {})
    const requiredValues: Record<string, any> = {}
    for (const role of allPossibleRoles) {
      const v = assignment[role._id]
      if (v !== undefined) {
        requiredValues[role._id] = assignment[role._id]
      }
    }

    this.assignmentBySpace[spaceId] = requiredValues

    this.permissionsBySpace[tx.objectId] = {}
    this.setPermissions(spaceId, this.getRoles(spaceType._id), assignment, this.getPermissions())
  }

  private handleRemove (tx: TxCUD<Space>): void {
    const removeTx = tx as TxRemoveDoc<Space>
    if (!this.context.hierarchy.isDerived(removeTx.objectClass, core.class.Space)) return
    if (removeTx._class !== core.class.TxCreateDoc) return
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.permissionsBySpace[tx.objectId]
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.assignmentBySpace[tx.objectId]
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.typeBySpace[tx.objectId]

    this.whitelistSpaces.delete(tx.objectId)
    this.restrictedSpaces.delete(tx.objectId)
  }

  private isSpaceTxCUD (tx: TxCUD<Doc>): tx is TxCUD<Space> {
    return this.context.hierarchy.isDerived(tx.objectClass, core.class.Space)
  }

  private isRoleTxCUD (tx: TxCUD<Doc>): tx is TxCUD<Role> {
    return this.context.hierarchy.isDerived(tx.objectClass, core.class.Role)
  }

  private handlePermissionsUpdatesFromRoleTx (ctx: MeasureContext, actualTx: TxCUD<Doc>): void {
    if (actualTx._class !== core.class.TxUpdateDoc) {
      return
    }

    const targetSpaceTypeId = actualTx.attachedTo
    if (targetSpaceTypeId === undefined) {
      return
    }

    if (!this.isRoleTxCUD(actualTx)) {
      return
    }

    // We are only interested in updates of the existing roles because:
    // When role is created it always has empty set of permissions
    // And it's not currently possible to delete a role
    const updateTx = actualTx as TxUpdateDoc<Role>

    if (updateTx.operations.permissions === undefined) {
      return
    }

    // Find affected spaces
    const affectedSpacesIds = Object.entries(this.typeBySpace)
      .filter(([, typeId]) => typeId === targetSpaceTypeId)
      .map(([spaceId]) => spaceId) as Ref<TypedSpace>[]

    for (const spaceId of affectedSpacesIds) {
      const spaceTypeId = this.typeBySpace[spaceId]

      if (spaceTypeId === undefined) {
        return
      }

      const assignment: RolesAssignment = this.assignmentBySpace[spaceId]
      const roles = this.getRoles(spaceTypeId)
      const targetRole = roles.find((r) => r._id === updateTx.objectId)

      if (targetRole === undefined) {
        continue
      }

      targetRole.permissions = updateTx.operations.permissions

      this.permissionsBySpace[spaceId] = {}
      this.setPermissions(spaceId, roles, assignment, this.getPermissions())
    }
  }

  private handlePermissionsUpdatesFromTx (ctx: MeasureContext, tx: TxCUD<Doc>): void {
    if (this.isSpaceTxCUD(tx)) {
      if (tx._class === core.class.TxCreateDoc) {
        this.handleCreate(tx)
      } else if (tx._class === core.class.TxUpdateDoc) {
        this.handleSpaceUpdate(tx)
      } else if (tx._class === core.class.TxMixin) {
        this.handleMixin(tx)
      } else if (tx._class === core.class.TxRemoveDoc) {
        this.handleRemove(tx)
      }
    }

    this.handlePermissionsUpdatesFromRoleTx(ctx, tx)
  }

  private handleSpaceUpdate (tx: TxCUD<Space>): void {
    if (!this.isTypedSpaceClass(tx.objectClass)) {
      return
    }

    const updateTx = tx as TxUpdateDoc<TypedSpace>
    if (updateTx.operations.restricted !== undefined) {
      if (updateTx.operations.restricted) {
        this.restrictedSpaces.add(tx.objectId)
      } else {
        this.restrictedSpaces.delete(tx.objectId)
      }
    }
  }

  private processPermissionsUpdatesFromTx (ctx: MeasureContext, tx: Tx): void {
    if (!TxProcessor.isExtendsCUD(tx._class)) {
      return
    }

    const cudTx = tx as TxCUD<Doc>
    this.handlePermissionsUpdatesFromTx(ctx, cudTx)
  }

  async tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    await this.init(ctx)
    for (const tx of txes) {
      this.checkPermissions(ctx, tx)
      this.processPermissionsUpdatesFromTx(ctx, tx)
    }
    const res = await this.provideTx(ctx, txes)
    for (const txd of ctx.contextData.broadcast.txes) {
      this.processPermissionsUpdatesFromTx(ctx, txd)
    }
    return res
  }

  protected checkPermissions (ctx: MeasureContext, tx: Tx): void {
    if (tx._class === core.class.TxApplyIf) {
      const applyTx = tx as TxApplyIf

      for (const t of applyTx.txes) {
        this.checkPermissions(ctx, t)
      }
      return
    }

    const cudTx = tx as TxCUD<Doc>
    const h = this.context.hierarchy
    const isSpace = h.isDerived(cudTx.objectClass, core.class.Space)

    this.checkSpacePermissions(ctx, cudTx, cudTx.objectSpace)
    if (isSpace) {
      this.checkSpaceTypePermissions(ctx, cudTx as TxCUD<Space>)
      this.checkSpacePermissions(ctx, cudTx, cudTx.objectId as Ref<Space>, true)
    }
  }

  private checkSpaceTypePermissions (ctx: MeasureContext, cudTx: TxCUD<Space>): void {
    const account = ctx.contextData.account
    const h = this.context.hierarchy
    if (account.primarySocialId === core.account.System) return

    if (h.isDerived(cudTx.objectClass, contact.class.PersonSpace)) {
      this.throwForbidden()
    }
  }

  private checkSpacePermissions (
    ctx: MeasureContext,
    cudTx: TxCUD<Doc>,
    targetSpaceId: Ref<Space>,
    isSpace: boolean = false
  ): void {
    if (this.whitelistSpaces.has(targetSpaceId)) {
      return
    }
    // NOTE: move this checking logic later to be defined in some server plugins?
    // so they can contribute checks into the middleware for their custom permissions?
    if (!this.checkPermission(ctx, targetSpaceId as Ref<TypedSpace>, cudTx, isSpace)) {
      this.throwForbidden()
    }
  }
}

function isMixinUpdateTx (tx: Tx): boolean {
  return tx._class === core.class.TxMixin && Object.keys((tx as TxMixin<Doc, Doc>).attributes).length > 0
}

function isTxClassMatched (tx: Tx, permission: Permission): boolean {
  if (permission.txClass === tx._class) return true
  if (permission.txMatch === undefined && isMixinUpdateTx(tx)) {
    return permission.txClass === core.class.TxUpdateDoc
  }
  return false
}

function getTxObjectClass (tx: TxCUD<Doc>): Ref<Class<Doc>> {
  return tx._class === core.class.TxMixin ? (tx as TxMixin<Doc, Doc>).mixin : tx.objectClass
}
