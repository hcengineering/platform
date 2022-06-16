//
// Copyright © 2022 Hardcore Engineering Inc.
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

import type { Employee, Organization } from '@anticrm/contact'
import { Class, Ref } from '@anticrm/core'
import { Builder, Model, UX } from '@anticrm/model'
import core, { TAttachedDoc } from '@anticrm/model-core'
import workbench from '@anticrm/model-workbench'
import type { Department } from '@anticrm/hr'
import hr from './plugin'

@Model(hr.class.Department, core.class.AttachedDoc)
@UX(hr.string.Department, hr.icon.Department)
export class TDepartment extends TAttachedDoc implements Department {
  attachedTo!: Ref<Department | Organization>
  attachedToClass!: Ref<Class<Department | Organization>>
  members!: number
  name!: string
  avatar?: string | null
  departments?: number
  head!: Ref<Employee> | null
}

export function createModel (builder: Builder): void {
  builder.createModel(TDepartment)

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: hr.string.HRApplication,
      icon: hr.icon.HR,
      hidden: false,
      navigatorModel: {
        specials: [
          {
            id: 'structure',
            component: hr.component.Structure,
            icon: hr.icon.Structure,
            label: hr.string.Structure,
            position: 'top',
          },
        ],
        spaces: []
      },
    },
    hr.app.HR
  )
}

export { default } from './plugin'
