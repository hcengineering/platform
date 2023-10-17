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

import type { Employee, Person } from '@hcengineering/contact'
import contact from '@hcengineering/contact'
import { Arr, Attribute, Class, Doc, Domain, IndexKind, Ref, Status, Timestamp } from '@hcengineering/core'
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
import core, { TAttachedDoc, TClass, TDoc, TSpace, TStatus } from '@hcengineering/model-core'
import view, { createAction, template, actionTemplates as viewTemplates } from '@hcengineering/model-view'
import {} from '@hcengineering/notification'
import { IntlString } from '@hcengineering/platform'
import tags from '@hcengineering/tags'
import {
  DoneState,
  DoneStateTemplate,
  KanbanCard,
  KanbanTemplate,
  KanbanTemplateSpace,
  LostState,
  LostStateTemplate,
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

export { taskId } from '@hcengineering/task'
export { createKanbanTemplate, createSequence, taskOperation } from './migration'
export { default } from './plugin'

export const DOMAIN_TASK = 'task' as Domain
export const DOMAIN_KANBAN = 'kanban' as Domain
@Model(task.class.State, core.class.Status)
@UX(task.string.TaskState, task.icon.TaskState, undefined, 'rank', 'name')
export class TState extends TStatus implements State {
  isArchived!: boolean
}

@Model(task.class.DoneState, core.class.Status)
@UX(task.string.TaskStateDone, task.icon.TaskState, undefined, 'name')
export class TDoneState extends TStatus implements DoneState {}

@Model(task.class.WonState, task.class.DoneState)
export class TWonState extends TDoneState implements WonState {}

@Model(task.class.LostState, task.class.DoneState)
export class TLostState extends TDoneState implements LostState {}

/**
 * @public
 *
 * No domain is specified, since pure Tasks could not exists
 */
@Model(task.class.Task, core.class.AttachedDoc, DOMAIN_TASK)
@UX(task.string.Task, task.icon.Task, task.string.Task)
export class TTask extends TAttachedDoc implements Task {
  @Prop(TypeRef(core.class.Status), task.string.TaskState, { _id: task.attribute.State })
    status!: Ref<Status>

  @Prop(TypeRef(task.class.DoneState), task.string.TaskStateDone, { _id: task.attribute.DoneState })
    doneState!: Ref<DoneState> | null

  @Prop(TypeString(), task.string.TaskNumber)
  @Index(IndexKind.FullText)
  @Hidden()
    number!: number

  // @Prop(TypeRef(contact.mixin.Employee), task.string.TaskAssignee)
  assignee!: Ref<Person> | null

  @Prop(TypeDate(), task.string.DueDate, { editor: task.component.DueDateEditor })
    dueDate!: Timestamp | null

  declare rank: string

  @Prop(Collection(tags.class.TagReference, task.string.TaskLabels), task.string.TaskLabels)
    labels?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number
}

@Model(task.class.TodoItem, core.class.AttachedDoc, DOMAIN_TASK)
@UX(task.string.Todo)
export class TTodoItem extends TAttachedDoc implements TodoItem {
  @Prop(TypeMarkup(), task.string.TodoName, task.icon.Task)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeRef(contact.mixin.Employee), task.string.TaskAssignee)
    assignee!: Ref<Employee> | null

  @Prop(TypeBoolean(), task.string.TaskDone)
    done!: boolean

  @Prop(TypeDate(), task.string.TaskDueTo)
    dueTo!: Timestamp | null

  @Prop(Collection(task.class.TodoItem), task.string.Todos)
    items!: number

  declare rank: string
}

@Mixin(task.mixin.KanbanCard, core.class.Class)
export class TKanbanCard extends TClass implements KanbanCard {
  card!: AnyComponent
}

@Model(task.class.SpaceWithStates, core.class.Space)
export class TSpaceWithStates extends TSpace {
  templateId!: Ref<KanbanTemplate>
  states!: Arr<Ref<State>>
  doneStates!: Arr<Ref<DoneState>>
}

@Model(task.class.KanbanTemplateSpace, core.class.Space)
export class TKanbanTemplateSpace extends TSpace implements KanbanTemplateSpace {
  declare name: IntlString
  declare description: IntlString
  icon!: AnyComponent
  editor!: AnyComponent
  ofAttribute!: Ref<Attribute<State>>
  doneAttribute!: Ref<Attribute<DoneState>>
  attachedToClass!: Ref<Class<Doc>>
}

@Model(task.class.StateTemplate, core.class.Doc, DOMAIN_KANBAN)
export class TStateTemplate extends TDoc implements StateTemplate {
  // We attach to attribute, so we could distinguish between
  ofAttribute!: Ref<Attribute<Status>>
  attachedTo!: Ref<KanbanTemplate>

  @Prop(TypeString(), task.string.StateTemplateTitle)
    name!: string

  @Prop(TypeString(), task.string.StateTemplateColor)
    color!: number

  declare rank: string
}

@Model(task.class.DoneStateTemplate, core.class.Doc, DOMAIN_KANBAN)
export class TDoneStateTemplate extends TDoc implements DoneStateTemplate {
  // We attach to attribute, so we could distinguish between
  ofAttribute!: Ref<Attribute<Status>>
  attachedTo!: Ref<KanbanTemplate>

  @Prop(TypeString(), task.string.StateTemplateTitle)
    name!: string

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
    },
    override: [view.action.Archive, view.action.Delete]
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
    TKanbanTemplateSpace,
    TStateTemplate,
    TDoneStateTemplate,
    TWonStateTemplate,
    TLostStateTemplate,
    TKanbanTemplate,
    TSequence,
    TTask,
    TTodoItem,
    TSpaceWithStates
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

  builder.mixin(task.class.Task, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: view.component.ObjectPresenter
  })

  builder.mixin(task.class.KanbanTemplate, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: task.component.KanbanTemplatePresenter
  })

  builder.mixin(task.class.Task, core.class.Class, view.mixin.ObjectEditorHeader, {
    editor: task.component.TaskHeader
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
      actionProps: {
        ofAttribute: task.attribute.State,
        doneOfAttribute: task.attribute.DoneState
      },
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

  builder.mixin(task.class.State, core.class.Class, view.mixin.SortFuncs, {
    func: task.function.StatusSort
  })

  builder.mixin(task.class.State, core.class.Class, view.mixin.AllValuesFunc, {
    func: task.function.GetAllStates
  })

  // builder.createDoc(
  //   notification.class.NotificationType,
  //   core.space.Model,
  //   {
  //     label: task.string.Assigned,
  //     hidden: false,
  //     textTemplate: '{doc} was assigned to you by {sender}',
  //     htmlTemplate: '<p>{doc} was assigned to you by {sender}</p>',
  //     subjectTemplate: '{doc} was assigned to you'
  //   },
  //   task.ids.AssigneedNotification
  // )
}
