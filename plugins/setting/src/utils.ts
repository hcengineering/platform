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
  Attribute,
  Class,
  ClassifierKind,
  Data,
  PropertyType,
  Ref,
  Role,
  Space,
  SpaceType,
  TxOperations,
  TypeAny as TypeAnyType,
  getRoleAttributeBaseProps
} from '@hcengineering/core'
import { TypeAny } from '@hcengineering/model'
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
  id: Ref<Attribute<PropertyType>>
}

export function getRoleAttributeProps (data: AttachedData<Role>, roleId: Ref<Role>): RoleAttributeProps {
  const baseProps = getRoleAttributeBaseProps(data, roleId)
  const roleType = TypeAny(
    setting.component.RoleAssignmentEditor,
    baseProps.label,
    setting.component.RoleAssignmentEditor
  )

  return { ...baseProps, roleType }
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

  const { label, roleType, id } = getRoleAttributeProps(data, roleId)

  await client.createDoc(
    core.class.Attribute,
    core.space.Model,
    {
      name: roleId,
      attributeOf: type.targetClass,
      type: roleType,
      label
    },
    id
  )

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
