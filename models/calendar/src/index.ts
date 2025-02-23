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

import activity from '@hcengineering/activity'
import {
  type Calendar,
  type CalendarEventPresenter,
  type Event,
  type ExternalCalendar,
  type ReccuringEvent,
  type ReccuringInstance,
  type RecurringRule,
  type Visibility
} from '@hcengineering/calendar'
import { type Contact } from '@hcengineering/contact'
import {
  DateRangeMode,
  IndexKind,
  type SystemSpace,
  type Domain,
  type Markup,
  type Ref,
  type Timestamp
} from '@hcengineering/core'
import {
  ArrOf,
  Collection,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeBoolean,
  TypeDate,
  TypeMarkup,
  TypeRef,
  TypeString,
  TypeTimestamp,
  UX,
  type Builder
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import contact from '@hcengineering/model-contact'
import core, { TAttachedDoc, TClass, TDoc } from '@hcengineering/model-core'
import view, { createAction } from '@hcengineering/model-view'
import notification from '@hcengineering/notification'
import setting from '@hcengineering/setting'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import workbench from '@hcengineering/model-workbench'
import { WidgetType } from '@hcengineering/workbench'

import calendar from './plugin'

export * from '@hcengineering/calendar'
export { calendarId } from '@hcengineering/calendar'
export { calendarOperation } from './migration'

export const DOMAIN_CALENDAR = 'calendar' as Domain
export const DOMAIN_EVENT = 'event' as Domain

@Model(calendar.class.Calendar, core.class.Doc, DOMAIN_CALENDAR)
@UX(calendar.string.Calendar, calendar.icon.Calendar)
export class TCalendar extends TDoc implements Calendar {
  name!: string
  hidden!: boolean
  visibility!: Visibility
}

@Model(calendar.class.ExternalCalendar, calendar.class.Calendar)
@UX(calendar.string.Calendar, calendar.icon.Calendar)
export class TExternalCalendar extends TCalendar implements ExternalCalendar {
  default!: boolean
  externalId!: string
  externalUser!: string
}

@Model(calendar.class.Event, core.class.AttachedDoc, DOMAIN_EVENT)
@UX(calendar.string.Event, calendar.icon.Calendar)
export class TEvent extends TAttachedDoc implements Event {
  declare space: Ref<SystemSpace>

  @Prop(TypeRef(calendar.class.Calendar), calendar.string.Calendar)
    calendar!: Ref<Calendar>

  eventId!: string

  @Prop(TypeString(), calendar.string.Title)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeMarkup(), calendar.string.Description)
  @Index(IndexKind.FullText)
    description!: Markup

  @Prop(TypeString(), calendar.string.Location, { icon: calendar.icon.Location })
  @Index(IndexKind.FullText)
    location?: string

  @Prop(TypeBoolean(), calendar.string.AllDay)
  @ReadOnly()
    allDay!: boolean

  @Prop(TypeDate(DateRangeMode.DATETIME), calendar.string.Date)
    date!: Timestamp

  @Prop(TypeDate(DateRangeMode.DATETIME), calendar.string.DueTo)
    dueDate!: Timestamp

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(ArrOf(TypeRef(contact.class.Contact)), calendar.string.Participants)
    participants!: Ref<Contact>[]

  @Prop(ArrOf(TypeTimestamp()), calendar.string.Reminders)
    reminders?: number[]

  @Prop(ArrOf(TypeString()), calendar.string.ExternalParticipants)
    externalParticipants?: string[]

  access!: 'freeBusyReader' | 'reader' | 'writer' | 'owner'

  visibility?: Visibility

  timeZone?: string
}

@Model(calendar.class.ReccuringEvent, calendar.class.Event)
@UX(calendar.string.ReccuringEvent, calendar.icon.Calendar)
export class TReccuringEvent extends TEvent implements ReccuringEvent {
  declare timeZone: string
  rules!: RecurringRule[]
  exdate!: Timestamp[]
  rdate!: Timestamp[]
  originalStartTime!: Timestamp
}

@Model(calendar.class.ReccuringInstance, calendar.class.Event)
@UX(calendar.string.Event, calendar.icon.Calendar)
export class TReccuringInstance extends TReccuringEvent implements ReccuringInstance {
  recurringEventId!: Ref<ReccuringEvent>
  isCancelled?: boolean
  virtual?: boolean
}

