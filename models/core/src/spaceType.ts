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

import { ArrOf, Prop, TypeString, type Builder } from '@hcengineering/model'
import { type Asset } from '@hcengineering/platform'
import { getRoleAttributeLabel } from '@hcengineering/core'

import { TSpacesTypeData } from './security'
import core from './component'

const roles = [
  {
    _id: core.role.Admin,
    name: 'Admin',
    permissions: [core.permission.UpdateObject, core.permission.DeleteObject]
  }
]

export function defineSpaceType (builder: Builder): void {
  for (const role of roles) {
    const label = getRoleAttributeLabel(role.name)
    const roleAssgtType = ArrOf(TypeString())

    Prop(roleAssgtType, label)(TSpacesTypeData.prototype, role._id)
  }

  builder.createModel(TSpacesTypeData)

  builder.createDoc(
    core.class.SpaceTypeDescriptor,
    core.space.Model,
    {
      name: core.string.Spaces,
      description: core.string.SpacesDescription,
      icon: '' as Asset, // FIXME
      baseClass: core.class.Space,
      availablePermissions: [core.permission.UpdateObject, core.permission.DeleteObject],
      system: true
    },
    core.descriptor.SpacesType
  )

  builder.createDoc(
    core.class.SpaceType,
    core.space.Model,
    {
      name: "All spaces' space type",
      descriptor: core.descriptor.SpacesType,
      roles: roles.length,
      targetClass: core.mixin.SpacesTypeData
    },
    core.spaceType.SpacesType
  )

  for (const role of roles) {
    builder.createDoc(
      core.class.Role,
      core.space.Model,
      {
        attachedTo: core.spaceType.SpacesType,
        attachedToClass: core.class.SpaceType,
        collection: 'roles',
        name: role.name,
        permissions: role.permissions
      },
      role._id
    )
  }
}
