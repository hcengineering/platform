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

import { Doc } from '@anticrm/core'
import { Resources } from '@anticrm/platform'
import { showPopup } from '@anticrm/ui'
import CalendarView from './components/CalendarView.svelte'
import SaveEventReminder from './components/SaveEventReminder.svelte'
import DateTimePresenter from './components/DateTimePresenter.svelte'
import DocReminder from './components/DocReminder.svelte'
import PersonsPresenter from './components/PersonsPresenter.svelte'
import UpcomingEvents from './components/UpcomingEvents.svelte'
import ReminderPresenter from './components/ReminderPresenter.svelte'
import ReminderViewlet from './components/activity/ReminderViewlet.svelte'
import EditEvent from './components/EditEvent.svelte'
import RemindersPopup from './components/RemindersPopup.svelte'

async function saveEventReminder (object: Doc): Promise<void> {
  showPopup(SaveEventReminder, { objectId: object._id, objectClass: object._class })
}

export default async (): Promise<Resources> => ({
  component: {
    EditEvent,
    ReminderPresenter,
    PersonsPresenter,
    CalendarView,
    UpcomingEvents,
    DateTimePresenter,
    DocReminder,
    RemindersPopup
  },
  activity: {
    ReminderViewlet
  },
  actionImpl: {
    SaveEventReminder: saveEventReminder
  }
})
