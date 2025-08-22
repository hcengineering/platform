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

import {
  AccessLevel,
  type Calendar,
  calendarId,
  type Event,
  type ExternalCalendar,
  type ReccuringEvent
} from '@hcengineering/calendar'
import core, {
  type AccountUuid,
  type Doc,
  DOMAIN_TX,
  type PersonId,
  pickPrimarySocialId,
  type Ref,
  SocialIdType,
  type Space,
  toIdMap,
  type TxUpdateDoc
} from '@hcengineering/core'
import {
  createDefaultSpace,
  type MigrateOperation,
  type MigrateUpdate,
  type MigrationClient,
  type MigrationDocumentQuery,
  type MigrationUpgradeClient,
  tryMigrate,
  tryUpgrade
} from '@hcengineering/model'
import {
  DOMAIN_SPACE,
  getAccountUuidBySocialKey,
  getSocialIdFromOldAccount,
  getSocialKeyByOldAccount
} from '@hcengineering/model-core'
import setting, { DOMAIN_SETTING, type Integration } from '@hcengineering/setting'
import contact, { type SocialIdentityRef, type SocialIdentity } from '@hcengineering/contact'
import { DOMAIN_CALENDAR, DOMAIN_EVENT } from '.'
import calendar from './plugin'

function getCalendarId (val: string): Ref<Calendar> {
  return `${val}_calendar` as Ref<Calendar>
}

async function migrateAccountsToSocialIds (client: MigrationClient): Promise<void> {
  const hierarchy = client.hierarchy
  const socialKeyByAccount = await getSocialKeyByOldAccount(client)
  const eventClasses = hierarchy.getDescendants(calendar.class.Event)

  const calendars = await client.find<Calendar>(DOMAIN_CALENDAR, {
    _class: calendar.class.Calendar
  })

  client.logger.log('processing internal calendars', {})

  for (const calendar of calendars) {
    const id = calendar._id
    if (!id.endsWith('_calendar')) {
      client.logger.error('Wrong calendar id format', { calendar: calendar._id })
      continue
    }

    const account = id.substring(0, id.length - 9)
    const socialId = socialKeyByAccount[account]
    if (socialId === undefined) {
      client.logger.error('no socialId for account', { account })
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
          // Nothing to do, in external calendar
          continue
        }

        const account = id.substring(0, id.length - 9)
        const socialId = socialKeyByAccount[account]
        if (socialId === undefined) {
          client.logger.error('no socialId for account', { account })
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
      client.logger.log('...processed events', { count: processedEvents })
    }

    client.logger.log('finished processing events', {})
  } finally {
    await eventsIterator.close()
  }
}

async function migrateSocialIdsToAccountUuids (client: MigrationClient): Promise<void> {
  const hierarchy = client.hierarchy
  const accountUuidBySocialKey = new Map<string, AccountUuid | null>()

  const eventClasses = hierarchy.getDescendants(calendar.class.Event)

  const calendars = await client.find<Calendar>(DOMAIN_CALENDAR, {
    _class: calendar.class.Calendar
  })

  client.logger.log('processing internal calendars', {})

  for (const calendar of calendars) {
    const id = calendar._id
    if (!id.endsWith('_calendar')) {
      client.logger.error('Wrong calendar id format', { calendar: calendar._id })
      continue
    }

    const socialKey = id.substring(0, id.length - 9)
    const accountUuid = await getAccountUuidBySocialKey(client, socialKey, accountUuidBySocialKey)
    if (accountUuid == null) {
      client.logger.error('no account uuid for social key', { socialKey })
      continue
    }

    await client.delete(DOMAIN_CALENDAR, calendar._id)
    await client.create(DOMAIN_CALENDAR, {
      ...calendar,
      _id: getCalendarId(accountUuid)
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
          // Nothing to do, in external calendar
          continue
        }

        const socialKey = id.substring(0, id.length - 9)
        const accountUuid = await getAccountUuidBySocialKey(client, socialKey, accountUuidBySocialKey)
        if (accountUuid == null) {
          client.logger.error('no account uuid for social key', { socialKey })
          continue
        }

        operations.push({
          filter: { _id: event._id },
          update: {
            calendar: getCalendarId(accountUuid)
          }
        })
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_EVENT, operations)
      }

      processedEvents += events.length
      client.logger.log('...processed events', { count: processedEvents })
    }

    client.logger.log('finished processing events', {})
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

