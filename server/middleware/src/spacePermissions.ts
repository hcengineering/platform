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
  Class,
  Doc,
  Permission,
  Ref,
  Role,
  RolesAssignment,
  Space,
  SpaceType,
  Tx,
  TxApplyIf,
  TxCUD,
  TxCreateDoc,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  TypedSpace,
  type MeasureContext,
  type SessionData,
  type AccountUuid
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import { Middleware, TxMiddlewareResult, type PipelineContext } from '@hcengineering/server-core'

import { BaseMiddleware } from '@hcengineering/server-core'

/**
 * @public
 */
export class SpacePermissionsMiddleware extends BaseMiddleware implements Middleware {
  private whitelistSpaces = new Set<Ref<Space>>()
  private assignmentBySpace: Record<Ref<Space>, RolesAssignment> = {}
  private permissionsBySpace: Record<Ref<Space>, Record<AccountUuid, Set<Ref<Permission>>>> = {}
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

  private getRoles (spaceTypeId: Ref<SpaceType>): Role[] {
    return this.context.modelDb.findAllSync(core.class.Role, { attachedTo: spaceTypeId })
  }

  private setPermissions (spaceId: Ref<Space>, roles: Role[], assignment: RolesAssignment): void {
    for (const role of roles) {
      const roleMembers: AccountUuid[] = assignment[role._id] ?? []

      for (const member of roleMembers) {
        if (this.permissionsBySpace[spaceId][member] === undefined) {
          this.permissionsBySpace[spaceId][member] = new Set()
        }

        for (const permission of role.permissions) {
          this.permissionsBySpace[spaceId][member].add(permission)
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

    this.setPermissions(space._id, this.getRoles(spaceType._id), asMixin)
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
  private checkPermission (ctx: MeasureContext<SessionData>, space: Ref<TypedSpace>, id: Ref<Permission>): boolean {
    const account = ctx.contextData.account
    const permissions = this.permissionsBySpace[space]?.[account.uuid] ?? null

    return permissions !== null && permissions.has(id)
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
      if (res !== undefined) {
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
    this.setPermissions(spaceId, this.getRoles(spaceType._id), assignment)
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
      this.setPermissions(spaceId, roles, assignment)
    }
  }

  private handlePermissionsUpdatesFromTx (ctx: MeasureContext, tx: TxCUD<Doc>): void {
    if (this.isSpaceTxCUD(tx)) {
      if (tx._class === core.class.TxCreateDoc) {
        this.handleCreate(tx)
        // } else if (tx._class === core.class.TxUpdateDoc) {
        // Roles assignment in spaces are managed through the space type mixin
        // so nothing to handle here
      } else if (tx._class === core.class.TxMixin) {
        this.handleMixin(tx)
      } else if (tx._class === core.class.TxRemoveDoc) {
        this.handleRemove(tx)
      }
    }

    this.handlePermissionsUpdatesFromRoleTx(ctx, tx)
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
      this.processPermissionsUpdatesFromTx(ctx, tx)
      this.checkPermissions(ctx, tx)
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
    // NOTE: in assumption that we want to control permissions for space itself on that space level
    // and not on the system's spaces space level for now
    const targetSpaceId = (isSpace ? cudTx.objectId : cudTx.objectSpace) as Ref<Space>

    if (this.whitelistSpaces.has(targetSpaceId)) {
      return
    }

    // NOTE: move this checking logic later to be defined in some server plugins?
    // so they can contribute checks into the middleware for their custom permissions?
    if (tx._class === core.class.TxRemoveDoc) {
      if (this.checkPermission(ctx, targetSpaceId as Ref<TypedSpace>, core.permission.ForbidDeleteObject)) {
        this.throwForbidden()
      }
    }
  }
}
