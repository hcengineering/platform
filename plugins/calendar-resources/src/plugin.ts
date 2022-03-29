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

import calendar, { calendarId } from '@anticrm/calendar'
import { IntlString, mergeIds } from '@anticrm/platform'
import { AnyComponent } from '@anticrm/ui'

export default mergeIds(calendarId, calendar, {
  component: {
  },
  activity: {
    ReminderViewlet: '' as AnyComponent
  },
  string: {
    Events: '' as IntlString,
    RemindMeAt: '' as IntlString,
    CreateReminder: '' as IntlString,
    EditReminder: '' as IntlString,
    ReminderTime: '' as IntlString,
    ModeDay: '' as IntlString,
    ModeWeek: '' as IntlString,
    ModeMonth: '' as IntlString,
    ModeYear: '' as IntlString,
    Today: '' as IntlString,
    UpcomingEvents: '' as IntlString,
    TableView: '' as IntlString,
    DueMinutes: '' as IntlString,
    DueHours: '' as IntlString,
    DueDays: '' as IntlString
  }
})
