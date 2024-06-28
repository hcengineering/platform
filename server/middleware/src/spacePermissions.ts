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
  Account,
  AttachedDoc,
  Class,
  Doc,
  MeasureContext,
  Permission,
  Ref,
  Role,
  RolesAssignment,
  Space,
  SpaceType,
  Tx,
  TxApplyIf,
  TxCUD,
  TxCollectionCUD,
  TxCreateDoc,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  TypedSpace
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import { Middleware, SessionContext, TxMiddlewareResult, type ServerStorage } from '@hcengineering/server-core'

import { BaseMiddleware } from './base'
import { getUser } from './utils'

/**
 * @public
 */
export class SpacePermissionsMiddleware extends BaseMiddleware implements Middleware {
  private spaceMeasureCtx!: MeasureContext
  private whitelistSpaces = new Set<Ref<Space>>()
  private assignmentBySpace: Record<Ref<Space>, RolesAssignment> = {}
  private permissionsBySpace: Record<Ref<Space>, Record<Ref<Account>, Set<Ref<Permission>>>> = {}
  private typeBySpace: Record<Ref<Space>, Ref<SpaceType>> = {}

  static async create (
    ctx: MeasureContext,
    storage: ServerStorage,
    next?: Middleware
  ): Promise<SpacePermissionsMiddleware> {
    const res = new SpacePermissionsMiddleware(storage, next)
    res.spaceMeasureCtx = ctx.newChild('space permisisons', {})
    await res.init(res.spaceMeasureCtx)
    return res
  }

  private async init (ctx: MeasureContext): Promise<void> {
    const spaces: Space[] = await this.storage.findAll(ctx, core.class.Space, {})

    for (const space of spaces) {
      if (this.isTypedSpace(space)) {
        await this.addRestrictedSpace(space)
      }
    }

    this.whitelistSpaces = new Set(spaces.filter((s) => !this.isTypedSpaceClass(s._class)).map((p) => p._id))
  }

  private async getRoles (spaceTypeId: Ref<SpaceType>): Promise<Role[]> {
    return await this.storage.modelDb.findAll(core.class.Role, { attachedTo: spaceTypeId })
  }

