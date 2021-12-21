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

// To help typescript locate view plugin properly
import type { ActionTarget } from '@anticrm/view'

import attachment from '@anticrm/model-attachment'
import type { Employee } from '@anticrm/contact'
import contact from '@anticrm/contact'
import { Arr, Class, Doc, Domain, DOMAIN_MODEL, FindOptions, Ref, Space, Timestamp } from '@anticrm/core'
import { Builder, Collection, Mixin, Model, Prop, TypeBoolean, TypeDate, TypeRef, TypeString, UX } from '@anticrm/model'
import chunter from '@anticrm/model-chunter'
import core, { TAttachedDoc, TClass, TDoc, TSpace } from '@anticrm/model-core'
import view from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import type { IntlString } from '@anticrm/platform'
import type {
  Kanban,
  KanbanCard,
  Project,
  State,
  Issue,
  Sequence,
  DoneState,
  WonState,
  LostState,
  KanbanTemplateSpace,
  StateTemplate,
  DoneStateTemplate,
  WonStateTemplate,
  LostStateTemplate,
  KanbanTemplate,
  Task,
  TodoItem
} from '@anticrm/task'
import { createProjectKanban } from '@anticrm/task'
import task from './plugin'
import { AnyComponent } from '@anticrm/ui'

export { default } from './plugin'

export const DOMAIN_TASK = 'task' as Domain
export const DOMAIN_STATE = 'state' as Domain
export const DOMAIN_KANBAN = 'kanban' as Domain
@Model(task.class.State, core.class.Doc, DOMAIN_STATE, [core.interface.DocWithRank])
@UX('State' as IntlString, undefined, undefined, 'title')
export class TState extends TDoc implements State {
  @Prop(TypeString(), 'Title' as IntlString)
  title!: string

  color!: string

  declare rank: string
}

@Model(task.class.DoneState, core.class.Doc, DOMAIN_STATE, [core.interface.DocWithRank])
@UX('Done' as IntlString, undefined, undefined, 'title')
export class TDoneState extends TDoc implements DoneState {
  @Prop(TypeString(), 'Title' as IntlString)
  title!: string

  declare rank: string
}

@Model(task.class.WonState, task.class.DoneState, DOMAIN_STATE)
export class TWonState extends TDoneState implements WonState {}

@Model(task.class.LostState, task.class.DoneState, DOMAIN_STATE)
export class TLostState extends TDoneState implements LostState {}

/**
 * @public
 *
 * No domain is specified, since pure Tasks could not exists
 */
@Model(task.class.Task, core.class.AttachedDoc, DOMAIN_TASK, [core.interface.DocWithRank])
export class TTask extends TAttachedDoc implements Task {
  @Prop(TypeRef(task.class.State), 'State' as IntlString)
  state!: Ref<State>

  @Prop(TypeRef(task.class.DoneState), 'Done' as IntlString)
  doneState!: Ref<DoneState> | null

  @Prop(TypeString(), 'No.' as IntlString)
  number!: number

  // @Prop(TypeRef(contact.class.Employee), 'Assignee' as IntlString)
  assignee!: Ref<Employee> | null

  declare rank: string

  @Prop(Collection(task.class.TodoItem), "Todo's" as IntlString)
  todoItems!: number
}

@Model(task.class.TodoItem, core.class.AttachedDoc, DOMAIN_TASK)
@UX('Todo' as IntlString)
export class TTodoItem extends TAttachedDoc implements TodoItem {
  @Prop(TypeString(), 'Name' as IntlString, task.icon.Task)
  name!: string

  @Prop(TypeBoolean(), 'Complete' as IntlString)
  done!: boolean

  @Prop(TypeDate(), 'Due date' as IntlString)
  dueTo?: Timestamp
}

@Model(task.class.SpaceWithStates, core.class.Space)
export class TSpaceWithStates extends TSpace {}

@Model(task.class.Project, task.class.SpaceWithStates)
@UX('Project' as IntlString, task.icon.Task)
export class TProject extends TSpaceWithStates implements Project {}

@Model(task.class.Issue, task.class.Task, DOMAIN_TASK)
@UX('Task' as IntlString, task.icon.Task, 'Task' as IntlString, 'number')
export class TIssue extends TTask implements Issue {
  // We need to declare, to provide property with label
  @Prop(TypeRef(core.class.Doc), 'Parent' as IntlString)
  declare attachedTo: Ref<Doc>

