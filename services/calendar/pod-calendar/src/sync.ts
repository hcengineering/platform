//
// Copyright © 2025 Hardcore Engineering Inc.
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
  AttachedData,
  Data,
  Doc,
  DocData,
  DocumentUpdate,
  generateId,
  MeasureContext,
  Mixin,
  Ref,
  SocialIdType,
  TxOperations,
  TxProcessor
} from '@hcengineering/core'
import { getCalendarsSyncHistory, getEventHistory, setCalendarsSyncHistory, setEventHistory } from './kvsUtils'
import { GoogleEmail, Token, User } from './types'
import { calendar_v3 } from 'googleapis'
import { getRateLimitter, RateLimiter } from './rateLimiter'
import calendar, {
  Calendar,
  Event,
  ExternalCalendar,
  ReccuringEvent,
  ReccuringInstance,
  Visibility
} from '@hcengineering/calendar'
import { parseRecurrenceStrings } from './utils'
import { htmlToMarkup } from '@hcengineering/text'
import { deepEqual } from 'fast-equals'
import contact, { Contact, getPersonRefsBySocialIds, Person } from '@hcengineering/contact'
import setting from '@hcengineering/setting'
import { AccountClient } from '@hcengineering/account-client'
import { WatchController } from './watch'

const locks = new Map<string, Promise<void>>()

export async function lock (key: string): Promise<() => void> {
  // Wait for any existing lock to be released
  const currentLock = locks.get(key)
  if (currentLock != null) {
    await currentLock
  }

  // Create a new lock
  let releaseFn!: () => void
  const newLock = new Promise<void>((resolve) => {
    releaseFn = resolve
  })

  // Store the lock
  locks.set(key, newLock)

  // Return the release function
  return () => {
    if (locks.get(key) === newLock) {
      locks.delete(key)
    }
    releaseFn()
  }
}

export class IncomingSyncManager {
  private readonly rateLimiter: RateLimiter
  private calendars: ExternalCalendar[] = []
  private readonly participants = new Map<string, Ref<Person>>()
  private constructor (
    private readonly ctx: MeasureContext,
    private readonly accountClient: AccountClient,
    private readonly client: TxOperations,
    private readonly user: User,
    private readonly email: GoogleEmail,
    private readonly googleClient: calendar_v3.Calendar
  ) {
    this.rateLimiter = getRateLimitter(this.email)
  }

  static async sync (
    ctx: MeasureContext,
    accountClient: AccountClient,
    client: TxOperations,
    user: User,
    email: GoogleEmail,
    googleClient: calendar_v3.Calendar
  ): Promise<void> {
    const syncManager = new IncomingSyncManager(ctx, accountClient, client, user, email, googleClient)
    const mutex = await lock(`${user.workspace}:${user.userId}:${email}`)
    try {
      await syncManager.startSync()
    } finally {
      mutex()
    }
  }

  private async fillParticipants (): Promise<void> {
    const personsBySocialId = await getPersonRefsBySocialIds(this.client)
    const emailSocialIds = await this.client.findAll(contact.class.SocialIdentity, { type: SocialIdType.EMAIL })
    const emails = await this.client.findAll(contact.class.Channel, { provider: contact.channelProvider.Email })
    const integrations = await this.client.findAll(setting.class.Integration, {
      type: calendar.integrationType.Calendar
    })
    this.participants.clear()

    for (const sID of emailSocialIds) {
      if (sID.value === '') continue
      const pers = personsBySocialId[sID._id]
      if (pers != null) {
        this.participants.set(sID.value, pers)
      }
    }

    for (const channel of emails) {
      if (channel.value === '') continue
      const pers = channel.attachedTo as Ref<Person>
      if (this.participants.has(channel.value)) continue
      this.participants.set(channel.value, pers)
    }

    for (const integration of integrations) {
      if (integration.value === '') continue
      const pers = personsBySocialId[integration.createdBy ?? integration.modifiedBy]
      if (pers != null) {
        this.participants.set(integration.value, pers)
      }
    }
  }

