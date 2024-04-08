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

import core from './component'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: core.string.CreateObject
    },
    core.permission.CreateObject
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: core.string.UpdateObject
    },
    core.permission.UpdateObject
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: core.string.DeleteObject,
      description: core.string.DeleteObjectDescription
    },
    core.permission.DeleteObject
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: core.string.ForbidDeleteObject,
      description: core.string.ForbidDeleteObjectDescription
    },
    core.permission.ForbidDeleteObject
  )
}
