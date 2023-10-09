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

import { Calendar, Event, ReccuringEvent } from '@hcengineering/calendar'
import contact from '@hcengineering/contact'
import core, { Ref, TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import { DOMAIN_SPACE } from '@hcengineering/model-core'
import { DOMAIN_SETTING } from '@hcengineering/model-setting'
import { Integration } from '@hcengineering/setting'
import { DOMAIN_CALENDAR } from '.'
import calendar from './plugin'

async function migrateCalendars (tx: TxOperations): Promise<void> {
  const existCalendars = new Set((await tx.findAll(calendar.class.Calendar, {})).map((p) => p._id))
  const users = await tx.findAll(contact.class.PersonAccount, {})
  for (const user of users) {
    if (!existCalendars.has(`${user._id}_calendar` as Ref<Calendar>)) {
      await tx.createDoc(
        calendar.class.Calendar,
        core.space.Space,
        {
          name: user.email,
          description: '',
          archived: false,
          private: false,
          members: [user._id],
          visibility: 'public'
        },
        `${user._id}_calendar` as Ref<Calendar>,
        undefined,
        user._id
      )
    }
  }
  const events = await tx.findAll(calendar.class.Event, { space: calendar.space.PersonalEvents })
  for (const event of events) {
    await tx.update(event, { space: (event.createdBy ?? event.modifiedBy) as string as Ref<Calendar> })
  }
  const space = await tx.findOne(calendar.class.Calendar, { _id: calendar.space.PersonalEvents })
  if (space !== undefined) {
    await tx.remove(space)
  }

  const calendars = await tx.findAll(calendar.class.Calendar, { visibility: { $exists: false } })
  for (const calendar of calendars) {
    await tx.update(calendar, { visibility: 'public' })
  }
}

async function migrateExternalCalendars (client: MigrationClient): Promise<void> {
  const calendars = await client.find<Calendar>(DOMAIN_SPACE, { _class: calendar.class.Calendar })
  const integrations = await client.find<Integration>(DOMAIN_SETTING, {
    type: calendar.integrationType.Calendar,
    disabled: false,
    value: { $ne: '' }
  })
  for (const val of calendars) {
    if (val._id.endsWith('_calendar')) continue
    const integration = integrations.find((i) => i.createdBy === val.createdBy)
    await client.update(
      DOMAIN_SPACE,
      { _id: val._id },
      {
        _class: calendar.class.ExternalCalendar,
        externalId: val._id,
        externalUser: integration?.value ?? '',
        default: val._id === integration?.value
      }
    )
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

export const calendarOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await fixEventDueDate(client)
    await migrateReminders(client)
    await fillOriginalStartTime(client)
    await migrateSync(client)
    await migrateExternalCalendars(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await migrateCalendars(tx)
  }
}