  private async getParticipantsMap (): Promise<Map<string, Ref<Person>>> {
    if (this.participants.size === 0) {
      await this.fillParticipants()
    }
    return this.participants
  }

  static async push (
    ctx: MeasureContext,
    accountClient: AccountClient,
    client: TxOperations,
    user: Token,
    googleClient: calendar_v3.Calendar,
    calendarId: string | null
  ): Promise<void> {
    const syncManager = new IncomingSyncManager(ctx, accountClient, client, user, user.email, googleClient)
    const mutex = await lock(`${user.workspace}:${user.userId}:${user.email}`)
    try {
      await syncManager.getMyCalendars()
      if (calendarId !== null) {
        await syncManager.sync(calendarId)
      } else {
        await syncManager.syncCalendars()
      }
    } finally {
      mutex()
    }
  }

  private async sync (calendarId: string): Promise<void> {
    await this.syncEvents(calendarId)
    const watchController = WatchController.get(this.accountClient)
    await this.rateLimiter.take(1)
    await watchController.addWatch(this.user, this.email, calendarId, this.googleClient)
  }

  private async startSync (): Promise<void> {
    try {
      await this.getMyCalendars()
      await this.syncCalendars()
      await this.getMyCalendars()
      for (const calendar of this.calendars) {
        if (calendar.externalId !== undefined) {
          await this.sync(calendar.externalId)
        }
      }
    } catch (err) {
      this.ctx.error('Start sync error', { workspace: this.user.workspace, user: this.user.userId, err })
    }
  }

  private async syncEvents (calendarId: string): Promise<void> {
    const history = await getEventHistory(this.user, calendarId)
    await this.eventsSync(calendarId, history)
  }

  private async eventsSync (calendarId: string, syncToken?: string, pageToken?: string): Promise<void> {
    try {
      await this.rateLimiter.take(1)
      const res = await this.googleClient.events.list({
        calendarId,
        syncToken,
        pageToken,
        showDeleted: syncToken != null
      })
      if (res.status === 410) {
        await this.eventsSync(calendarId)
        return
      }
      const nextPageToken = res.data.nextPageToken
      for (const event of res.data.items ?? []) {
        try {
          await this.syncEvent(calendarId, event, res.data.accessRole ?? 'reader')
        } catch (err) {
          this.ctx.error('save event error', { workspace: this.user.workspace, user: this.user.userId, err })
        }
      }
      if (nextPageToken != null) {
        await this.eventsSync(calendarId, syncToken, nextPageToken)
      }
      if (res.data.nextSyncToken != null) {
        await setEventHistory(this.user, calendarId, res.data.nextSyncToken)
      }
      // if resync
    } catch (err: any) {
      if (err?.response?.status === 410) {
        await this.eventsSync(calendarId)
        return
      }
      this.ctx.error('Event sync error', { workspace: this.user.workspace, user: this.user.userId, err })
    }
  }

  private getEventCalendar (calendarId: string, event: calendar_v3.Schema$Event): ExternalCalendar | undefined {
    const _calendar =
      this.calendars.find((p) => p.externalId === event.organizer?.email) ??
      this.calendars.find((p) => p.externalId === calendarId) ??
      this.calendars[0]
    return _calendar
  }

  async syncEvent (calendarId: string, event: calendar_v3.Schema$Event, accessRole: string): Promise<void> {
    if (event.id != null) {
      const _calendar = this.getEventCalendar(calendarId, event)
      if (_calendar !== undefined) {
        const exists = (await this.client.findOne(calendar.class.Event, {
          eventId: event.id,
          calendar: _calendar._id
        })) as Event | undefined
        if (exists === undefined) {
          await this.saveExtEvent(event, accessRole, _calendar)
        } else {
          await this.updateExtEvent(event, exists)
        }
      }
    }
  }

