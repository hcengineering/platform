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
  AttachedData,
  Class,
  ClassifierKind,
  Data,
  Ref,
  Role,
  Space,
  SpaceType,
  TxOperations,
  TypeAny as TypeAnyType,
  getRoleAttributeLabel
} from '@hcengineering/core'
import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'

import setting from './index'

export async function createSpaceType<T extends SpaceType> (
  client: TxOperations,
  data: Omit<Data<T>, 'targetClass'>,
  _id: Ref<T>,
  _class: Ref<Class<T>> = core.class.SpaceType
): Promise<Ref<T>> {
  const descriptorObj = client.getModel().findObject(data.descriptor)
  if (descriptorObj === undefined) {
    throw new Error('Descriptor is not found in the model')
  }

  const baseClassClazz = client.getHierarchy().getClass(descriptorObj.baseClass)
  // NOTE: it is important for this id to be consistent when re-creating the same
  // space type with the same id as it will happen during every migration if type is created by the system
  const spaceTypeMixinId = `${_id}:type:mixin` as Ref<Class<Space>>
  await client.createDoc(
    core.class.Mixin,
    core.space.Model,
    {
      extends: descriptorObj.baseClass,
      kind: ClassifierKind.MIXIN,
      label: getEmbeddedLabel(data.name),
      icon: baseClassClazz.icon
    },
    spaceTypeMixinId
  )

  return await client.createDoc(
    _class,
    core.space.Model,
    { ...data, targetClass: spaceTypeMixinId } as unknown as Data<T>,
    _id
  )
}

export interface RoleAttributeProps {
  label: IntlString
  roleType: TypeAnyType
}

/**
 * @public
 */
function TypeAny<AnyComponent = any> (
  presenter: AnyComponent,
  label: IntlString,
  editor?: AnyComponent
): TypeAnyType<AnyComponent> {
  return { _class: core.class.TypeAny, label, presenter, editor }
}
export function getRoleAttributeProps (name: string): RoleAttributeProps {
  const label = getRoleAttributeLabel(name)
  const roleType = TypeAny(setting.component.RoleAssignmentEditor, label, setting.component.RoleAssignmentEditor)

  return { label, roleType }
}

export async function createSpaceTypeRole (
  client: TxOperations,
  type: Pick<SpaceType, '_id' | '_class' | 'targetClass'>,
  data: AttachedData<Role>,
  _id?: Ref<Role> | undefined
): Promise<Ref<Role>> {
  const roleId = await client.addCollection(
    core.class.Role,
    core.space.Model,
    type._id,
    type._class,
    'roles',
    data,
    _id
  )

  const { label, roleType } = getRoleAttributeProps(data.name)

  await client.createDoc(core.class.Attribute, core.space.Model, {
    name: roleId,
    attributeOf: type.targetClass,
    type: roleType,
    label
  })

  return roleId
}

export async function createSpaceTypeRoles (
  tx: TxOperations,
  typeId: Ref<SpaceType>,
  roles: Pick<Role, '_id' | 'name' | 'permissions'>[]
): Promise<void> {
  const spaceType = await tx.findOne(core.class.SpaceType, { _id: typeId })
  if (spaceType === undefined) return

  for (const { _id, name, permissions } of roles) {
    await createSpaceTypeRole(tx, spaceType, { name, permissions }, _id)
  }
}

export async function deleteSpaceTypeRole (
  client: TxOperations,
  role: Role,
  targetClass: Ref<Class<Space>>
): Promise<void> {
  const attribute = await client.findOne(core.class.Attribute, { name: role._id, attributeOf: targetClass })
  const ops = client.apply()

  await ops.removeCollection(
    core.class.Role,
    core.space.Model,
    role._id,
    role.attachedTo,
    role.attachedToClass,
    'roles'
  )
  if (attribute !== undefined) {
    const mixins = await client.findAll(targetClass, {})
    for (const mixin of mixins) {
      await ops.updateMixin(mixin._id, mixin._class, mixin.space, targetClass, {
        [attribute.name]: undefined
      })
    }

    await ops.remove(attribute)
  }

  // remove all the assignments
  await ops.commit()
}
