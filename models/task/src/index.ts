//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import type { IntlString } from '@anticrm/platform'
import { Builder, Model, TypeString, UX, Prop } from '@anticrm/model'
import type { Ref, Doc, FindOptions } from '@anticrm/core'
import core, { TSpace, TDoc } from '@anticrm/model-core'
import type { Project, Task } from '@anticrm/task'
import type { Employee } from '@anticrm/contact'
import type { AnyComponent } from '@anticrm/ui'

import workbench from '@anticrm/model-workbench'

import view from '@anticrm/model-view'
import contact from '@anticrm/model-contact'
import task from './plugin'

@Model(task.class.Project, core.class.Space)
@UX('Project' as IntlString, task.icon.Task)
export class TProject extends TSpace implements Project {}

@Model(task.class.Task, core.class.Doc)
export class TTask extends TDoc implements Task {
  @Prop(TypeString(), 'Title' as IntlString)
  title!: string

  @Prop(TypeString(), 'Description' as IntlString)
  description!: string

  @Prop(TypeString(), 'Assignee' as IntlString)
  assignee!: Ref<Employee>
}

export function createModel (builder: Builder): void {
  builder.createModel(TProject, TTask)
  builder.mixin(task.class.Project, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: task.class.Task,
      createItemDialog: task.component.CreateTask
    }
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: task.class.Task,
    descriptor: view.viewlet.Table,
    open: 'ZX' as AnyComponent,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        assignee: contact.class.Employee
      }
    } as FindOptions<Doc>,
    config: ['title', '$lookup.assignee']
  })

  builder.createDoc(workbench.class.Application, core.space.Model, {
    label: task.string.ApplicationLabelTask,
    icon: task.icon.Task,
    hidden: false,
    navigatorModel: {
      spaces: [
        {
          label: task.string.Projects,
          spaceClass: task.class.Project,
          addSpaceLabel: task.string.CreateProject,
          createComponent: task.component.CreateProject
        }
      ]
    }
  })
  builder.createDoc(task.class.Project, core.space.Model, {
    name: 'demo',
    description: 'Demo Project',
    private: false,
    members: []
  })
}
