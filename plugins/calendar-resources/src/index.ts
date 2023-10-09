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

import { ReccuringInstance } from '@hcengineering/calendar'
import { Doc, TxOperations, concatLink } from '@hcengineering/core'
import { Resources, getMetadata } from '@hcengineering/platform'
import presentation, { getClient } from '@hcengineering/presentation'
import { closePopup, showPopup } from '@hcengineering/ui'
import CalendarView from './components/CalendarView.svelte'
import CreateEvent from './components/CreateEvent.svelte'
import DateTimePresenter from './components/DateTimePresenter.svelte'
import DocReminder from './components/DocReminder.svelte'
import EditEvent from './components/EditEvent.svelte'
import EventPresenter from './components/EventPresenter.svelte'
import Events from './components/Events.svelte'
import IntegrationConnect from './components/IntegrationConnect.svelte'
import PersonsPresenter from './components/PersonsPresenter.svelte'
import SaveEventReminder from './components/SaveEventReminder.svelte'
import UpdateRecInstancePopup from './components/UpdateRecInstancePopup.svelte'
import ReminderViewlet from './components/activity/ReminderViewlet.svelte'
import CalendarIntegrationIcon from './components/icons/Calendar.svelte'
import EventElement from './components/EventElement.svelte'
import CalendarEventPresenter from './components/CalendarEventPresenter.svelte'
import DayCalendar from './components/DayCalendar.svelte'
import EventParticipants from './components/EventParticipants.svelte'
import EventTimeEditor from './components/EventTimeEditor.svelte'
import EventTimeExtraButton from './components/EventTimeExtraButton.svelte'
import IntegrationConfigure from './components/IntegrationConfigure.svelte'
import EventReminders from './components/EventReminders.svelte'
import VisibilityEditor from './components/VisibilityEditor.svelte'
import CalendarSelector from './components/CalendarSelector.svelte'
import ConnectApp from './components/ConnectApp.svelte'
import calendar from './plugin'
import contact from '@hcengineering/contact'
import { deleteObjects } from '@hcengineering/view-resources'

export {
  EventElement,
  CalendarView,
  DayCalendar,
  EventParticipants,
  EventTimeEditor,
  EventTimeExtraButton,
  EventReminders,
  VisibilityEditor,
  CalendarSelector
}

export type {
  CalendarElement,
  CalendarElementRect,
  CalendarColumn,
  CalendarGrid,
  CalendarADGrid,
  CalendarADRows,
  CalendarCell
} from './types'

export * from './utils'

async function saveEventReminder (object: Doc): Promise<void> {
  showPopup(SaveEventReminder, { objectId: object._id, objectClass: object._class })
}

async function deleteRecHandler (res: any, object: ReccuringInstance): Promise<void> {
  const client = getClient()
  if (res.mode === 'current') {
    await client.addCollection(
      object._class,
      object.space,
      object.attachedTo,
      object.attachedToClass,
      object.collection,
      {
        eventId: object.eventId,
        title: object.title,
        description: object.description,
        date: object.date,
        dueDate: object.dueDate,
        allDay: object.allDay,
        participants: object.participants,
        externalParticipants: object.externalParticipants,
        originalStartTime: object.originalStartTime,
        recurringEventId: object.recurringEventId,
        reminders: object.reminders,
        location: object.location,
        isCancelled: true,
        rdate: object.rdate,
        rules: object.rules,
        exdate: object.exdate,
        visibility: object.visibility,
        access: object.access
      },
      object._id
    )
  } else if (res.mode === 'all') {
    const base = await client.findOne(calendar.class.ReccuringEvent, {
      space: object.space,
      eventId: object.recurringEventId
    })
    if (base !== undefined) {
      await client.remove(base)
    }
  } else if (res.mode === 'next') {
    await removePast(client, object)
  }
}

async function deleteRecEvent (object: ReccuringInstance): Promise<void> {
  if (object.virtual === true) {
    showPopup(UpdateRecInstancePopup, { label: calendar.string.RemoveRecEvent }, undefined, async (res) => {
      if (res !== null) {
        await deleteRecHandler(res, object)
        closePopup()
      }
    })
  } else {
    showPopup(
      contact.component.DeleteConfirmationPopup,
      {
        object,
        deleteAction: async () => {
          const objs = Array.isArray(object) ? object : [object]
          await deleteObjects(getClient(), objs).catch((err) => console.error(err))
          closePopup()
        }
      },
      undefined
    )
  }
}

async function removePast (client: TxOperations, object: ReccuringInstance): Promise<void> {
  const origin = await client.findOne(calendar.class.ReccuringEvent, {
    eventId: object.recurringEventId,
    space: object.space
  })
  if (origin !== undefined) {
    const target = object.date
    await client.update(origin, {
      rules: [{ ...origin.rules[0], endDate: target - 1 }],
      rdate: origin.rdate.filter((p) => p < target)
    })
    const instances = await client.findAll(calendar.class.ReccuringInstance, {
      eventId: origin.eventId,
      date: { $gte: target }
    })
    for (const instance of instances) {
      await client.remove(instance)
    }
  }
}

export enum CalendarMode {
  Day,
  Days,
  Week,
  Month,
  Year
}

export default async (): Promise<Resources> => ({
  component: {
    EditEvent,
    PersonsPresenter,
    CalendarView,
    Events,
    DateTimePresenter,
    DocReminder,
    EventPresenter,
    CreateEvent,
    IntegrationConnect,
    CalendarIntegrationIcon,
    CalendarEventPresenter,
    IntegrationConfigure,
    ConnectApp
  },
  activity: {
    ReminderViewlet
  },
  actionImpl: {
    SaveEventReminder: saveEventReminder,
    DeleteRecEvent: deleteRecEvent
  },
  handler: {
    DisconnectHandler: async (value: string) => {
      const url = getMetadata(calendar.metadata.CalendarServiceURL)
      const token = getMetadata(presentation.metadata.Token)
      if (url === undefined || token === undefined) return
      await fetch(concatLink(url, `/signout?value=${value}`), {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      })
    }
  }
})
