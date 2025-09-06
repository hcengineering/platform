// Copyright © 2022-2025 Hardcore Engineering Inc.
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

import { Contact, Employee } from '@hcengineering/contact'
import type {
  AttachedDoc,
  Class,
  Client,
  Doc,
  IntegrationKind,
  Markup,
  Mixin,
  PersonId,
  Ref,
  SystemSpace,
  Timestamp
} from '@hcengineering/core'
import { NotificationType } from '@hcengineering/notification'
import type { Asset, IntlString, Metadata, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { Preference } from '@hcengineering/preference'
import { Handler, IntegrationType } from '@hcengineering/setting'
import { AnyComponent, ComponentExtensionId } from '@hcengineering/ui'

/**
 * @public
 */
export type Visibility = 'public' | 'freeBusy' | 'private'

/**
 * @public
 */
export interface Calendar extends Doc {
  name: string
  hidden: boolean
  visibility: Visibility
  user: PersonId
  access: AccessLevel
}

/**
 * @public
 */
export interface ExternalCalendar extends Calendar {
  default: boolean
  externalId: string
  externalUser: string
}

export interface PrimaryCalendar extends Preference {
  attachedTo: Ref<Calendar>
}

/**
 * @public
 * RFC5545
 */
export interface RecurringRule {
  freq: 'SECONDLY' | 'MINUTELY' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  endDate?: Timestamp
  count?: number
  interval?: number
  bySecond?: number[]
  byMinute?: number[]
  byHour?: number[]
  byDay?: string[]
  byMonthDay?: number[]
  byYearDay?: number[]
  byWeekNo?: number[]
  byMonth?: number[]
  bySetPos?: number[]
  wkst?: 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA'
}

/**
 * @public
 */
export interface ReccuringEvent extends Event {
  rules: RecurringRule[]
  exdate: Timestamp[]
  rdate: Timestamp[]
  originalStartTime: Timestamp
  timeZone: string
}

/**
 * @public
 */
export interface Event extends AttachedDoc {
  space: Ref<SystemSpace>
  eventId: string
  title: string
  description: Markup

  calendar: Ref<Calendar>

  location?: string

  allDay: boolean

  // Event scheduled date
  date: Timestamp

  // Event due date for long events.
  dueDate: Timestamp

  attachments?: number

  participants: Ref<Contact>[]

  externalParticipants?: string[]

  reminders?: Timestamp[]

  visibility?: Visibility

  access: AccessLevel

  timeZone?: string

  user: PersonId

  blockTime: boolean
}

export enum AccessLevel {
  FreeBusyReader = 'freeBusyReader',
  Reader = 'reader',
  Writer = 'writer',
  Owner = 'owner'
}

/**
 * @public
 * use for an instance of a recurring event
 */
export interface ReccuringInstance extends ReccuringEvent {
  recurringEventId: string
  originalStartTime: number
  isCancelled?: boolean
  virtual?: boolean
}

/**
 * @public
 */
export interface CalendarEventPresenter extends Class<Event> {
  presenter: AnyComponent
}

export type ScheduleAvailability = Record<number, { start: number, end: number }[]>

/**
 * @public
 */
export interface Schedule extends Doc {
  owner: Ref<Employee>
  title: string
  description?: string
  meetingDuration: number
  meetingInterval: number
  availability: ScheduleAvailability
  timeZone: string
  calendar?: Ref<Calendar>
}

/**
 * @public
 */
export const calendarIntegrationKind = 'google-calendar' as IntegrationKind

/**
 * @public
 */
export const caldavIntegrationKind = 'caldav' as IntegrationKind

/**
 * @public
 */
export const calendarId = 'calendar' as Plugin

/**
 * @public
 */
const calendarPlugin = plugin(calendarId, {
  class: {
    Calendar: '' as Ref<Class<Calendar>>,
    ExternalCalendar: '' as Ref<Class<ExternalCalendar>>,
    Event: '' as Ref<Class<Event>>,
    ReccuringEvent: '' as Ref<Class<ReccuringEvent>>,
    ReccuringInstance: '' as Ref<Class<ReccuringInstance>>,
    Schedule: '' as Ref<Class<Schedule>>,
    PrimaryCalendar: '' as Ref<Class<PrimaryCalendar>>
  },
  mixin: {
    CalendarEventPresenter: '' as Ref<Mixin<CalendarEventPresenter>>
  },
  icon: {
    Calendar: '' as Asset,
    CalendarView: '' as Asset,
    Location: '' as Asset,
    Reminder: '' as Asset,
    Notifications: '' as Asset,
    Watch: '' as Asset,
    Description: '' as Asset,
    Participants: '' as Asset,
    Repeat: '' as Asset,
    Globe: '' as Asset,
    Public: '' as Asset,
    Hidden: '' as Asset,
    Private: '' as Asset,
    Duration: '' as Asset,
    Timer: '' as Asset
  },
  image: {
    Permissions: '' as Asset
  },
  space: {
    Calendar: '' as Ref<SystemSpace>
  },
  app: {
    Calendar: '' as Ref<Doc>
  },
  component: {
    CreateEvent: '' as AnyComponent,
    EditEvent: '' as AnyComponent,
    CalendarView: '' as AnyComponent,
    PersonsPresenter: '' as AnyComponent,
    Events: '' as AnyComponent,
    DateTimePresenter: '' as AnyComponent,
    DocReminder: '' as AnyComponent,
    ConnectApp: '' as AnyComponent,
    ScheduleEditor: '' as AnyComponent,
    IntegrationState: '' as AnyComponent
  },
  string: {
    Title: '' as IntlString,
    Calendar: '' as IntlString,
    Description: '' as IntlString,
    Date: '' as IntlString,
    DueTo: '' as IntlString,
    Calendars: '' as IntlString,
    CreateCalendar: '' as IntlString,
    Location: '' as IntlString,
    Participants: '' as IntlString,
    NoParticipants: '' as IntlString,
    PersonsLabel: '' as IntlString,
    EventNumber: '' as IntlString,
    Reminders: '' as IntlString,
    Today: '' as IntlString,
    Visibility: '' as IntlString,
    Public: '' as IntlString,
    FreeBusy: '' as IntlString,
    Busy: '' as IntlString,
    Private: '' as IntlString,
    NotAllPermissions: '' as IntlString,
    Value: '' as IntlString,
    Schedule: '' as IntlString,
    ScheduleNew: '' as IntlString,
    ScheduleDeleteConfirm: '' as IntlString,
    ScheduleShareLink: '' as IntlString,
    ScheduleSharedLinkMessage: '' as IntlString,
    CopyLink: '' as IntlString,
    ScheduleAvailability: '' as IntlString,
    ScheduleAddPeriod: '' as IntlString,
    ScheduleRemovePeriod: '' as IntlString,
    ScheduleTitlePlaceholder: '' as IntlString,
    ScheduleUnavailable: '' as IntlString,
    MeetingDuration: '' as IntlString,
    MeetingInterval: '' as IntlString,
    Day: '' as IntlString,
    Week: '' as IntlString,
    Month: '' as IntlString,
    CalDavAccess: '' as IntlString,
    CalDavAccessPrompt: '' as IntlString,
    CalDavAccessEnable: '' as IntlString,
    CalDavAccessServer: '' as IntlString,
    CalDavAccessAccount: '' as IntlString,
    CalDavAccessPassword: '' as IntlString,
    CalDavAccessPasswordWarning: '' as IntlString,
    MeetingScheduledNotification: '' as IntlString,
    MeetingRescheduledNotification: '' as IntlString,
    MeetingCanceledNotification: '' as IntlString,
    SynchronizedCalendars: '' as IntlString,
    Account: '' as IntlString,
    NoCalendars: '' as IntlString
  },
  handler: {
    DisconnectHandler: '' as Handler,
    DisconnectAllHandler: '' as Handler
  },
  integrationType: {
    Calendar: '' as Ref<IntegrationType>
  },
  metadata: {
    CalendarServiceURL: '' as Metadata<string>,
    PublicScheduleURL: '' as Metadata<string>,
    CalDavServerURL: '' as Metadata<string>
  },
  extensions: {
    EditEventExtensions: '' as ComponentExtensionId,
    EditScheduleExtensions: '' as ComponentExtensionId
  },
  ids: {
    ReminderNotification: '' as Ref<NotificationType>,
    NoAttached: '' as Ref<Event>
  },
  function: {
    ConfigureCalDavAccess: '' as Resource<() => Promise<void>>,
    EventTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>
  }
})

export default calendarPlugin
export * from './utils'
