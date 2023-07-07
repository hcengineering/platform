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

import calendar, { calendarId } from '@hcengineering/calendar'
import { IntlString, mergeIds } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'

export default mergeIds(calendarId, calendar, {
  component: {
    CreateEvent: '' as AnyComponent,
    EditEvent: '' as AnyComponent,
    EditRecEvent: '' as AnyComponent
  },
  activity: {
    ReminderViewlet: '' as AnyComponent
  },
  string: {
    Events: '' as IntlString,
    RemindMeAt: '' as IntlString,
    CreateReminder: '' as IntlString,
    ReminderTime: '' as IntlString,
    ModeDay: '' as IntlString,
    ModeWeek: '' as IntlString,
    ModeMonth: '' as IntlString,
    ModeYear: '' as IntlString,
    Today: '' as IntlString,
    TableView: '' as IntlString,
    DueMinutes: '' as IntlString,
    DueHours: '' as IntlString,
    DueDays: '' as IntlString,
    NoReminders: '' as IntlString,
    AllDay: '' as IntlString,
    AndMore: '' as IntlString,
    CreateEvent: '' as IntlString,
    EventFor: '' as IntlString,
    ReccuringEvent: '' as IntlString,
    HideDetails: '' as IntlString,
    ExternalParticipants: '' as IntlString,
    RedirectGoogle: '' as IntlString,
    Connect: '' as IntlString,
    ConnectCalendar: '' as IntlString,
    EditRecEvent: '' as IntlString,
    RemoveRecEvent: '' as IntlString,
    ThisEvent: '' as IntlString,
    ThisAndNext: '' as IntlString,
    AllEvents: '' as IntlString
  }
})
