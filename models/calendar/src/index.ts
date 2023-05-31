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
import { Calendar, Event, Reminder, calendarId } from '@hcengineering/calendar'
import { Employee } from '@hcengineering/contact'
import { DateRangeMode, Domain, IndexKind, Markup, Ref, Timestamp } from '@hcengineering/core'
import {
  ArrOf,
  Builder,
  Collection,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  TypeDate,
  TypeMarkup,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import chunter from '@hcengineering/model-chunter'
import contact from '@hcengineering/model-contact'
import core, { TAttachedDoc } from '@hcengineering/model-core'
import { TSpaceWithStates } from '@hcengineering/model-task'
import view, { createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import notification from '@hcengineering/notification'
import calendar from './plugin'

export * from '@hcengineering/calendar'
export { calendarId } from '@hcengineering/calendar'
export { calendarOperation } from './migration'

export const DOMAIN_CALENDAR = 'calendar' as Domain

@Model(calendar.class.Calendar, core.class.Space)
@UX(calendar.string.Calendar, calendar.icon.Calendar)
export class TCalendar extends TSpaceWithStates implements Calendar {}

@Model(calendar.class.Event, core.class.AttachedDoc, DOMAIN_CALENDAR)
@UX(calendar.string.Event, calendar.icon.Calendar)
export class TEvent extends TAttachedDoc implements Event {
  @Prop(TypeString(), calendar.string.Title)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeMarkup(), calendar.string.Description)
  @Index(IndexKind.FullText)
    description!: Markup

  @Prop(TypeString(), calendar.string.Location, { icon: calendar.icon.Location })
  @Index(IndexKind.FullText)
    location?: string

  @Prop(TypeDate(DateRangeMode.DATETIME), calendar.string.Date)
    date!: Timestamp

  @Prop(TypeDate(DateRangeMode.DATETIME), calendar.string.DueTo)
    dueDate!: Timestamp

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments?: number

  @Prop(ArrOf(TypeRef(contact.class.Employee)), calendar.string.Participants)
    participants!: Ref<Employee>[]
}

@Mixin(calendar.mixin.Reminder, calendar.class.Event)
@UX(calendar.string.Reminder, calendar.icon.Calendar)
export class TReminder extends TEvent implements Reminder {
  @Prop(TypeDate(DateRangeMode.DATETIME), calendar.string.Shift)
  @Hidden()
    shift!: Timestamp

  @Prop(TypeString(), calendar.string.State)
  @Index(IndexKind.Indexed)
  @Hidden()
    state!: 'active' | 'done'
}

export function createModel (builder: Builder): void {
  builder.createModel(TCalendar, TEvent, TReminder)

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: calendar.string.ApplicationLabelCalendar,
      icon: calendar.icon.Calendar,
      alias: calendarId,
      hidden: false,
      component: calendar.component.Events
    },
    calendar.app.Calendar
  )

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
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: calendar.string.Calendar,
      icon: calendar.icon.Calendar
    },
    calendar.ids.CalendarNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: calendar.string.Reminder,
      group: calendar.ids.CalendarNotificationGroup,
      txClasses: [],
      objectClass: calendar.mixin.Reminder,
      allowedForAuthor: true,
      templates: {
        textTemplate: 'Reminder: {doc}',
        htmlTemplate: 'Reminder: {doc}',
        subjectTemplate: 'Reminder: {doc}'
      },
      providers: {
        [notification.providers.PlatformNotification]: true,
        [notification.providers.EmailNotification]: false
      }
    },
    calendar.ids.ReminderNotification
  )

  builder.createDoc(
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: calendar.mixin.Reminder,
      icon: calendar.icon.Reminder,
      txClass: core.class.TxMixin,
      label: calendar.string.CreatedReminder,
      component: calendar.activity.ReminderViewlet,
      display: 'emphasized',
      editable: false,
      hideOnRemove: true
    },
    calendar.ids.ReminderViewlet
  )

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: calendar.string.Calendar,
      icon: calendar.icon.Calendar,
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

  createAction(
    builder,
    {
      action: calendar.actionImpl.SaveEventReminder,
      label: calendar.string.RemindMeAt,
      icon: calendar.icon.Reminder,
      input: 'focus',
      category: calendar.category.Calendar,
      target: calendar.class.Event,
      context: {
        mode: 'context',
        group: 'create'
      }
    },
    calendar.action.SaveEventReminder
  )

  builder.mixin(calendar.mixin.Reminder, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: calendar.component.ReminderPresenter
  })

  builder.mixin(calendar.class.Event, core.class.Class, view.mixin.ObjectEditor, {
    editor: calendar.component.EditEvent
  })

  builder.mixin(calendar.class.Event, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: calendar.component.EventPresenter
  })
}

export default calendar
