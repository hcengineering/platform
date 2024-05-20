//
// Copyright © 2023 Hardcore Engineering Inc.
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

import activity from '@hcengineering/activity'
import board from '@hcengineering/board'
import calendarPlugin, { type Visibility } from '@hcengineering/calendar'
import contactPlugin, { type Person } from '@hcengineering/contact'
import {
  DOMAIN_MODEL,
  type Class,
  type Domain,
  type Markup,
  type Ref,
  type Space,
  type Timestamp,
  type Type,
  DateRangeMode,
  IndexKind
} from '@hcengineering/core'
import lead from '@hcengineering/lead'
import {
  Collection,
  Mixin,
  Model,
  Prop,
  TypeRef,
  TypeString,
  UX,
  type Builder,
  TypeDate,
  Hidden,
  Index
} from '@hcengineering/model'
import { TEvent } from '@hcengineering/model-calendar'
import core, { TAttachedDoc, TClass, TDoc, TType } from '@hcengineering/model-core'
import tracker from '@hcengineering/model-tracker'
import document from '@hcengineering/model-document'
import view, { createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import notification from '@hcengineering/notification'
import recruit from '@hcengineering/recruit'
import tags from '@hcengineering/tags'
import { type AnyComponent } from '@hcengineering/ui'
import {
  type TodoDoneTester,
  timeId,
  type ItemPresenter,
  type ProjectToDo,
  type ToDo,
  type ToDoPriority,
  type TodoAutomationHelper,
  type WorkSlot
} from '@hcengineering/time'

import type { Resource } from '@hcengineering/platform'
import type { Rank } from '@hcengineering/task'
import time from './plugin'
import task from '@hcengineering/task'

export { timeId } from '@hcengineering/time'
export { default } from './plugin'

export const DOMAIN_TIME = 'time' as Domain

export function TypeToDoPriority (): Type<ToDoPriority> {
  return { _class: time.class.TypeToDoPriority, label: time.string.Priority }
}

@Mixin(time.mixin.ItemPresenter, core.class.Class)
export class TItemPresenter extends TClass implements ItemPresenter {
  presenter!: AnyComponent
}

@Model(time.class.WorkSlot, calendarPlugin.class.Event)
@UX(time.string.WorkSlot)
export class TWorkSlot extends TEvent implements WorkSlot {
  declare attachedTo: Ref<ToDo>
  declare attachedToClass: Ref<Class<ToDo>>
}

@Model(time.class.TypeToDoPriority, core.class.Type, DOMAIN_MODEL)
export class TTypeToDoPriority extends TType {}

@Model(time.class.ToDo, core.class.AttachedDoc, DOMAIN_TIME)
@UX(time.string.ToDo, time.icon.Planned)
export class TToDO extends TAttachedDoc implements ToDo {
  @Prop(TypeDate(DateRangeMode.DATE), task.string.DueDate)
    dueDate?: number | null | undefined

  @Prop(TypeToDoPriority(), time.string.Priority)
    priority!: ToDoPriority

  visibility!: Visibility
  attachedSpace?: Ref<Space> | undefined

  @Prop(TypeString(), calendarPlugin.string.Title)
    title!: string

  @Prop(TypeString(), calendarPlugin.string.Description)
    description!: Markup

  doneOn?: Timestamp | null

  @Prop(TypeRef(contactPlugin.class.Person), contactPlugin.string.For)
    user!: Ref<Person>

  @Prop(Collection(time.class.WorkSlot, time.string.WorkSlot), time.string.WorkSlot)
    workslots!: number

  @Prop(Collection(tags.class.TagReference, tags.string.TagLabel), tags.string.Tags)
    labels?: number | undefined

  @Index(IndexKind.Indexed)
  @Hidden()
    rank!: Rank
}

@Model(time.class.ProjectToDo, time.class.ToDo)
@UX(time.string.ToDo, time.icon.Planned)
export class TProjectToDo extends TToDO implements ProjectToDo {
  declare attachedSpace: Ref<Space>
}

@Model(time.class.TodoAutomationHelper, core.class.Doc, DOMAIN_MODEL)
@UX(time.string.ToDo, time.icon.Planned)
export class TTodoAutomationHelper extends TDoc implements TodoAutomationHelper {
  onDoneTester!: Resource<TodoDoneTester>
}

export function createModel (builder: Builder): void {
  builder.createModel(TWorkSlot, TItemPresenter, TToDO, TProjectToDo, TTypeToDoPriority, TTodoAutomationHelper)

  builder.mixin(time.class.ToDo, core.class.Class, activity.mixin.IgnoreActivity, {})
  builder.mixin(time.class.ProjectToDo, core.class.Class, activity.mixin.IgnoreActivity, {})

  builder.mixin(time.class.TypeToDoPriority, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: time.component.PriorityEditor
  })

  builder.mixin(time.class.WorkSlot, core.class.Class, calendarPlugin.mixin.CalendarEventPresenter, {
    presenter: time.component.WorkSlotElement
  })

  builder.mixin(tracker.class.Issue, core.class.Class, time.mixin.ItemPresenter, {
    presenter: time.component.IssuePresenter
  })

  builder.mixin(document.class.Document, core.class.Class, time.mixin.ItemPresenter, {
    presenter: time.component.DocumentPresenter
  })

  builder.mixin(lead.class.Lead, core.class.Class, time.mixin.ItemPresenter, {
    presenter: time.component.LeadPresenter
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, time.mixin.ItemPresenter, {
    presenter: time.component.ApplicantPresenter
  })

  builder.mixin(board.class.Card, core.class.Class, time.mixin.ItemPresenter, {
    presenter: time.component.CardPresenter
  })

  builder.mixin(time.class.WorkSlot, core.class.Class, view.mixin.ObjectEditor, {
    editor: time.component.EditWorkSlot
  })

  builder.mixin(time.class.ToDo, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: time.function.ToDoTitleProvider
  })

  builder.mixin(time.class.ToDo, core.class.Class, view.mixin.ObjectPanel, {
    component: time.component.EditToDo
  })

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: time.string.Planner,
      icon: calendarPlugin.icon.Calendar,
      alias: timeId,
      hidden: false,
      position: 'top',
      modern: true,
      component: time.component.Me
    },
    time.app.Me
  )

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: time.string.Team,
      icon: time.icon.Team,
      alias: 'team',
      hidden: false,
      component: time.component.Team
    },
    time.app.Team
  )

  builder.mixin(time.class.ToDo, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Open, tracker.action.NewRelatedIssue, view.action.Delete]
  })

  createAction(
    builder,
    {
      action: view.actionImpl.Delete,
      actionProps: {
        skipCheck: true
      },
      label: view.string.Delete,
      icon: view.icon.Delete,
      keyBinding: ['Meta + Backspace'],
      category: view.category.General,
      input: 'any',
      override: [view.action.Delete],
      target: time.class.ToDo,
      context: { mode: ['context', 'browser'], group: 'remove' }
    },
    time.action.DeleteToDo
  )

  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    { label: time.string.Planner, visible: true },
    time.category.Time
  )
  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: time.component.CreateToDoPopup,
        element: 'top',
        fillProps: {
          _object: 'object'
        }
      },
      label: time.string.CreateToDo,
      icon: time.icon.Calendar,
      keyBinding: [],
      input: 'none',
      category: time.category.Time,
      target: core.class.Doc,
      context: {
        mode: [],
        group: 'associate'
      },
      override: [time.action.CreateToDoGlobal]
    },
    time.action.CreateToDo
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: time.component.CreateToDoPopup,
        element: 'top',
        fillProps: {
          _object: 'object'
        }
      },
      label: time.string.CreateToDo,
      icon: time.icon.Calendar,
      keyBinding: [],
      input: 'none',
      category: time.category.Time,
      target: core.class.Doc,
      context: {
        mode: [],
        group: 'create'
      }
    },
    time.action.CreateToDoGlobal
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPanel,
      actionProps: {
        component: time.component.EditToDo,
        element: 'content'
      },
      label: time.string.EditToDo,
      icon: view.icon.Edit,
      keyBinding: [],
      input: 'focus',
      category: time.category.Time,
      target: time.class.ToDo,
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      }
    },
    time.action.EditToDo
  )

  createAction(builder, {
    action: workbench.actionImpl.Navigate,
    actionProps: {
      mode: 'app',
      application: 'time'
    },
    label: time.string.GotoTimePlaning,
    icon: view.icon.ArrowRight,
    input: 'none',
    category: view.category.Navigation,
    target: core.class.Doc,
    context: {
      mode: ['workbench', 'browser', 'editor', 'panel', 'popup']
    }
  })
  createAction(builder, {
    action: workbench.actionImpl.Navigate,
    actionProps: {
      mode: 'app',
      application: 'team'
    },
    label: time.string.GotoTimeTeamPlaning,
    icon: view.icon.ArrowRight,
    input: 'none',
    category: view.category.Navigation,
    target: core.class.Doc,
    context: {
      mode: ['workbench', 'browser', 'editor', 'panel', 'popup']
    }
  })

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: time.string.ToDos,
      icon: time.icon.Team,
      objectClass: time.class.ToDo
    },
    time.ids.TimeNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      allowedForAuthor: true,
      label: time.string.NewToDo,
      group: time.ids.TimeNotificationGroup,
      txClasses: [core.class.TxCreateDoc],
      objectClass: time.class.ProjectToDo,
      onlyOwn: true,
      providers: {
        [notification.providers.PlatformNotification]: true
      }
    },
    time.ids.ToDoCreated
  )

  builder.mixin(time.class.ToDo, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['user']
  })

  builder.mixin(time.class.ToDo, core.class.Class, notification.mixin.NotificationObjectPresenter, {
    presenter: time.component.NotificationToDoPresenter
  })

  builder.mixin(time.class.ProjectToDo, core.class.Class, view.mixin.ObjectPanel, {
    component: view.component.AttachedDocPanel
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_TIME,
    disabled: [
      { modifiedOn: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { attachedToClass: 1 },
      { createdOn: -1 },
      { modifiedOn: 1 }
    ]
  })
}

export * from './migration'
