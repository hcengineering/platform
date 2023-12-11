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
import {
  type Class,
  DOMAIN_MODEL,
  type Doc,
  type Domain,
  IndexKind,
  type Ref,
  type Status,
  type StatusCategory,
  type Timestamp
} from '@hcengineering/core'
import {
  type Builder,
  Collection,
  Hidden,
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
import core, { TAttachedDoc, TClass, TDoc, TSpace } from '@hcengineering/model-core'
import view, { createAction, template, actionTemplates as viewTemplates } from '@hcengineering/model-view'
import { type IntlString } from '@hcengineering/platform'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'
import tags from '@hcengineering/tags'
import {
  type KanbanCard,
  type Project,
  type ProjectStatus,
  type ProjectType,
  type ProjectTypeCategory,
  type Sequence,
  type Task,
  type TodoItem
} from '@hcengineering/task'
import type { AnyComponent } from '@hcengineering/ui/src/types'
import { type ViewAction } from '@hcengineering/view'
import task from './plugin'
import notification from '@hcengineering/notification'

export { taskId } from '@hcengineering/task'
export { createProjectType, createSequence, taskOperation } from './migration'
export { default } from './plugin'

export const DOMAIN_TASK = 'task' as Domain
export const DOMAIN_KANBAN = 'kanban' as Domain

/**
 * @public
 */
@Model(task.class.Task, core.class.AttachedDoc, DOMAIN_TASK)
@UX(task.string.Task, task.icon.Task, task.string.Task)
export class TTask extends TAttachedDoc implements Task {
  @Prop(TypeRef(core.class.Status), task.string.TaskState, { _id: task.attribute.State })
  @Index(IndexKind.Indexed)
    status!: Ref<Status>

  @Prop(TypeString(), task.string.TaskNumber)
  @Index(IndexKind.FullText)
  @Hidden()
    number!: number

  @Prop(TypeRef(contact.mixin.Employee), task.string.TaskAssignee)
    assignee!: Ref<Person> | null

  @Prop(TypeDate(), task.string.DueDate, { editor: task.component.DueDateEditor })
    dueDate!: Timestamp | null

  declare rank: string

  @Prop(Collection(tags.class.TagReference, task.string.TaskLabels), task.string.TaskLabels)
    labels?: number

  @Prop(Collection(notification.class.ChatMessage), notification.string.Comments)
    comments?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  isDone?: boolean
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

@Model(task.class.Project, core.class.Space)
export class TProject extends TSpace implements Project {
  type!: Ref<ProjectType>
}

@Model(task.class.ProjectType, core.class.Space)
export class TProjectType extends TSpace implements ProjectType {
  statuses!: ProjectStatus[]
  shortDescription?: string
  category!: Ref<ProjectTypeCategory>
}

@Model(task.class.ProjectTypeCategory, core.class.Doc, DOMAIN_MODEL)
export class TProjectTypeCategory extends TDoc implements ProjectTypeCategory {
  name!: IntlString
  description!: IntlString
  icon!: AnyComponent
  editor?: AnyComponent
  attachedToClass!: Ref<Class<Project>>
  statusClass!: Ref<Class<Status>>
  statusCategories!: Ref<StatusCategory>[]
}

@Model(task.class.Sequence, core.class.Doc, DOMAIN_KANBAN)
export class TSequence extends TDoc implements Sequence {
  attachedTo!: Ref<Class<Doc>>
  sequence!: number
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
  builder.createModel(TKanbanCard, TSequence, TTask, TTodoItem, TProject, TProjectType, TProjectTypeCategory)

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

  builder.mixin(task.class.ProjectType, core.class.Class, view.mixin.ObjectPresenter, {
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
      target: task.class.Project,
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

  builder.mixin(core.class.Status, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: task.component.StateEditor
  })

  builder.mixin(core.class.Status, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: task.component.StatePresenter
  })

  builder.mixin(core.class.Status, core.class.Class, view.mixin.AttributePresenter, {
    presenter: task.component.StateRefPresenter
  })

  builder.mixin(core.class.Status, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete]
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

  builder.createDoc(
    core.class.StatusCategory,
    core.space.Model,
    {
      ofAttribute: task.attribute.State,
      label: core.string.Status,
      icon: task.icon.TaskState,
      color: PaletteColorIndexes.Blueberry,
      defaultStatusName: 'New state',
      order: 0
    },
    task.statusCategory.Active
  )

  builder.createDoc(
    core.class.StatusCategory,
    core.space.Model,
    {
      ofAttribute: task.attribute.State,
      label: task.string.DoneStatesWon,
      icon: task.icon.TaskState,
      color: PaletteColorIndexes.Houseplant,
      defaultStatusName: 'Won',
      order: 0
    },
    task.statusCategory.Won
  )

  builder.createDoc(
    core.class.StatusCategory,
    core.space.Model,
    {
      ofAttribute: task.attribute.State,
      label: task.string.DoneStatesLost,
      icon: task.icon.TaskState,
      color: PaletteColorIndexes.Firework,
      defaultStatusName: 'Lost',
      order: 0
    },
    task.statusCategory.Lost
  )

  builder.mixin(core.class.Status, core.class.Class, view.mixin.SortFuncs, {
    func: task.function.StatusSort
  })

  builder.mixin(core.class.Status, core.class.Class, view.mixin.AttributeFilter, {
    component: task.component.StatusFilter
  })

  builder.mixin(core.class.Status, core.class.Class, view.mixin.AllValuesFunc, {
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
