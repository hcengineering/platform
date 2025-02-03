//
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
//

import { type Calendar, calendarId, type Event, type ReccuringEvent } from '@hcengineering/calendar'
import { type Doc, MeasureMetricsContext, type PersonId, type Ref, type Space } from '@hcengineering/core'
import {
  createDefaultSpace,
  type MigrateUpdate,
  type MigrationDocumentQuery,
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import { DOMAIN_SPACE, getSocialIdByOldAccount } from '@hcengineering/model-core'
import { DOMAIN_CALENDAR, DOMAIN_EVENT } from '.'
import calendar from './plugin'

function getCalendarId (socialString: PersonId): Ref<Calendar> {
  return `${socialString}_calendar` as Ref<Calendar>
}

async function migrateAccountsToSocialIds (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('calendar migrateAccountsToSocialIds', {})
  const hierarchy = client.hierarchy
  const socialIdByAccount = await getSocialIdByOldAccount(client)
  const calClasses = hierarchy.getDescendants(calendar.class.Calendar)
  const eventClasses = hierarchy.getDescendants(calendar.class.Event)

  const calendars = await client.find<Calendar>(DOMAIN_CALENDAR, {
    _class: { $in: calClasses }
  })

  ctx.info('processing', { calClasses })

  for (const calendar of calendars) {
    const id = calendar._id
    if (!id.endsWith('_calendar')) {
      ctx.warn('Wrong calendar id format', { calendar: calendar._id })
      continue
    }

    const account = id.substring(0, id.length - 9)
    const socialId = socialIdByAccount[account]
    if (socialId === undefined) {
      ctx.warn('no socialId for account', { account })
      continue
    }

    await client.delete(DOMAIN_CALENDAR, calendar._id)
    await client.create(DOMAIN_CALENDAR, {
      ...calendar,
      _id: getCalendarId(socialId)
    })
  }

  let processedEvents = 0
  const eventsIterator = await client.traverse<Event>(DOMAIN_EVENT, {
    _class: { $in: eventClasses }
  })

  try {
    while (true) {
      const events = await eventsIterator.next(200)
      if (events === null || events.length === 0) {
        break
      }

      const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

      for (const event of events) {
        const id = event.calendar
        if (!id.endsWith('_calendar')) {
          ctx.warn('Wrong calendar id format', { calendar: event.calendar })
          continue
        }

        const account = id.substring(0, id.length - 9)
        const socialId = socialIdByAccount[account]
        if (socialId === undefined) {
          ctx.warn('no socialId for account', { account })
          continue
        }

        operations.push({
          filter: { _id: event._id },
          update: {
            calendar: getCalendarId(socialId)
          }
        })
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_EVENT, operations)
      }

      processedEvents += events.length
      ctx.info('...processed events', { count: processedEvents })
    }

    ctx.info('finished processing events')
  } finally {
    await eventsIterator.close()
  }
}

async function migrateCalendars (client: MigrationClient): Promise<void> {
  await client.move(
    DOMAIN_SPACE,
    { _class: { $in: [calendar.class.Calendar, calendar.class.ExternalCalendar] } },
    DOMAIN_CALENDAR
  )
  await client.update(
    DOMAIN_CALENDAR,
    { _class: { $in: [calendar.class.Calendar, calendar.class.ExternalCalendar] } },
    { space: calendar.space.Calendar }
  )
  await client.update(
    DOMAIN_CALENDAR,
    { _class: { $in: [calendar.class.Calendar, calendar.class.ExternalCalendar] }, archived: true },
    { hidden: true }
  )
  await client.update(
    DOMAIN_CALENDAR,
    { _class: { $in: [calendar.class.Calendar, calendar.class.ExternalCalendar] }, archived: false },
    { hidden: false }
  )
  await client.update(
    DOMAIN_CALENDAR,
    { _class: { $in: [calendar.class.Calendar, calendar.class.ExternalCalendar] } },
    { $unset: { type: true, private: true, members: true, archived: true } }
  )

  const events = await client.find<Event>(DOMAIN_CALENDAR, {
    space: { $ne: calendar.space.Calendar }
  })
  const eventByCalendar = new Map<Ref<Space>, Ref<Event>[]>()
  for (const event of events) {
    const events = eventByCalendar.get(event.space) ?? []
    events.push(event._id)
    eventByCalendar.set(event.space, events)
  }
  for (const [_calendar, ids] of eventByCalendar) {
    await client.update(DOMAIN_CALENDAR, { _id: { $in: ids } }, { space: calendar.space.Calendar, calendar: _calendar })
  }
}

async function fixEventDueDate (client: MigrationClient): Promise<void> {
  const events = await client.find<Event>(DOMAIN_CALENDAR, {
    _class: calendar.class.Event,
    dueDate: { $exists: false }
  })
  for (const event of events) {
    await client.update(DOMAIN_CALENDAR, { _id: event._id }, { dueDate: event.date })
  }
}

async function migrateReminders (client: MigrationClient): Promise<void> {
  const events = await client.find(DOMAIN_CALENDAR, { 'calendar:mixin:Reminder': { $exists: true } })
  for (const event of events) {
    const shift = (event as any)['calendar:mixin:Reminder'].shift
    await client.update(DOMAIN_CALENDAR, { _id: event._id }, { reminders: [shift] })
    await client.update(DOMAIN_CALENDAR, { _id: event._id }, { $unset: { 'calendar:mixin:Reminder': true } })
  }
}

async function fillOriginalStartTime (client: MigrationClient): Promise<void> {
  const events = await client.find<ReccuringEvent>(DOMAIN_CALENDAR, {
    _class: calendar.class.ReccuringEvent,
    originalStartTime: { $exists: false }
  })
  for (const event of events) {
    await client.update(DOMAIN_CALENDAR, { _id: event._id }, { originalStartTime: event.date })
  }
}

async function migrateSync (client: MigrationClient): Promise<void> {
  await client.update(DOMAIN_SPACE, { _class: calendar.class.Calendar, sync: false }, { archived: true })
  await client.update(
    DOMAIN_SPACE,
    { _class: calendar.class.Calendar, sync: { $exists: true } },
    { $unset: { sync: true } }
  )
}

async function migrateTimezone (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_CALENDAR,
    {
      _class: { $in: [calendar.class.ReccuringEvent, calendar.class.ReccuringInstance] },
      timeZone: { $exists: false }
    },
    { timeZone: 'Etc/GMT' }
  )
}

export const calendarOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, calendarId, [
      {
        state: 'calendar001',
        func: async (client) => {
          await fixEventDueDate(client)
          await migrateReminders(client)
          await fillOriginalStartTime(client)
          await migrateSync(client)
        }
      },
      {
        state: 'timezone',
        func: migrateTimezone
      },
      {
        state: 'migrate_calendars',
        func: migrateCalendars
      },
      {
        state: 'move-events',
        func: async (client) => {
          await client.move(
            DOMAIN_CALENDAR,
            { _class: { $in: client.hierarchy.getDescendants(calendar.class.Event) } },
            DOMAIN_EVENT
          )
        }
      },
      {
        state: 'accounts-to-social-ids',
        func: migrateAccountsToSocialIds
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {
    await tryUpgrade(state, client, calendarId, [
      {
        state: 'default-space',
        func: (client) =>
          createDefaultSpace(client, calendar.space.Calendar, { name: 'Space for all events and calendars' })
      }
    ])
  }
}