  private async updateExtEvent (event: calendar_v3.Schema$Event, current: Event): Promise<void> {
    if (event.status === 'cancelled' && current._class !== calendar.class.ReccuringInstance) {
      await this.client.remove(current)
      return
    }
    const data: Partial<AttachedData<Event>> = await this.parseUpdateData(event)
    if (event.recurringEventId != null) {
      const diff = this.getDiff<ReccuringInstance>(
        {
          ...data,
          recurringEventId: event.recurringEventId as Ref<ReccuringEvent>,
          originalStartTime: parseDate(event.originalStartTime),
          isCancelled: event.status === 'cancelled'
        },
        current as ReccuringInstance
      )
      if (Object.keys(diff).length > 0) {
        await this.client.update(current, diff)
      }
    } else {
      if (event.recurrence != null) {
        const parseRule = parseRecurrenceStrings(event.recurrence)
        const diff = this.getDiff<ReccuringEvent>(
          {
            ...data,
            rules: parseRule.rules,
            exdate: parseRule.exdate,
            rdate: parseRule.rdate
          },
          current as ReccuringEvent
        )
        if (Object.keys(diff).length > 0) {
          await this.client.update(current, diff)
        }
      } else {
        const diff = this.getDiff(data, current)
        if (Object.keys(diff).length > 0) {
          await this.client.update(current, diff)
        }
      }
    }
    await this.updateMixins(event, current)
  }

  private async updateMixins (event: calendar_v3.Schema$Event, current: Event): Promise<void> {
    const mixins = this.parseMixins(event)
    if (mixins !== undefined) {
      for (const mixin in mixins) {
        const attr = mixins[mixin]
        if (typeof attr === 'object' && Object.keys(attr).length > 0) {
          if (this.client.getHierarchy().hasMixin(current, mixin as Ref<Mixin<Doc>>)) {
            const diff = this.getDiff(attr, this.client.getHierarchy().as(current, mixin as Ref<Mixin<Doc>>))
            if (Object.keys(diff).length > 0) {
              await this.client.updateMixin(
                current._id,
                current._class,
                calendar.space.Calendar,
                mixin as Ref<Mixin<Doc>>,
                diff
              )
            }
          } else {
            await this.client.createMixin(
              current._id,
              current._class,
              calendar.space.Calendar,
              mixin as Ref<Mixin<Doc>>,
              attr
            )
          }
        }
      }
    }
  }

  private getAccess (
    event: calendar_v3.Schema$Event,
    accessRole: string
  ): 'freeBusyReader' | 'reader' | 'writer' | 'owner' {
    if (accessRole !== 'owner') {
      return accessRole as 'freeBusyReader' | 'reader' | 'writer'
    }
    if (event.creator?.self === true) {
      return 'owner'
    } else {
      return 'reader'
    }
  }

  private async parseData (
    event: calendar_v3.Schema$Event,
    accessRole: string,
    _calendar: Ref<Calendar>
  ): Promise<AttachedData<Event>> {
    const participants = await this.getParticipants(event)
    const res: AttachedData<Event> = {
      date: parseDate(event.start),
      dueDate: parseDate(event.end),
      allDay: event.start?.date != null,
      description: htmlToMarkup(event.description ?? ''),
      title: event.summary ?? '',
      location: event.location ?? undefined,
      participants: participants[0],
      eventId: event.id ?? '',
      calendar: _calendar,
      access: this.getAccess(event, accessRole),
      timeZone: event.start?.timeZone ?? event.end?.timeZone ?? 'Etc/GMT',
      user: this.user.userId
    }
    if (participants[1].length > 0) {
      res.externalParticipants = participants[1]
    }
    if (event.visibility != null && event.visibility !== 'default') {
      res.visibility =
        event.visibility === 'public'
          ? 'public'
          : (event.extendedProperties?.private?.visibility as Visibility) ?? 'private'
    }
    return res
  }

  private getParticipant (
    map: Map<string, Ref<Person>>,
    value: string
  ): {
      contact?: Ref<Contact>
      extra?: string
    } {
    const contact = map.get(value)
    if (contact !== undefined) {
      return {
        contact
      }
    }
    return {
      extra: value
    }
  }

