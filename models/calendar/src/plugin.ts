//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { TxViewlet } from '@hcengineering/activity'
import { calendarId } from '@hcengineering/calendar'
import calendar from '@hcengineering/calendar-resources/src/plugin'
import { Ref } from '@hcengineering/core'
import { NotificationGroup } from '@hcengineering/notification'
import type { IntlString } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'
import { Action, ActionCategory, ViewAction, Viewlet, ViewletDescriptor } from '@hcengineering/view'

export default mergeIds(calendarId, calendar, {
  component: {
    IntegrationConnect: '' as AnyComponent,
    CreateCalendar: '' as AnyComponent,
    EventPresenter: '' as AnyComponent,
    CalendarIntegrationIcon: '' as AnyComponent,
    CalendarEventPresenter: '' as AnyComponent,
    IntegrationConfigure: '' as AnyComponent
  },
  action: {
    SaveEventReminder: '' as Ref<Action>,
    DeleteRecEvent: '' as Ref<Action>
  },
  category: {
    Calendar: '' as Ref<ActionCategory>
  },
  actionImpl: {
    SaveEventReminder: '' as ViewAction,
    DeleteRecEvent: '' as ViewAction
  },
  string: {
    ApplicationLabelCalendar: '' as IntlString,
    Event: '' as IntlString,
    Reminder: '' as IntlString,
    Shift: '' as IntlString,
    State: '' as IntlString,
    CreatedReminder: '' as IntlString,
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString,
    IntegrationDescr: '' as IntlString
  },
  viewlet: {
    Calendar: '' as Ref<ViewletDescriptor>,
    CalendarEvent: '' as Ref<Viewlet>
  },
  ids: {
    ReminderViewlet: '' as Ref<TxViewlet>,
    CalendarNotificationGroup: '' as Ref<NotificationGroup>
  }
})
