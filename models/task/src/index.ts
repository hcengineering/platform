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

import attachment from '@anticrm/model-attachment'
import type { Employee } from '@anticrm/contact'
import contact from '@anticrm/contact'
import type { Doc, DocWithState, Domain, FindOptions, Ref } from '@anticrm/core'
import { Builder, Model, Prop, TypeRef, TypeString, UX } from '@anticrm/model'
import chunter from '@anticrm/model-chunter'
import core, { TDoc, TSpaceWithStates } from '@anticrm/model-core'
import view from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import type { IntlString } from '@anticrm/platform'
import type { Project, Task } from '@anticrm/task'
import { createProjectKanban } from '@anticrm/task'
import task from './plugin'

@Model(task.class.Project, core.class.SpaceWithStates)
@UX('Project' as IntlString, task.icon.Task)
export class TProject extends TSpaceWithStates implements Project {}

@Model(task.class.Task, core.class.Doc, 'task' as Domain, [core.interface.DocWithState])
@UX('Task' as IntlString, task.icon.Task, 'TASK' as IntlString)
export class TTask extends TDoc implements Task {
  declare number: DocWithState['number']
  declare state: DocWithState['state']

  @Prop(TypeString(), 'Name' as IntlString)
  name!: string

  @Prop(TypeString(), 'Description' as IntlString)
  description!: string

  @Prop(TypeRef(contact.class.Employee), 'Assignee' as IntlString)
  assignee!: Ref<Employee> | null

  @Prop(TypeString(), 'Comments' as IntlString)
  comments!: number

  @Prop(TypeString(), 'Attachments' as IntlString)
  attachments!: number

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
      { presenter: attachment.component.AttachmentsPresenter, label: 'Files' },
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

  builder.createDoc(view.class.Sequence, view.space.Sequence, {
    attachedTo: task.class.Task,
    sequence: 0
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: task.class.Task,
    descriptor: view.viewlet.Kanban,
    open: task.component.EditTask,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        assignee: contact.class.EmployeeAccount,
        state: core.class.State
      }
    } as FindOptions<Doc>, // TODO: fix
    config: ['$lookup.attachedTo', '$lookup.state']
  })

  builder.mixin(task.class.Task, core.class.Class, view.mixin.KanbanCard, {
    card: task.component.KanbanCard
  })

  builder.createDoc(task.class.Project, core.space.Model, {
    name: 'public',
    description: 'Public tasks',
    private: false,
    members: []
  }, task.space.TasksPublic)

  createProjectKanban(task.space.TasksPublic, async (_class, space, data, id) => {
    builder.createDoc(_class, space, data, id)
    return await Promise.resolve()
  }).catch((err) => console.error(err))
}