@Mixin(calendar.mixin.CalendarEventPresenter, core.class.Class)
export class TCalendarEventPresenter extends TClass implements CalendarEventPresenter {
  presenter!: AnyComponent
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TCalendar,
    TExternalCalendar,
    TReccuringEvent,
    TReccuringInstance,
    TEvent,
    TCalendarEventPresenter
  )

  builder.createDoc(
    workbench.class.Widget,
    core.space.Model,
    {
      label: calendar.string.Calendar,
      type: WidgetType.Fixed,
      icon: calendar.icon.Calendar,
      component: calendar.component.CalendarWidget
    },
    calendar.ids.CalendarWidget
  )

  builder.mixin(calendar.class.Event, core.class.Class, calendar.mixin.CalendarEventPresenter, {
    presenter: calendar.component.CalendarEventPresenter
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: calendar.class.Event,
      descriptor: calendar.viewlet.Calendar,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      config: [''],
      configOptions: {
        hiddenKeys: ['title', 'date']
      }
    },
    calendar.viewlet.CalendarEvent
  )

  builder.createDoc(
    setting.class.IntegrationType,
    core.space.Model,
    {
      label: calendar.string.Calendar,
      description: calendar.string.IntegrationDescr,
      icon: calendar.component.CalendarIntegrationIcon,
      allowMultiple: true,
      createComponent: calendar.component.IntegrationConnect,
      onDisconnect: calendar.handler.DisconnectHandler,
      reconnectComponent: calendar.component.IntegrationConnect,
      configureComponent: calendar.component.IntegrationConfigure
    },
    calendar.integrationType.Calendar
  )

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: calendar.string.Calendar,
      icon: calendar.icon.Calendar
    },
    calendar.ids.CalendarNotificationGroup
  )

  builder.mixin(calendar.class.Event, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['participants']
  })

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: calendar.string.Reminder,
      group: calendar.ids.CalendarNotificationGroup,
      txClasses: [],
      objectClass: calendar.class.Event,
      allowedForAuthor: true,
      templates: {
        textTemplate: 'Reminder: {doc}',
        htmlTemplate: 'Reminder: {doc}',
        subjectTemplate: 'Reminder: {doc}'
      },
      defaultEnabled: false
    },
    calendar.ids.ReminderNotification
  )

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: notification.providers.InboxNotificationProvider,
    ignoredTypes: [],
    enabledTypes: [calendar.ids.ReminderNotification]
  })

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: calendar.class.Event,
      icon: calendar.icon.Reminder,
      action: 'update',
      hideIfRemoved: true
    },
    calendar.ids.UpdateRemainderActivityViewlet
  )

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: calendar.string.Calendar,
      icon: calendar.icon.CalendarView,
      component: calendar.component.CalendarView
    },
    calendar.viewlet.Calendar
  )

  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    { label: calendar.string.Calendar, visible: true },
    calendar.category.Calendar
  )

  // createAction(
  //   builder,
  //   {
  //     action: calendar.actionImpl.SaveEventReminder,
  //     label: calendar.string.RemindMeAt,
  //     icon: calendar.icon.Reminder,
  //     input: 'focus',
  //     category: calendar.category.Calendar,
  //     target: calendar.class.Event,
  //     context: {
  //       mode: 'context',
  //       group: 'create'
  //     }
  //   },
  //   calendar.action.SaveEventReminder
  // )

  createAction(
    builder,
    {
      action: calendar.actionImpl.DeleteRecEvent,
      override: [view.action.Delete],
      label: view.string.Delete,
      icon: view.icon.Delete,
      keyBinding: ['Meta + Backspace'],
      category: view.category.General,
      input: 'any',
      target: calendar.class.ReccuringInstance,
      context: { mode: ['context', 'browser'], group: 'remove' }
    },
    calendar.action.DeleteRecEvent
  )

  builder.mixin(calendar.class.Event, core.class.Class, view.mixin.ObjectEditor, {
    editor: calendar.component.EditEvent
  })

  builder.mixin(calendar.class.Event, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: calendar.component.EventPresenter
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_CALENDAR,
    disabled: [
      { attachedToClass: 1 },
      { modifiedOn: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { createdOn: -1 },
      { state: 1 }
    ]
  })
}

export default calendar
