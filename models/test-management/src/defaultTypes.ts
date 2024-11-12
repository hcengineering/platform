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
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'

import { TDefaultProjectTypeData } from './types'
import testManagement from './plugin'

export function defineDefaultSpace (builder: Builder): void {
  defineDefaultProject(builder)
}

function defineDefaultProject (builder: Builder): void {
  builder.createModel(TDefaultProjectTypeData)

  builder.createDoc(
    core.class.SpaceTypeDescriptor,
    core.space.Model,
    {
      name: testManagement.string.TestProject,
      description: testManagement.string.FullDescription,
      icon: testManagement.icon.TestProject,
      baseClass: testManagement.class.TestProject,
      availablePermissions: [
        core.permission.UpdateSpace,
        core.permission.ArchiveSpace,
        core.permission.ForbidDeleteObject
      ]
    },
    testManagement.descriptors.ProjectType
  )

  builder.createDoc(
    core.class.SpaceType,
    core.space.Model,
    {
      name: 'Default project type',
      descriptor: testManagement.descriptors.ProjectType,
      roles: 0,
      targetClass: testManagement.mixin.DefaultProjectTypeData
    }
  )
}
