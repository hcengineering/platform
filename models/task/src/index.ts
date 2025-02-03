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

import type { Person } from '@hcengineering/contact'
import contact from '@hcengineering/contact'
import {
  DOMAIN_MODEL,
  IndexKind,
  type Class,
  type Domain,
  type Ref,
  type Status,
  type StatusCategory,
  type Timestamp
} from '@hcengineering/core'
import {
  ArrOf,
  Collection,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeBoolean,
  TypeDate,
  TypeRecord,
  TypeRef,
  TypeString,
  UX,
  type Builder
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import chunter from '@hcengineering/model-chunter'
import core, {
  TAttachedDoc,
  TClass,
  TDoc,
  TSpaceType,
  TSpaceTypeDescriptor,
  TTypedSpace
} from '@hcengineering/model-core'
import { createPublicLinkAction } from '@hcengineering/model-guest'
import view, {
  classPresenter,
  createAction,
  template,
  actionTemplates as viewTemplates
} from '@hcengineering/model-view'
import { getEmbeddedLabel, type Asset, type IntlString, type Resource } from '@hcengineering/platform'
import setting from '@hcengineering/setting'
import tags from '@hcengineering/tags'
import {
  type KanbanCard,
  type Project,
  type ProjectStatus,
  type ProjectType,
  type ProjectTypeClass,
  type ProjectTypeDescriptor,
  type Rank,
  type Task,
  type TaskType,
  type TaskTypeClass,
  type TaskTypeDescriptor,
  type TaskTypeKind
} from '@hcengineering/task'
import type { AnyComponent } from '@hcengineering/ui'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'

import task from './plugin'

export { createProjectType, taskId } from '@hcengineering/task'
export { createSequence, migrateDefaultStatusesBase, taskOperation } from './migration'
export { default } from './plugin'

export const DOMAIN_TASK = 'task' as Domain

/**
 * @public
 */
@Model(task.class.Task, core.class.AttachedDoc, DOMAIN_TASK)
@UX(task.string.Task, task.icon.Task, task.string.Task)
export class TTask extends TAttachedDoc implements Task {
  @Prop(TypeRef(core.class.Status), task.string.TaskState, { _id: task.attribute.State })
  @Index(IndexKind.Indexed)
    status!: Ref<Status>

  @Prop(TypeRef(task.class.TaskType), task.string.TaskType)
  @Index(IndexKind.Indexed)
  @ReadOnly()
    kind!: Ref<TaskType>

  @Prop(TypeString(), task.string.TaskNumber)
  @Index(IndexKind.FullText)
  @Hidden()
    number!: number

  @Prop(TypeRef(contact.mixin.Employee), task.string.TaskAssignee)
    assignee!: Ref<Person> | null

  @Prop(TypeDate(), task.string.DueDate, { editor: task.component.DueDateEditor })
    dueDate!: Timestamp | null

  @Prop(TypeString(), task.string.Rank)
  @Index(IndexKind.IndexedDsc)
  @Hidden()
    rank!: Rank

  @Prop(Collection(tags.class.TagReference, task.string.TaskLabels), task.string.TaskLabels)
    labels?: number

  @Prop(Collection(chunter.class.ChatMessage), chunter.string.Comments)
    comments?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(TypeBoolean(), getEmbeddedLabel('isDone'))
  @Hidden()
    isDone?: boolean

  @Prop(TypeString(), task.string.Identifier)
  @ReadOnly()
  @Index(IndexKind.Indexed)
    identifier!: string
}

@Mixin(task.mixin.KanbanCard, core.class.Class)
export class TKanbanCard extends TClass implements KanbanCard {
  card!: AnyComponent
}

@Model(task.class.TaskTypeDescriptor, core.class.Doc, DOMAIN_MODEL)
export class TTaskTypeDescriptor extends TDoc implements TaskTypeDescriptor {
  name!: IntlString
  description!: IntlString
  icon!: Asset
  baseClass!: Ref<Class<Task>>

  // If specified, will allow to be created by users, system type overwize
  allowCreate!: boolean
  statusCategoriesFunc?: Resource<(project: ProjectType) => Ref<StatusCategory>[]>
}

@Mixin(task.mixin.TaskTypeClass, core.class.Class)
export class TTaskTypeClass extends TClass implements TaskTypeClass {
  taskType!: Ref<TaskType>
  projectType!: Ref<ProjectType>
}

@Mixin(task.mixin.ProjectTypeClass, core.class.Class)
export class TProjectTypeClass extends TClass implements ProjectTypeClass {
  projectType!: Ref<ProjectType>
}

@Model(task.class.Project, core.class.TypedSpace)
export class TProject extends TTypedSpace implements Project {
  @Prop(TypeRef(task.class.ProjectType), task.string.ProjectType)
  declare type: Ref<ProjectType>
}

@Model(task.class.ProjectType, core.class.SpaceType)
export class TProjectType extends TSpaceType implements ProjectType {
  @Prop(TypeRef(task.class.ProjectTypeDescriptor), getEmbeddedLabel('Descriptor'))
  declare descriptor: Ref<ProjectTypeDescriptor>

  @Prop(TypeString(), task.string.Description)
  @Index(IndexKind.FullText)
    description!: string

  @Prop(ArrOf(TypeRef(task.class.TaskType)), getEmbeddedLabel('Tasks'))
    tasks!: Ref<TaskType>[]

  @Prop(ArrOf(TypeRecord()), getEmbeddedLabel('Project statuses'))
    statuses!: ProjectStatus[]

  @Prop(TypeRef(core.class.Class), getEmbeddedLabel('Target Class'))
  declare targetClass: Ref<Class<Project>>

  @Prop(TypeBoolean(), getEmbeddedLabel('Classic'))
    classic!: boolean
}

@Model(task.class.TaskType, core.class.Doc, DOMAIN_MODEL)
export class TTaskType extends TDoc implements TaskType {
  @Prop(TypeString(), getEmbeddedLabel('Name'))
    name!: string

  @Prop(TypeRef(task.class.TaskTypeDescriptor), getEmbeddedLabel('Descriptor'))
    descriptor!: Ref<TaskTypeDescriptor>

  @Prop(TypeRef(task.class.ProjectType), getEmbeddedLabel('Task class'))
    parent!: Ref<ProjectType> // Base class for task

  @Prop(TypeString(), getEmbeddedLabel('Kind'))
    kind!: TaskTypeKind

  @Prop(ArrOf(TypeRef(task.class.TaskType)), getEmbeddedLabel('Parent'))
    allowedAsChildOf!: Ref<TaskType>[] // In case of specified, task type is for sub-tasks

  @Prop(TypeRef(core.class.Class), getEmbeddedLabel('Task class'))
    ofClass!: Ref<Class<Task>> // Base class for task

  @Prop(TypeRef(core.class.Class), getEmbeddedLabel('Task target class'))
    targetClass!: Ref<Class<Task>> // Class or Mixin mixin to hold all user defined attributes.

  @Prop(ArrOf(TypeRef(core.class.Status)), getEmbeddedLabel('Task statuses'))
    statuses!: Ref<Status>[]

  @Prop(TypeRef(core.class.Class), getEmbeddedLabel('Task status class'))
    statusClass!: Ref<Class<Status>>

  @Prop(TypeRef(core.class.StatusCategory), getEmbeddedLabel('Task status categories'))
    statusCategories!: Ref<StatusCategory>[]
}

@Model(task.class.ProjectTypeDescriptor, core.class.SpaceTypeDescriptor, DOMAIN_MODEL)
export class TProjectTypeDescriptor extends TSpaceTypeDescriptor implements ProjectTypeDescriptor {
  editor?: AnyComponent
  allowedClassic?: boolean
  allowedTaskTypeDescriptors?: Ref<TaskTypeDescriptor>[] // if undefined we allow all possible
  declare baseClass: Ref<Class<Project>>
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
  }
})

