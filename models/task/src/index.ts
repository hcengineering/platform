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
import { Arr, Class, Doc, Domain, DOMAIN_MODEL, FindOptions, IndexKind, Ref, Space, Timestamp } from '@anticrm/core'
import {
  Builder,
  Collection, Hidden, Implements,
  Index,
  Mixin,
  Model,
  Prop, TypeBoolean,
  TypeDate,
  TypeMarkup,
  TypeRef,
  TypeString,
  UX
} from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import chunter from '@anticrm/model-chunter'
import core, { TAttachedDoc, TClass, TDoc, TSpace } from '@anticrm/model-core'
import presentation from '@anticrm/model-presentation'
import view from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import { IntlString } from '@anticrm/platform'
import type {
  DoneState, DoneStateTemplate, Issue, Kanban,
  KanbanCard, KanbanTemplate, KanbanTemplateSpace, LostState, LostStateTemplate, Project, Sequence, State, StateTemplate, Task,
  TodoItem, WonState, WonStateTemplate
} from '@anticrm/task'
import { AnyComponent } from '@anticrm/ui'
import type { ActionTarget } from '@anticrm/view'
import task from './plugin'

export { createDeps, createKanbanTemplate } from './creation'
export { taskOperation } from './migration'
export { default } from './plugin'

export const DOMAIN_TASK = 'task' as Domain
export const DOMAIN_STATE = 'state' as Domain
export const DOMAIN_KANBAN = 'kanban' as Domain
@Model(task.class.State, core.class.Doc, DOMAIN_STATE, [task.interface.DocWithRank])
@UX(task.string.TaskState, task.icon.TaskState, undefined, 'rank')
export class TState extends TDoc implements State {
  @Prop(TypeString(), task.string.TaskStateTitle)
  title!: string

  color!: number

  declare rank: string
}

@Model(task.class.DoneState, core.class.Doc, DOMAIN_STATE, [task.interface.DocWithRank])
@UX(task.string.TaskStateDone, task.icon.TaskState, undefined, 'title')
export class TDoneState extends TDoc implements DoneState {
  @Prop(TypeString(), task.string.TaskStateTitle)
  title!: string

  declare rank: string
}

@Model(task.class.WonState, task.class.DoneState)
export class TWonState extends TDoneState implements WonState {}

@Model(task.class.LostState, task.class.DoneState)
export class TLostState extends TDoneState implements LostState {}

/**
 * @public
 *
 * No domain is specified, since pure Tasks could not exists
 */
@Model(task.class.Task, core.class.AttachedDoc, DOMAIN_TASK, [task.interface.DocWithRank])
export class TTask extends TAttachedDoc implements Task {
  @Prop(TypeRef(task.class.State), task.string.TaskState)
  state!: Ref<State>

  @Prop(TypeRef(task.class.DoneState), task.string.TaskStateDone)
  doneState!: Ref<DoneState> | null

  @Prop(TypeString(), task.string.TaskNumber)
  number!: number

  // @Prop(TypeRef(contact.class.Employee), task.string.TaskAssignee)
  assignee!: Ref<Employee> | null

  declare rank: string

  @Prop(Collection(task.class.TodoItem), task.string.Todos)
  todoItems!: number
}

@Model(task.class.TodoItem, core.class.AttachedDoc, DOMAIN_TASK)
@UX(task.string.Todo)
export class TTodoItem extends TAttachedDoc implements TodoItem {
  @Prop(TypeString(), task.string.TodoName, task.icon.Task)
  @Index(IndexKind.FullText)
  name!: string

  @Prop(TypeBoolean(), task.string.TaskDone)
  done!: boolean

  @Prop(TypeDate(), task.string.TaskDueTo)
  dueTo?: Timestamp
}

@Model(task.class.SpaceWithStates, core.class.Space)
export class TSpaceWithStates extends TSpace {}

@Model(task.class.Project, task.class.SpaceWithStates)
@UX(task.string.ProjectName, task.icon.Task)
export class TProject extends TSpaceWithStates implements Project {}

@Model(task.class.Issue, task.class.Task, DOMAIN_TASK)
@UX(task.string.Task, task.icon.Task, task.string.Task, 'number')
export class TIssue extends TTask implements Issue {
  // We need to declare, to provide property with label
  @Prop(TypeRef(core.class.Doc), task.string.TaskParent)
  declare attachedTo: Ref<Doc>

  @Prop(TypeString(), task.string.IssueName)
  @Index(IndexKind.FullText)
  name!: string

  @Prop(TypeMarkup(), task.string.TaskDescription)
  @Index(IndexKind.FullText)
  description!: string

  @Prop(Collection(chunter.class.Comment), task.string.TaskComments)
  comments!: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments)
  attachments!: number

  @Prop(TypeString(), task.string.TaskLabels)
  @Index(IndexKind.FullText)
  labels!: string

  @Prop(TypeRef(contact.class.Employee), task.string.TaskAssignee)
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

@Model(task.class.KanbanTemplateSpace, core.class.Doc, DOMAIN_MODEL)
export class TKanbanTemplateSpace extends TDoc implements KanbanTemplateSpace {
  name!: IntlString
  description!: IntlString
  icon!: AnyComponent
}

@Model(task.class.StateTemplate, core.class.AttachedDoc, DOMAIN_KANBAN, [task.interface.DocWithRank])
export class TStateTemplate extends TAttachedDoc implements StateTemplate {
  @Prop(TypeString(), task.string.StateTemplateTitle)
  title!: string

