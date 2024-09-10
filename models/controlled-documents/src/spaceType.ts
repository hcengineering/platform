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
import { Prop, type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import setting, { getRoleAttributeProps } from '@hcengineering/setting'
import { type Permission, type Ref } from '@hcengineering/core'

import { TDocumentSpaceTypeData } from './types'
import documents from './plugin'
import { roles } from './roles'

export const documentPermissions: Ref<Permission>[] = [
  documents.permission.CreateDocument,
  documents.permission.ReviewDocument,
  documents.permission.ApproveDocument,
  documents.permission.CoAuthorDocument,
  documents.permission.ArchiveDocument,
  documents.permission.UpdateDocumentOwner,
  documents.permission.CreateDocumentCategory,
  documents.permission.UpdateDocumentCategory,
  documents.permission.DeleteDocumentCategory,
  core.permission.UpdateSpace
]

export function defineSpaceType (builder: Builder): void {
  for (const role of roles) {
    const { label, roleType } = getRoleAttributeProps(role.name)

    Prop(roleType, label)(TDocumentSpaceTypeData.prototype, role._id)
  }

  builder.createModel(TDocumentSpaceTypeData)

  builder.createDoc(
    documents.class.DocumentSpaceTypeDescriptor,
    core.space.Model,
    {
      name: documents.string.DocumentApplication,
      description: documents.string.Description,
      icon: documents.icon.Document,
      baseClass: documents.class.DocumentSpace,
      availablePermissions: [...documentPermissions]
    },
    documents.descriptor.DocumentSpaceType
  )

  builder.mixin(documents.class.DocumentSpaceTypeDescriptor, core.class.Class, setting.mixin.SpaceTypeCreator, {
    extraComponent: documents.component.CreateDocumentSpaceType
  })

  builder.createDoc(
    documents.class.DocumentSpaceType,
    core.space.Model,
    {
      name: 'Default Documents',
      descriptor: documents.descriptor.DocumentSpaceType,
      roles: roles.length,
      projects: false,
      targetClass: documents.mixin.DocumentSpaceTypeData
    },
    documents.spaceType.DocumentSpaceType
  )

  for (const role of roles) {
    builder.createDoc(
      core.class.Role,
      core.space.Model,
      {
        attachedTo: documents.spaceType.DocumentSpaceType,
        attachedToClass: documents.class.DocumentSpaceType,
        collection: 'roles',
        name: role.name,
        permissions: role.permissions
      },
      role._id
    )
  }
}
