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

import type { Employee } from '@anticrm/contact'
import contact from '@anticrm/contact'
import type { Doc, Domain, FindOptions, Ref } from '@anticrm/core'
import { Builder, Model, Prop, TypeString, UX } from '@anticrm/model'
import chunter from '@anticrm/model-chunter'
import core, { TDoc, TSpace } from '@anticrm/model-core'
import view from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import type { IntlString } from '@anticrm/platform'
import type { Project, Task } from '@anticrm/task'
import task from './plugin'

@Model(task.class.Project, core.class.Space)
@UX('Project' as IntlString, task.icon.Task)
export class TProject extends TSpace implements Project {}

@Model(task.class.Task, core.class.Doc, 'task' as Domain)
@UX('Task' as IntlString, task.icon.Task, 'TASK' as IntlString)
export class TTask extends TDoc implements Task {
  @Prop(TypeString(), 'No.' as IntlString)
  number!: number

  @Prop(TypeString(), 'Name' as IntlString)
  name!: string

  @Prop(TypeString(), 'Description' as IntlString)
  description!: string

  @Prop(TypeString(), 'Assignee' as IntlString)
  assignee!: Ref<Employee>

  @Prop(TypeString(), 'Comments' as IntlString)
  comments!: number

  @Prop(TypeString(), 'Labels' as IntlString)
  labels!: string
}

export function createModel (builder: Builder): void {
  builder.createModel(TProject, TTask)
  builder.mixin(task.class.Project, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: task.class.Task,
      createItemDialog: task.component.CreateTask
    }
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
  }, task.app.Tasks)

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: task.class.Task,
    descriptor: view.viewlet.Table,
    open: task.component.EditTask,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        assignee: contact.class.Employee
      }
    } as FindOptions<Doc>,
    config: [
      '',
      'name',
      '$lookup.assignee',
      { presenter: chunter.component.AttachmentsPresenter, label: 'Files' },
      { presenter: chunter.component.CommentsPresenter, label: 'Comments' },
      'modifiedOn'
    ]
  })

  builder.mixin(task.class.Task, core.class.Class, view.mixin.AttributePresenter, {
    presenter: task.component.TaskPresenter
  })

  builder.mixin(task.class.Task, core.class.Class, view.mixin.ObjectEditor, {
    editor: task.component.EditTask
  })

  builder.createDoc(task.class.Project, core.space.Model, {
    name: 'public',
    description: 'Public tasks',
    private: false,
    members: []
  }, task.space.TasksPublic)

  builder.createDoc(view.class.Sequence, view.space.Sequence, {
    attachedTo: task.class.Task,
    sequence: 0
  })
}