  @Prop(TypeString(), 'Name' as IntlString)
  name!: string

  @Prop(TypeString(), 'Description' as IntlString)
  description!: string

  @Prop(Collection(chunter.class.Comment), 'Comments' as IntlString)
  comments!: number

  @Prop(Collection(attachment.class.Attachment), 'Attachments' as IntlString)
  attachments!: number

  @Prop(TypeString(), 'Labels' as IntlString)
  labels!: string

  @Prop(TypeRef(contact.class.Employee), 'Assignee' as IntlString)
  declare assignee: Ref<Employee> | null
}

@Mixin(task.mixin.KanbanCard, core.class.Class)
export class TKanbanCard extends TClass implements KanbanCard {
  card!: AnyComponent
}

@Model(task.class.Kanban, core.class.Doc, DOMAIN_KANBAN)
export class TKanban extends TDoc implements Kanban {
  states!: Arr<Ref<State>>
  doneStates!: Arr<Ref<DoneState>>
  attachedTo!: Ref<Space>
}

@Model(task.class.KanbanTemplateSpace, core.class.Space, DOMAIN_MODEL)
export class TKanbanTemplateSpace extends TSpace implements KanbanTemplateSpace {
  icon!: AnyComponent
}

@Model(task.class.StateTemplate, core.class.AttachedDoc, DOMAIN_KANBAN, [core.interface.DocWithRank])
export class TStateTemplate extends TAttachedDoc implements StateTemplate {
  @Prop(TypeString(), 'Title' as IntlString)
  title!: string

  @Prop(TypeString(), 'Color' as IntlString)
  color!: string

  declare rank: string
}

@Model(task.class.DoneStateTemplate, core.class.AttachedDoc, DOMAIN_KANBAN, [core.interface.DocWithRank])
export class TDoneStateTemplate extends TAttachedDoc implements DoneStateTemplate {
  @Prop(TypeString(), 'Title' as IntlString)
  title!: string

  declare rank: string
}

@Model(task.class.WonStateTemplate, task.class.DoneStateTemplate, DOMAIN_KANBAN)
export class TWonStateTemplate extends TDoneStateTemplate implements WonStateTemplate {}

@Model(task.class.LostStateTemplate, task.class.DoneStateTemplate, DOMAIN_KANBAN)
export class TLostStateTemplate extends TDoneStateTemplate implements LostStateTemplate {}

@Model(task.class.KanbanTemplate, core.class.Doc, DOMAIN_KANBAN)
export class TKanbanTemplate extends TDoc implements KanbanTemplate {
  @Prop(TypeString(), 'Title' as IntlString)
  title!: string

  @Prop(Collection(task.class.StateTemplate), 'States' as IntlString)
  statesC!: number

  @Prop(Collection(task.class.DoneStateTemplate), 'Done States' as IntlString)
  doneStatesC!: number
}