async function fillUser (client: MigrationClient): Promise<void> {
  const calendars = await client.find<Calendar>(DOMAIN_CALENDAR, {})
  const events = await client.find<Event>(DOMAIN_EVENT, {
    user: { $exists: false }
  })
  const map = toIdMap(calendars)
  for (const event of events) {
    const calendar = map.get(event.calendar)
    if (calendar !== undefined) {
      await client.update(
        DOMAIN_EVENT,
        { _id: event._id },
        { user: event.createdBy !== core.account.System ? event.createdBy : calendar.createdBy }
      )
    }
  }
}

async function migrateEventUserToNewAccounts (client: MigrationClient): Promise<void> {
  const socialKeyByAccount = await getSocialKeyByOldAccount(client)
  const socialIdBySocialKey = new Map<string, PersonId | null>()
  const socialIdByOldAccount = new Map<string, PersonId | null>()

  client.logger.log('processing events user ', {})
  const iterator = await client.traverse(DOMAIN_EVENT, {
    _class: { $in: [calendar.class.Event, calendar.class.ReccuringEvent] }
  })

  try {
    let processed = 0
    while (true) {
      const docs = await iterator.next(200)
      if (docs === null || docs.length === 0) {
        break
      }

      const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

      for (const doc of docs) {
        const event = doc as Event
        const socialId = await getSocialIdFromOldAccount(
          client,
          event.user,
          socialKeyByAccount,
          socialIdBySocialKey,
          socialIdByOldAccount
        )
        const newUser = socialId ?? event.user

        if (newUser === event.user) continue

        operations.push({
          filter: { _id: doc._id },
          update: {
            user: newUser
          }
        })
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_EVENT, operations)
      }

      processed += docs.length
      client.logger.log('...processed', { count: processed })
    }
  } finally {
    await iterator.close()
  }
  client.logger.log('finished processing events user ', {})
}

async function migrateEventUserForDeleted (client: MigrationClient): Promise<void> {
  const socialKeyByAccount = await getSocialKeyByOldAccount(client)
  const deletedSocialIdByOldAccount = new Map<string, PersonId | null>()

  client.logger.log('processing events user ', {})
  const iterator = await client.traverse(DOMAIN_EVENT, {
    _class: { $in: [calendar.class.Event, calendar.class.ReccuringEvent] }
  })

  try {
    let processed = 0
    while (true) {
      const docs = await iterator.next(200)
      if (docs === null || docs.length === 0) {
        break
      }

      const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

      for (const doc of docs) {
        const event = doc as Event
        const oldAccount = event.user
        if (!deletedSocialIdByOldAccount.has(oldAccount)) {
          const socialKey = socialKeyByAccount[oldAccount]
          if (socialKey == null) continue

          const deletedIdentityTx = (
            await client.find<TxUpdateDoc<SocialIdentity>>(DOMAIN_TX, {
              _class: core.class.TxUpdateDoc,
              objectClass: contact.class.SocialIdentity,
              'operations.key': { $like: `${socialKey}#%` }
            })
          )[0]

          if (deletedIdentityTx == null) continue

          deletedSocialIdByOldAccount.set(oldAccount, deletedIdentityTx.objectId as SocialIdentityRef)
        }
        const socialId = deletedSocialIdByOldAccount.get(oldAccount)

        const newUser = socialId ?? event.user

        if (newUser === event.user) continue

        operations.push({
          filter: { _id: doc._id },
          update: {
            user: newUser
          }
        })
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_EVENT, operations)
      }

      processed += docs.length
      client.logger.log('...processed', { count: processed })
    }
  } finally {
    await iterator.close()
  }
  client.logger.log('finished processing events user ', {})
}