  @Prop(TypeString(), task.string.StateTemplateColor)
  color!: number

  declare rank: string
}

@Model(task.class.DoneStateTemplate, core.class.AttachedDoc, DOMAIN_KANBAN, [task.interface.DocWithRank])
export class TDoneStateTemplate extends TAttachedDoc implements DoneStateTemplate {
  @Prop(TypeString(), task.string.StateTemplateTitle)
  title!: string

  declare rank: string
}

@Model(task.class.WonStateTemplate, task.class.DoneStateTemplate)
export class TWonStateTemplate extends TDoneStateTemplate implements WonStateTemplate {}

@Model(task.class.LostStateTemplate, task.class.DoneStateTemplate)
export class TLostStateTemplate extends TDoneStateTemplate implements LostStateTemplate {}

@Model(task.class.KanbanTemplate, core.class.Doc, DOMAIN_KANBAN)
export class TKanbanTemplate extends TDoc implements KanbanTemplate {
  @Prop(TypeString(), task.string.KanbanTemplateTitle)
  @Index(IndexKind.FullText)
  title!: string

  @Prop(Collection(task.class.StateTemplate), task.string.States)
  statesC!: number

  @Prop(Collection(task.class.DoneStateTemplate), task.string.DoneStates)
  doneStatesC!: number
}

@Model(task.class.Sequence, core.class.Doc, DOMAIN_KANBAN)
export class TSequence extends TDoc implements Sequence {
  attachedTo!: Ref<Class<Doc>>
  sequence!: number
}

@Implements(task.interface.DocWithRank)
export class TDocWithRank extends TDoc {
  @Prop(TypeString(), task.string.Rank)
  @Hidden()
  rank!: string
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TDocWithRank,
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
      createItemDialog: task.component.CreateTask,
      createItemLabel: task.string.TaskCreateLabel
    }
  })

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: task.string.States,
      icon: task.icon.ManageStatuses,
      component: task.component.StatusTableView
    },
    task.viewlet.StatusTable
  )

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
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: { assignee: contact.class.Employee }
    } as FindOptions<Doc>,
    config: [
      '',
      'name',
      '$lookup.assignee',
      { presenter: attachment.component.AttachmentsPresenter, label: attachment.string.Files, sortingKey: 'attachments' },
      { presenter: chunter.component.CommentsPresenter, label: chunter.string.Comments, sortingKey: 'comments' },
      'modifiedOn'
    ]
  })

  builder.mixin(task.class.Issue, core.class.Class, view.mixin.AttributePresenter, {
    presenter: task.component.TaskPresenter
  })

  builder.mixin(task.class.Issue, core.class.Class, view.mixin.ObjectEditor, {
    editor: task.component.EditIssue
  })

  builder.mixin(task.class.Task, core.class.Class, view.mixin.ObjectEditorHeader, {
    editor: task.component.TaskHeader
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: task.class.Issue,
    descriptor: task.viewlet.Kanban,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        assignee: contact.class.Employee
      }
    } as FindOptions<Doc>, // TODO: fix
    config: []
  })

  builder.mixin(task.class.Issue, core.class.Class, task.mixin.KanbanCard, {
    card: task.component.KanbanCard
  })

  builder.createDoc(
    task.class.KanbanTemplateSpace,
    core.space.Model,
    {
      name: task.string.Projects,
      description: task.string.ManageProjectStatues,
      icon: task.component.TemplatesIcon
    },
    task.space.ProjectTemplates
  )

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: task.string.CreateTask,
      icon: task.icon.Task,
      action: task.actionImpl.CreateTask
    },
    task.action.CreateTask
  )

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: task.string.EditStates,
      icon: view.icon.Statuses,
      action: task.actionImpl.EditStatuses
    },
    task.action.EditStatuses
  )

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: task.string.Archive,
      icon: view.icon.Archive,
      action: task.actionImpl.ArchiveSpace
    },
    task.action.ArchiveSpace
  )

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: task.string.Unarchive,
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

  builder.mixin(task.class.State, core.class.Class, view.mixin.AttributeEditor, {
    editor: task.component.StateEditor
  })

  builder.mixin(task.class.State, core.class.Class, view.mixin.AttributePresenter, {
    presenter: task.component.StatePresenter
  })

  builder.mixin(task.class.DoneState, core.class.Class, view.mixin.AttributeEditor, {
    editor: task.component.DoneStateEditor
  })

  builder.mixin(task.class.DoneState, core.class.Class, view.mixin.AttributePresenter, {
    presenter: task.component.DoneStatePresenter
  })

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: task.string.Kanban,
      icon: task.icon.Kanban,
      component: task.component.KanbanView
    },
    task.viewlet.Kanban
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
      label: task.string.MarkAsDone,
      icon: task.icon.TodoCheck,
      action: task.actionImpl.TodoItemMarkDone
    },
    task.action.TodoItemMarkDone
  )

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: task.string.MarkAsUndone,
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

  builder.createDoc(presentation.class.ObjectSearchCategory, core.space.Model, {
    icon: task.icon.Task,
    label: task.string.SearchTask,
    query: task.completion.IssueQuery
  }, task.completion.IssueCategory)

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: task.class.Task,
    action: view.action.Move
  })
}
