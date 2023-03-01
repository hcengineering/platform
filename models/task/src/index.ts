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

import type { Employee } from '@hcengineering/contact'
import contact from '@hcengineering/contact'
import { Arr, Class, Doc, Domain, FindOptions, IndexKind, Ref, Space, Timestamp } from '@hcengineering/core'
import {
  Builder,
  Collection,
  Hidden,
  Implements,
  Index,
  Mixin,
  Model,
  Prop,
  TypeBoolean,
  TypeDate,
  TypeMarkup,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import chunter from '@hcengineering/model-chunter'
import core, { TAttachedDoc, TClass, TDoc, TSpace } from '@hcengineering/model-core'
import view, { actionTemplates as viewTemplates, createAction, template } from '@hcengineering/model-view'
import notification from '@hcengineering/notification'
import { IntlString } from '@hcengineering/platform'
import tags from '@hcengineering/tags'
import {
  DOMAIN_STATE,
  DoneState,
  DoneStateTemplate,
  Issue,
  Kanban,
  KanbanCard,
  KanbanTemplate,
  KanbanTemplateSpace,
  LostState,
  LostStateTemplate,
  Project,
  Sequence,
  State,
  StateTemplate,
  Task,
  TodoItem,
  WonState,
  WonStateTemplate
} from '@hcengineering/task'
import { AnyComponent } from '@hcengineering/ui'
import { ViewAction } from '@hcengineering/view'
import task from './plugin'

export { createKanbanTemplate, createSequence, taskOperation } from './migration'
export { default } from './plugin'

export const DOMAIN_TASK = 'task' as Domain
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
@UX(task.string.Task, task.icon.Task, task.string.Task)
export class TTask extends TAttachedDoc implements Task {
  @Prop(TypeRef(task.class.State), task.string.TaskState)
    state!: Ref<State>

  @Prop(TypeRef(task.class.DoneState), task.string.TaskStateDone)
    doneState!: Ref<DoneState> | null

  @Prop(TypeString(), task.string.TaskNumber)
  @Index(IndexKind.FullText)
  @Hidden()
    number!: number

  // @Prop(TypeRef(contact.class.Employee), task.string.TaskAssignee)
  assignee!: Ref<Employee> | null

  @Prop(TypeDate(), task.string.DueDate)
    dueDate!: Timestamp | null

  @Prop(TypeDate(), task.string.StartDate)
    startDate!: Timestamp | null

  declare rank: string

  // @Prop(Collection(task.class.TodoItem), task.string.Todos)
  //   todoItems!: number

  @Prop(Collection(tags.class.TagReference, task.string.TaskLabels), task.string.TaskLabels)
    labels!: number
}

@Model(task.class.TodoItem, core.class.AttachedDoc, DOMAIN_TASK, [task.interface.DocWithRank])
@UX(task.string.Todo)
export class TTodoItem extends TAttachedDoc implements TodoItem {
  @Prop(TypeMarkup(), task.string.TodoName, task.icon.Task)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeRef(contact.class.Employee), task.string.TaskAssignee)
    assignee!: Ref<Employee> | null

  @Prop(TypeBoolean(), task.string.TaskDone)
    done!: boolean

  @Prop(TypeDate(), task.string.TaskDueTo)
    dueTo!: Timestamp | null

  @Prop(Collection(task.class.TodoItem), task.string.Todos)
    items!: number

  declare rank: string
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

  @Prop(TypeMarkup(), task.string.Description)
  @Index(IndexKind.FullText)
    description!: string

  @Prop(Collection(chunter.class.Comment), task.string.TaskComments)
    comments!: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments!: number

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

@Model(task.class.KanbanTemplateSpace, core.class.Space)
export class TKanbanTemplateSpace extends TSpace implements KanbanTemplateSpace {
  name!: IntlString
  description!: IntlString
  icon!: AnyComponent
  editor!: AnyComponent
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

  @Prop(TypeString(), task.string.Description)
    description!: string

  @Prop(TypeString(), task.string.ShortDescription)
    shortDescription!: string

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

/**
 * @public
 */
export const actionTemplates = template({
  editStatus: {
    label: task.string.EditStates,
    icon: view.icon.Statuses,
    action: task.actionImpl.EditStatuses,
    input: 'focus',
    category: task.category.Task
  },
  archiveSpace: {
    label: task.string.Archive,
    icon: view.icon.Archive,
    action: view.actionImpl.UpdateDocument as ViewAction,
    actionProps: {
      key: 'archived',
      value: true,
      ask: true,
      label: task.string.Archive,
      message: task.string.ArchiveConfirm
    },
    input: 'any',
    category: task.category.Task,
    query: {
      archived: false
    },
    context: {
      mode: ['context', 'browser'],
      group: 'tools'
    }
  },
  unarchiveSpace: {
    label: task.string.Unarchive,
    icon: view.icon.Archive,
    action: view.actionImpl.UpdateDocument as ViewAction,
    actionProps: {
      key: 'archived',
      ask: true,
      value: false,
      label: task.string.Unarchive,
      message: task.string.UnarchiveConfirm
    },
    input: 'any',
    category: task.category.Task,
    query: {
      archived: true
    },
    context: {
      mode: ['context', 'browser'],
      group: 'tools'
    }
  }
})

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

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: task.string.States,
      icon: task.icon.ManageTemplates,
      component: task.component.StatusTableView
    },
    task.viewlet.StatusTable
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: task.class.Issue,
      descriptor: task.viewlet.StatusTable,
      config: ['', 'name', 'assignee', 'state', 'doneState', 'attachments', 'comments', 'modifiedOn']
    },
    task.viewlet.TableIssue
  )

  builder.mixin(task.class.Task, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: view.component.ObjectPresenter
  })

  builder.mixin(task.class.Issue, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: task.component.TaskPresenter
  })

  builder.mixin(task.class.KanbanTemplate, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: task.component.KanbanTemplatePresenter
  })

  builder.mixin(task.class.Issue, core.class.Class, view.mixin.ObjectEditor, {
    editor: task.component.EditIssue
  })

  builder.mixin(task.class.Task, core.class.Class, view.mixin.ObjectEditorHeader, {
    editor: task.component.TaskHeader
  })

  builder.mixin(task.class.Task, core.class.Class, notification.mixin.LastViewAttached, {})
  builder.mixin(task.class.Task, core.class.Class, notification.mixin.AnotherUserNotifications, {
    fields: ['assignee']
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: task.class.Issue,
    descriptor: task.viewlet.Kanban,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        assignee: contact.class.Employee,
        _id: {
          todoItems: task.class.TodoItem
        }
      }
    } as FindOptions<Doc>,
    config: []
  })

  builder.mixin(task.class.Issue, core.class.Class, task.mixin.KanbanCard, {
    card: task.component.KanbanCard
  })

  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    { label: task.string.Task, visible: true },
    task.category.Task
  )

  createAction(
    builder,
    {
      ...actionTemplates.editStatus,
      target: task.class.SpaceWithStates,
      query: {
        archived: false
      },
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      }
    },
    task.action.EditStatuses
  )

  builder.mixin(task.class.State, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: task.component.StateEditor
  })

  builder.mixin(task.class.State, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: task.component.StatePresenter
  })

  builder.mixin(task.class.State, core.class.Class, view.mixin.AttributePresenter, {
    presenter: task.component.StateRefPresenter
  })

  builder.mixin(task.class.State, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete]
  })

  builder.mixin(task.class.DoneState, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: task.component.DoneStateEditor
  })

  builder.mixin(task.class.DoneState, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: task.component.DoneStatePresenter
  })

  builder.mixin(task.class.DoneState, core.class.Class, view.mixin.AttributePresenter, {
    presenter: task.component.DoneStateRefPresenter
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

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: task.string.Dashboard,
      icon: task.icon.Dashboard,
      component: task.component.Dashboard
    },
    task.viewlet.Dashboard
  )

  builder.mixin(task.class.TodoItem, core.class.Class, view.mixin.CollectionEditor, {
    editor: task.component.Todos
  })

  builder.mixin(task.class.TodoItem, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: task.component.TodoItemPresenter
  })

  createAction(builder, {
    label: task.string.MarkAsDone,
    icon: task.icon.TodoCheck,
    action: view.actionImpl.UpdateDocument,
    actionProps: {
      key: 'done',
      value: true
    },
    input: 'focus',
    category: task.category.Task,
    query: {
      done: false
    },
    target: task.class.TodoItem,
    context: {
      mode: ['context', 'browser'],
      group: 'edit'
    }
  })

  createAction(builder, {
    label: task.string.MarkAsUndone,
    icon: task.icon.TodoUnCheck,
    action: view.actionImpl.UpdateDocument,
    actionProps: {
      key: 'done',
      value: false
    },
    input: 'focus',
    category: task.category.Task,
    query: {
      done: true
    },
    context: {
      mode: ['context', 'browser'],
      group: 'edit'
    },
    target: task.class.TodoItem
  })

  createAction(
    builder,
    {
      ...viewTemplates.move,
      target: task.class.Task,
      context: {
        mode: ['context', 'browser'],
        group: 'tools'
      }
    },
    task.action.Move
  )

  createAction(
    builder,
    {
      action: view.actionImpl.UpdateDocument,
      actionProps: {
        key: 'isArchived',
        value: true,
        ask: true,
        label: task.string.Archive,
        message: task.string.ArchiveConfirm
      },
      query: {
        isArchived: { $nin: [true] }
      },
      label: task.string.Archive,
      icon: view.icon.Archive,
      input: 'any',
      category: task.category.Task,
      target: task.class.State,
      context: {
        mode: ['context', 'browser'],
        group: 'tools'
      }
    },
    task.action.ArchiveState
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: task.string.Assigned,
      textTemplate: '{doc} was assigned to you by {sender}',
      htmlTemplate: '<p>{doc} was assigned to you by {sender}</p>',
      subjectTemplate: '{doc} was assigned to you'
    },
    task.ids.AssigneedNotification
  )
}