@Model(task.class.Sequence, core.class.Doc, DOMAIN_KANBAN)
export class TSequence extends TDoc implements Sequence {
  attachedTo!: Ref<Class<Doc>>
  sequence!: number
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TState,
    TDoneState,
    TWonState,
    TLostState,
    TKanbanCard,
    TKanban,
    TKanbanTemplateSpace,
    TStateTemplate,
    TDoneStateTemplate,
    TWonStateTemplate,
    TLostStateTemplate,
    TKanbanTemplate,
    TSequence,
    TTask,
    TSpaceWithStates,
    TProject,
    TIssue,
    TTodoItem
  )
  builder.mixin(task.class.Project, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: task.class.Issue,
      createItemDialog: task.component.CreateTask
    }
  })

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
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
    },
    task.app.Tasks
  )

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: task.class.Issue,
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
      { presenter: attachment.component.AttachmentsPresenter, label: 'Files', sortingKey: 'attachments' },
      { presenter: chunter.component.CommentsPresenter, label: 'Comments', sortingKey: 'comments' },
      'modifiedOn'
    ]
  })

  builder.mixin(task.class.Issue, core.class.Class, view.mixin.AttributePresenter, {
    presenter: task.component.TaskPresenter
  })

  builder.mixin(task.class.Issue, core.class.Class, view.mixin.ObjectEditor, {
    editor: task.component.EditIssue
  })

  builder.createDoc(task.class.Sequence, task.space.Sequence, {
    attachedTo: task.class.Issue,
    sequence: 0
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: task.class.Issue,
    descriptor: task.viewlet.Kanban,
    open: task.component.EditTask,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        assignee: contact.class.Employee,
        state: task.class.State
        // attachedTo: core.class.Doc
      }
    } as FindOptions<Doc>, // TODO: fix
    config: [
      // '$lookup.attachedTo',
      '$lookup.state',
      '$lookup.assignee'
    ]
  })

  builder.mixin(task.class.Issue, core.class.Class, task.mixin.KanbanCard, {
    card: task.component.KanbanCard
  })

  builder.createDoc(
    task.class.Project,
    core.space.Model,
    {
      name: 'public',
      description: 'Public tasks',
      private: false,
      archived: false,
      members: []
    },
    task.space.TasksPublic
  )

  builder.createDoc(
    task.class.KanbanTemplateSpace,
    core.space.Model,
    {
      name: 'Projects',
      description: 'Manage project statuses',
      members: [],
      private: false,
      archived: false,
      icon: task.component.TemplatesIcon
    },
    task.space.ProjectTemplates
  )

  createProjectKanban(task.space.TasksPublic, async (_class, space, data, id) => {
    builder.createDoc(_class, space, data, id)
    return await Promise.resolve()
  }).catch((err) => console.error(err))

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: 'Create task' as IntlString,
      icon: task.icon.Task,
      action: task.actionImpl.CreateTask
    },
    task.action.CreateTask
  )

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: 'Edit Statuses' as IntlString,
      icon: view.icon.MoreH,
      action: task.actionImpl.EditStatuses
    },
    task.action.EditStatuses
  )

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: 'Archive' as IntlString,
      icon: view.icon.Archive,
      action: task.actionImpl.ArchiveSpace
    },
    task.action.ArchiveSpace
  )

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: 'Unarchive' as IntlString,
      icon: view.icon.Archive,
      action: task.actionImpl.UnarchiveSpace
    },
    task.action.UnarchiveSpace
  )

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: task.class.SpaceWithStates,
    action: task.action.EditStatuses,
    query: {
      archived: false
    }
  })

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: task.class.SpaceWithStates,
    action: task.action.ArchiveSpace,
    query: {
      archived: false
    }
  })

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: task.class.SpaceWithStates,
    action: task.action.UnarchiveSpace,
    query: {
      archived: true
    }
  })

  builder.mixin(task.class.State, core.class.Class, view.mixin.AttributeEditor, {
    editor: task.component.StateEditor
  })

  builder.mixin(task.class.State, core.class.Class, view.mixin.AttributePresenter, {
    presenter: task.component.StatePresenter
  })

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: 'Kanban' as IntlString,
      icon: task.icon.Kanban,
      component: task.component.KanbanView
    },
    task.viewlet.Kanban
  )

  builder.createDoc(
    core.class.Space,
    core.space.Model,
    {
      name: 'Sequences',
      description: 'Internal space to store sequence numbers',
      members: [],
      private: false,
      archived: false
    },
    task.space.Sequence
  )

  builder.mixin(task.class.DoneState, core.class.Class, view.mixin.AttributePresenter, {
    presenter: task.component.DoneStatePresenter
  })

  builder.mixin(task.class.TodoItem, core.class.Class, view.mixin.AttributeEditor, {
    editor: task.component.Todos
  })

  builder.mixin(task.class.TodoItem, core.class.Class, view.mixin.AttributePresenter, {
    presenter: task.component.TodoItemPresenter
  })

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: 'Mark as done' as IntlString,
      icon: task.icon.TodoCheck,
      action: task.actionImpl.TodoItemMarkDone
    },
    task.action.TodoItemMarkDone
  )

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: 'Mark as undone' as IntlString,
      icon: task.icon.TodoUnCheck,
      action: task.actionImpl.TodoItemMarkUnDone
    },
    task.action.TodoItemMarkUnDone
  )

  builder.createDoc<ActionTarget<TodoItem>>(view.class.ActionTarget, core.space.Model, {
    target: task.class.TodoItem,
    action: task.action.TodoItemMarkDone,
    query: {
      done: false
    }
  })
  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: task.class.TodoItem,
    action: task.action.TodoItemMarkUnDone,
    query: {
      done: true
    }
  })
}

export { taskOperation } from './migration'