async function fillBlockTime (client: MigrationClient): Promise<void> {
  await client.update(DOMAIN_EVENT, { blockTime: { $exists: false }, allDay: true }, { blockTime: false })
  await client.update(DOMAIN_EVENT, { blockTime: { $exists: false } }, { blockTime: true })
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
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, calendarId, [
      {
        state: 'calendar001',
        mode: 'upgrade',
        func: async (client) => {
          await fixEventDueDate(client)
          await migrateReminders(client)
          await fillOriginalStartTime(client)
          await migrateSync(client)
        }
      },
      {
        state: 'timezone',
        mode: 'upgrade',
        func: migrateTimezone
      },
      {
        state: 'migrate_calendars',
        mode: 'upgrade',
        func: migrateCalendars
      },
      {
        state: 'move-events',
        mode: 'upgrade',
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
        mode: 'upgrade',
        func: migrateAccountsToSocialIds
      },
      {
        state: 'migrate-social-ids-to-account-uuids',
        mode: 'upgrade',
        func: migrateSocialIdsToAccountUuids
      },
      {
        state: 'fill-user-v2',
        mode: 'upgrade',
        func: fillUser
      },
      {
        state: 'fill-block-time',
        mode: 'upgrade',
        func: fillBlockTime
      },
      {
        state: 'fill_social-ids',
        mode: 'upgrade',
        func: fillSocialIdsFromIntegrations
      },
      {
        state: 'fill-calendar-user-and-access',
        mode: 'upgrade',
        func: fillCalendarUserAndAccess
      },
      {
        state: 'migrate-ev-user-to-new-accounts',
        mode: 'upgrade',
        func: migrateEventUserToNewAccounts
      },
      {
        state: 'migrate-ev-user-for-deleted',
        mode: 'upgrade',
        func: migrateEventUserForDeleted
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>, mode): Promise<void> {
    await tryUpgrade(mode, state, client, calendarId, [
      {
        state: 'default-space',
        func: (client) =>
          createDefaultSpace(client, calendar.space.Calendar, { name: 'Space for all events and calendars' })
      }
    ])
  }
}

async function fillSocialIdsFromIntegrations (client: MigrationClient): Promise<void> {
  const integrations = await client.find<Integration>(DOMAIN_SETTING, {
    _class: setting.class.Integration,
    type: calendar.integrationType.Calendar
  })
  for (const integration of integrations) {
    try {
      const val = integration.value.trim().toLowerCase()
      if (val === '') continue
      const person = await client.accountClient.findPersonBySocialId(
        integration.createdBy ?? integration.modifiedBy,
        true
      )
      if (person === undefined) continue
      await client.accountClient.addSocialIdToPerson(person, SocialIdType.GOOGLE, val, true)
    } catch {}
  }
}

async function fillCalendarUserAndAccess (client: MigrationClient): Promise<void> {
  const calendars = await client.find<Calendar>(DOMAIN_CALENDAR, { user: { $exists: false } })
  const userMap = new Map<PersonId, PersonId>()
  for (const _calendar of calendars) {
    try {
      const user = _calendar.createdBy ?? _calendar.modifiedBy
      if (user === undefined) continue
      let resUser = user
      if (!userMap.has(user)) {
        const person = await client.accountClient.findPersonBySocialId(user, true)
        if (person === undefined) continue
        const info = await client.accountClient.getPersonInfo(person)
        if (info === undefined) continue
        const primarySocialId = pickPrimarySocialId(info.socialIds)
        resUser = primarySocialId._id
      }
      userMap.set(user, resUser)

      const update: MigrateUpdate<Calendar> = {
        user: resUser,
        access: getCalendarAccess(_calendar)
      }
      if (_calendar._class === calendar.class.Calendar) {
        update.name = 'HULY'
      }

      await client.update(DOMAIN_CALENDAR, { _id: _calendar._id }, update)
    } catch (e) {
      client.logger.error('Error while filling calendar user and access', { calendar: _calendar._id, error: e })
      continue
    }
  }
}

function getCalendarAccess (_calendar: Calendar): AccessLevel {
  if (_calendar._class === calendar.class.Calendar) {
    return AccessLevel.Owner
  }
  const ext = _calendar as ExternalCalendar
  if (ext.externalUser === ext.externalId) return AccessLevel.Owner
  if (
    ext.externalId === 'addressbook#contacts@group.v.calendar.google.com' ||
    ext.externalId.includes('holiday@group.v.calendar.google.com')
  ) {
    return AccessLevel.Reader
  }
  return AccessLevel.Writer
}