  private async setPermissions (spaceId: Ref<Space>, roles: Role[], assignment: RolesAssignment): Promise<void> {
    for (const role of roles) {
      const roleMembers: Ref<Account>[] = assignment[role._id] ?? []

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

  private async addRestrictedSpace (space: TypedSpace): Promise<void> {
    this.permissionsBySpace[space._id] = {}

    const spaceType = await this.storage.modelDb.findOne(core.class.SpaceType, { _id: space.type })

    if (spaceType === undefined) {
      return
    }

    this.typeBySpace[space._id] = space.type

    const asMixin: RolesAssignment = this.storage.hierarchy.as(
      space,
      spaceType.targetClass
    ) as unknown as RolesAssignment

    const allPossibleRoles = this.storage.modelDb.findAllSync(core.class.Role, {})
    const requiredValues: Record<string, any> = {}
    for (const role of allPossibleRoles) {
      const v = asMixin[role._id]
      if (v !== undefined) {
        requiredValues[role._id] = asMixin[role._id]
      }
    }

    this.assignmentBySpace[space._id] = requiredValues

    await this.setPermissions(space._id, await this.getRoles(spaceType._id), asMixin)
  }

  private isTypedSpaceClass (_class: Ref<Class<Space>>): boolean {
    const h = this.storage.hierarchy

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
  private async checkPermission (ctx: SessionContext, space: Ref<TypedSpace>, id: Ref<Permission>): Promise<boolean> {
    const account = await getUser(this.storage, ctx)
    const permissions = this.permissionsBySpace[space]?.[account._id] ?? new Set()

    return permissions.has(id)
  }

  private throwForbidden (): void {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  /**
   * @private
   *
   * Throws if the required permission is missing in the space for the given context
   */
  private async needPermission (ctx: SessionContext, space: Ref<TypedSpace>, id: Ref<Permission>): Promise<void> {
    if (await this.checkPermission(ctx, space, id)) {
      return
    }

    this.throwForbidden()
  }

  private async handleCreate (tx: TxCUD<Space>): Promise<void> {
    const createTx = tx as TxCreateDoc<Space>
    if (!this.storage.hierarchy.isDerived(createTx.objectClass, core.class.Space)) return
    if (this.isTypedSpaceClass(createTx.objectClass)) {
      const res = TxProcessor.buildDoc2Doc<TypedSpace>([createTx])
      if (res !== undefined) {
        await this.addRestrictedSpace(res)
      }
    } else {
      this.whitelistSpaces.add(createTx.objectId)
    }
  }

  private async handleMixin (tx: TxCUD<Space>): Promise<void> {
    if (!this.isTypedSpaceClass(tx.objectClass)) {
      return
    }

    const spaceId = tx.objectId
    const spaceTypeId = this.typeBySpace[spaceId]

    if (spaceTypeId === undefined) {
      return
    }

    const spaceType = await this.storage.modelDb.findOne(core.class.SpaceType, { _id: spaceTypeId })

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

    const allPossibleRoles = this.storage.modelDb.findAllSync(core.class.Role, {})
    const requiredValues: Record<string, any> = {}
    for (const role of allPossibleRoles) {
      const v = assignment[role._id]
      if (v !== undefined) {
        requiredValues[role._id] = assignment[role._id]
      }
    }

    this.assignmentBySpace[spaceId] = requiredValues

    this.permissionsBySpace[tx.objectId] = {}
    await this.setPermissions(spaceId, await this.getRoles(spaceType._id), assignment)
  }

  private handleRemove (tx: TxCUD<Space>): void {
    const removeTx = tx as TxRemoveDoc<Space>
    if (!this.storage.hierarchy.isDerived(removeTx.objectClass, core.class.Space)) return
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
    return this.storage.hierarchy.isDerived(tx.objectClass, core.class.Space)
  }

  private isTxCollectionCUD (tx: TxCUD<Doc>): tx is TxCollectionCUD<Doc, AttachedDoc> {
    return this.storage.hierarchy.isDerived(tx._class, core.class.TxCollectionCUD)
  }

  private isRoleTxCUD (tx: TxCUD<Doc>): tx is TxCUD<Role> {
    return this.storage.hierarchy.isDerived(tx.objectClass, core.class.Role)
  }

  private async handlePermissionsUpdatesFromRoleTx (ctx: SessionContext, tx: TxCUD<Doc>): Promise<void> {
    if (!this.isTxCollectionCUD(tx)) {
      return
    }

    const h = this.storage.hierarchy
    const actualTx = TxProcessor.extractTx(tx)
    if (!h.isDerived(actualTx._class, core.class.TxCUD)) {
      return
    }

    const actualCudTx = actualTx as TxCUD<Doc>

    if (!this.isRoleTxCUD(actualCudTx)) {
      return
    }

    // We are only interested in updates of the existing roles because:
    // When role is created it always has empty set of permissions
    // And it's not currently possible to delete a role

    if (actualCudTx._class !== core.class.TxUpdateDoc) {
      return
    }

    const updateTx = actualCudTx as TxUpdateDoc<Role>

    if (updateTx.operations.permissions === undefined) {
      return
    }

    // Find affected spaces
    const targetSpaceTypeId = tx.objectId
    const affectedSpacesIds = Object.entries(this.typeBySpace)
      .filter(([, typeId]) => typeId === targetSpaceTypeId)
      .map(([spaceId]) => spaceId) as Ref<TypedSpace>[]

    for (const spaceId of affectedSpacesIds) {
      const spaceTypeId = this.typeBySpace[spaceId]

      if (spaceTypeId === undefined) {
        return
      }

      const assignment: RolesAssignment = this.assignmentBySpace[spaceId]
      const roles = await this.getRoles(spaceTypeId)
      const targetRole = roles.find((r) => r._id === updateTx.objectId)

      if (targetRole === undefined) {
        continue
      }

      targetRole.permissions = updateTx.operations.permissions

      this.permissionsBySpace[spaceId] = {}
      await this.setPermissions(spaceId, roles, assignment)
    }
  }

  private async handlePermissionsUpdatesFromTx (ctx: SessionContext, tx: TxCUD<Doc>): Promise<void> {
    if (this.isSpaceTxCUD(tx)) {
      if (tx._class === core.class.TxCreateDoc) {
        await this.handleCreate(tx)
        // } else if (tx._class === core.class.TxUpdateDoc) {
        // Roles assignment in spaces are managed through the space type mixin
        // so nothing to handle here
      } else if (tx._class === core.class.TxMixin) {
        await this.handleMixin(tx)
      } else if (tx._class === core.class.TxRemoveDoc) {
        this.handleRemove(tx)
      }
    }

    await this.handlePermissionsUpdatesFromRoleTx(ctx, tx)
  }

  private async processPermissionsUpdatesFromTx (ctx: SessionContext, tx: Tx): Promise<void> {
    const h = this.storage.hierarchy
    if (!h.isDerived(tx._class, core.class.TxCUD)) {
      return
    }

    const cudTx = tx as TxCUD<Doc>
    await this.handlePermissionsUpdatesFromTx(ctx, cudTx)
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<TxMiddlewareResult> {
    await this.processPermissionsUpdatesFromTx(ctx, tx)
    await this.checkPermissions(ctx, tx)
    const res = await this.provideTx(ctx, tx)
    for (const txd of ctx.derived) {
      for (const tx of txd.derived) {
        await this.processPermissionsUpdatesFromTx(ctx, tx)
      }
    }
    return res
  }

  protected async checkPermissions (ctx: SessionContext, tx: Tx): Promise<void> {
    if (tx._class === core.class.TxApplyIf) {
      const applyTx = tx as TxApplyIf

      await Promise.all(applyTx.txes.map((t) => this.checkPermissions(ctx, t)))
      return
    }

    if (tx._class === core.class.TxCollectionCUD) {
      const actualTx = TxProcessor.extractTx(tx)

      await this.checkPermissions(ctx, actualTx)
    }

    const cudTx = tx as TxCUD<Doc>
    const h = this.storage.hierarchy
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
      if (await this.checkPermission(ctx, targetSpaceId as Ref<TypedSpace>, core.permission.ForbidDeleteObject)) {
        this.throwForbidden()
      }
    }
  }
}