  private async getParticipants (event: calendar_v3.Schema$Event): Promise<[Ref<Contact>[], string[]]> {
    const map = await this.getParticipantsMap()
    const contacts = new Set<Ref<Contact>>()
    const extra = new Set<string>()
    if (event.creator?.email != null) {
      const res = this.getParticipant(map, event.creator.email)
      if (res.contact !== undefined) {
        contacts.add(res.contact)
      }
      if (res.extra !== undefined) {
        extra.add(res.extra)
      }
    }
    for (const attendee of event.attendees ?? []) {
      if (attendee.email != null) {
        const res = this.getParticipant(map, attendee.email)
        if (res.contact !== undefined) {
          contacts.add(res.contact)
        }
        if (res.extra !== undefined) {
          extra.add(res.extra)
        }
      }
    }
    return [Array.from(contacts), Array.from(extra)]
  }

  private getDiff<T extends Doc>(data: Partial<DocData<T>>, current: T): Partial<DocData<T>> {
    const res = {}
    for (const key in data) {
      if (!deepEqual((data as any)[key], (current as any)[key])) {
        ;(res as any)[key] = (data as any)[key]
      }
    }
    return res
  }

  private async parseUpdateData (event: calendar_v3.Schema$Event): Promise<Partial<AttachedData<Event>>> {
    const res: Partial<AttachedData<Event>> = {}
    if (event.attendees !== undefined) {
      const participants = await this.getParticipants(event)
      res.participants = participants[0]
      if (participants[1].length > 0) {
        res.externalParticipants = participants[1]
      }
    }
    if (event.location != null) {
      res.location = event.location
    }
    if (event.description != null) {
      res.description = htmlToMarkup(event.description)
    }
    if (event.summary != null) {
      res.title = event.summary
    }
    if (event.start != null) {
      res.date = parseDate(event.start)
    }
    if (event.end != null) {
      res.dueDate = parseDate(event.end)
    }
    if (event.visibility != null && event.visibility !== 'default') {
      res.visibility =
        event.visibility === 'public'
          ? 'public'
          : (event.extendedProperties?.private?.visibility as Visibility) ?? 'private'
    }

    return res
  }

  private async saveExtEvent (
    event: calendar_v3.Schema$Event,
    accessRole: string,
    _calendar: ExternalCalendar
  ): Promise<void> {
    const data: AttachedData<Event> = await this.parseData(event, accessRole, _calendar._id)
    if (event.recurringEventId != null) {
      const parseRule = parseRecurrenceStrings(event.recurrence ?? [])
      const id = await this.client.addCollection(
        calendar.class.ReccuringInstance,
        calendar.space.Calendar,
        calendar.ids.NoAttached,
        calendar.class.Event,
        'events',
        {
          ...data,
          recurringEventId: event.recurringEventId,
          originalStartTime: parseDate(event.originalStartTime),
          isCancelled: event.status === 'cancelled',
          rules: parseRule.rules,
          exdate: parseRule.exdate,
          rdate: parseRule.rdate,
          timeZone: event.start?.timeZone ?? event.end?.timeZone ?? 'Etc/GMT'
        }
      )
      await this.saveMixins(event, id)
    } else if (event.status !== 'cancelled') {
      if (event.recurrence != null) {
        const parseRule = parseRecurrenceStrings(event.recurrence)
        const id = await this.client.addCollection(
          calendar.class.ReccuringEvent,
          calendar.space.Calendar,
          calendar.ids.NoAttached,
          calendar.class.Event,
          'events',
          {
            ...data,
            rules: parseRule.rules,
            exdate: parseRule.exdate,
            rdate: parseRule.rdate,
            originalStartTime: data.date,
            timeZone: event.start?.timeZone ?? event.end?.timeZone ?? 'Etc/GMT'
          }
        )
        await this.saveMixins(event, id)
      } else {
        const id = await this.client.addCollection(
          calendar.class.Event,
          calendar.space.Calendar,
          calendar.ids.NoAttached,
          calendar.class.Event,
          'events',
          data
        )
        await this.saveMixins(event, id)
      }
    }
  }