export function createModel (builder: Builder): void {
  builder.createModel(
    TKanbanCard,
    TTask,
    TProject,
    TProjectType,
    TTaskType,
    TProjectTypeDescriptor,
    TTaskTypeDescriptor,
    TTaskTypeClass,
    TProjectTypeClass
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

  builder.mixin(task.class.ProjectType, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: task.component.KanbanTemplatePresenter
  })

  builder.mixin(task.class.Task, core.class.Class, view.mixin.ObjectEditorHeader, {
    editor: task.component.TaskHeader
  })

  builder.mixin(task.class.ProjectType, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Open]
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

  builder.mixin(task.class.TaskType, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: task.component.TaskTypePresenter
  })

  builder.mixin(task.class.ProjectType, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: task.component.ProjectTypePresenter
  })

  classPresenter(builder, task.class.TaskType, task.component.TaskTypePresenter, task.component.TaskTypePresenter)

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
      label: task.string.Export,
      action: task.actionImpl.ExportTasks,
      icon: view.icon.Move,
      input: 'selection',
      category: view.category.General,
      target: task.class.Task,
      context: {
        mode: ['context', 'browser'],
        group: 'tools'
      }
    },
    task.action.ExportTasks
  )

  builder.createDoc(
    core.class.StatusCategory,
    core.space.Model,
    {
      ofAttribute: task.attribute.State,
      label: task.string.StateBacklog,
      icon: task.icon.TaskState,
      color: PaletteColorIndexes.Cloud,
      defaultStatusName: 'Backlog',
      order: 0
    },
    task.statusCategory.UnStarted
  )

  builder.createDoc(
    core.class.StatusCategory,
    core.space.Model,
    {
      ofAttribute: task.attribute.State,
      label: task.string.StateUnstarted,
      icon: task.icon.TaskState,
      color: PaletteColorIndexes.Porpoise,
      defaultStatusName: 'Todo',
      order: 1
    },
    task.statusCategory.ToDo
  )

  builder.createDoc(
    core.class.StatusCategory,
    core.space.Model,
    {
      ofAttribute: task.attribute.State,
      label: task.string.StateActive,
      icon: task.icon.TaskState,
      color: PaletteColorIndexes.Cerulean,
      defaultStatusName: 'New state',
      order: 2
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
      color: PaletteColorIndexes.Grass,
      defaultStatusName: 'Won',
      order: 3
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
      color: PaletteColorIndexes.Coin,
      defaultStatusName: 'Lost',
      order: 4
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

  builder.mixin(task.mixin.TaskTypeClass, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: task.component.TaskTypeClassPresenter
  })
  builder.mixin(task.mixin.ProjectTypeClass, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: task.component.ProjectTypeClassPresenter
  })

  builder.mixin(task.class.Task, core.class.Class, setting.mixin.Editable, {
    value: true
  })

  builder.mixin(task.class.Project, core.class.Class, setting.mixin.Editable, {
    value: true
  })

  builder.mixin(task.class.ProjectTypeDescriptor, core.class.Class, setting.mixin.SpaceTypeCreator, {
    extraComponent: task.component.CreateProjectType
  })

  builder.mixin(task.class.ProjectType, core.class.Class, setting.mixin.SpaceTypeEditor, {
    sections: [
      {
        id: 'general',
        label: setting.string.General,
        component: task.component.ProjectTypeGeneralSectionEditor,
        withoutContainer: true
      },
      {
        id: 'properties',
        label: setting.string.Properties,
        component: setting.component.SpaceTypePropertiesSectionEditor,
        withoutContainer: true
      },
      {
        id: 'roles',
        label: setting.string.Roles,
        component: setting.component.SpaceTypeRolesSectionEditor
      },
      {
        id: 'taskTypes',
        label: setting.string.TaskTypes,
        component: task.component.ProjectTypeTasksTypeSectionEditor
      },
      {
        id: 'automations',
        label: setting.string.Automations,
        component: task.component.ProjectTypeAutomationsSectionEditor
      },
      {
        id: 'collections',
        label: setting.string.Collections,
        component: task.component.ProjectTypeCollectionsSectionEditor
      }
    ],
    subEditors: {
      taskTypes: task.component.TaskTypeEditor,
      roles: setting.component.RoleEditor
    }
  })

  createPublicLinkAction(builder, task.class.Task, task.action.PublicLink)

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_TASK,
    disabled: [
      { modifiedBy: 1 },
      { attachedToClass: 1 },
      { component: 1 },
      { milestone: 1 },
      { relations: 1 },
      { priority: 1 }
    ]
  })
}
