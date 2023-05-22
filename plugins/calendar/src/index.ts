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

import { Employee } from '@hcengineering/contact'
import type { AttachedDoc, Class, Doc, Markup, Mixin, Ref, Space, Timestamp } from '@hcengineering/core'
import type { Asset, IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'
import { NotificationType } from '@hcengineering/notification'

/**
 * @public
 */
export interface Calendar extends Space {}

/**
 * @public
 */
export interface Event extends AttachedDoc {
  title: string
  description: Markup

  location?: string

  // Event scheduled date
  date: Timestamp

  // Event due date for long events.
  dueDate?: Timestamp

  attachments?: number
  comments?: number

  participants?: Ref<Employee>[]
}

/**
 * @public
 */
export interface Reminder extends Event {
  shift: Timestamp
  state: 'active' | 'done'
}

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
    Event: '' as Ref<Class<Event>>
  },
  mixin: {
    Reminder: '' as Ref<Mixin<Reminder>>
  },
  icon: {
    Calendar: '' as Asset,
    Location: '' as Asset,
    Reminder: '' as Asset,
    Notifications: '' as Asset
  },
  space: {
    // Space for all personal events.
    PersonalEvents: '' as Ref<Space>
  },
  app: {
    Calendar: '' as Ref<Doc>
  },
  component: {
    PersonsPresenter: '' as AnyComponent,
    Events: '' as AnyComponent,
    DateTimePresenter: '' as AnyComponent,
    DocReminder: '' as AnyComponent,
    RemindersPopup: '' as AnyComponent
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
    Reminders: '' as IntlString
  },
  ids: {
    ReminderNotification: '' as Ref<NotificationType>,
    NoAttached: '' as Ref<Event>
  }
})

export default calendarPlugin