  private async saveMixins (event: calendar_v3.Schema$Event, _id: Ref<Event>): Promise<void> {
    const mixins = this.parseMixins(event)
    if (mixins !== undefined) {
      for (const mixin in mixins) {
        const attr = mixins[mixin]
        if (typeof attr === 'object' && Object.keys(attr).length > 0) {
          await this.client.createMixin(
            _id,
            calendar.class.Event,
            calendar.space.Calendar,
            mixin as Ref<Mixin<Doc>>,
            attr
          )
        }
      }
    }
  }

  private parseMixins (event: calendar_v3.Schema$Event): Record<string, any> | undefined {
    if (event.extendedProperties?.shared?.mixins !== undefined) {
      const mixins = JSON.parse(event.extendedProperties.shared.mixins)
      return mixins
    }
  }

  private async getMyCalendars (): Promise<void> {
    this.calendars = await this.client.findAll(calendar.class.ExternalCalendar, {
      createdBy: this.user.userId,
      hidden: false
    })
  }

  async syncCalendars (): Promise<void> {
    const history = await getCalendarsSyncHistory(this.user)
    await this.calendarSync(history)
    const watchController = WatchController.get(this.accountClient)
    await this.rateLimiter.take(1)
    await watchController.addWatch(this.user, this.email, null, this.googleClient)
  }

  private async calendarSync (sync?: string): Promise<void> {
    let syncToken = sync
    let pageToken: string | undefined
    while (true) {
      try {
        await this.rateLimiter.take(1)
        const res = await this.googleClient.calendarList.list({
          syncToken,
          pageToken
        })
        if (res.status === 410) {
          syncToken = undefined
          pageToken = undefined
          continue
        }
        const nextPageToken = res.data.nextPageToken
        for (const calendar of res.data.items ?? []) {
          try {
            await this.syncCalendar(calendar)
          } catch (err) {
            this.ctx.error('save calendars error', { calendar: JSON.stringify(calendar), err })
          }
        }
        if (nextPageToken != null) {
          pageToken = nextPageToken
          continue
        }
        if (res.data.nextSyncToken != null) {
          await setCalendarsSyncHistory(this.user, res.data.nextSyncToken)
        }
        return
      } catch (err: any) {
        this.ctx.error('Calendars sync error', { workspace: this.user.workspace, user: this.user.userId, err })
        if (err?.response?.status === 410) {
          syncToken = undefined
          pageToken = undefined
        }
      }
    }
  }

  private async syncCalendar (val: calendar_v3.Schema$CalendarListEntry): Promise<void> {
    if (val.id != null) {
      const exists = this.calendars.find((p) => p.externalId === val.id && p.externalUser === this.email)
      if (exists === undefined) {
        const data: Data<ExternalCalendar> = {
          name: val.summary ?? '',
          visibility: 'freeBusy',
          hidden: false,
          externalId: val.id,
          externalUser: this.email,
          default: false
        }
        if (val.primary === true) {
          const primaryExists = this.calendars.length > 0
          if (primaryExists === undefined) {
            data.default = true
          }
        }
        const _id = generateId<ExternalCalendar>()
        const tx = this.client.txFactory.createTxCreateDoc<ExternalCalendar>(
          calendar.class.ExternalCalendar,
          calendar.space.Calendar,
          data,
          _id,
          undefined,
          this.user.userId
        )
        await this.client.tx(tx)
        this.calendars.push(TxProcessor.createDoc2Doc(tx))
      } else {
        const update: DocumentUpdate<ExternalCalendar> = {}
        if (exists.name !== val.summary) {
          update.name = val.summary ?? exists.name
        }
        if (Object.keys(update).length > 0) {
          await this.client.update(exists, update)
        }
      }
    }
  }
}

function parseDate (date: calendar_v3.Schema$EventDateTime | undefined): number {
  if (date?.dateTime != null) {
    return new Date(date.dateTime).getTime()
  }
  if (date?.date != null) {
    return new Date(date.date).getTime()
  }
  return 0
}
