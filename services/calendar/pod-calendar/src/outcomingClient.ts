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

import { AccountClient } from '@hcengineering/account-client'
import calendar, {
  Event,
  ExternalCalendar,
  ReccuringEvent,
  ReccuringInstance,
  calendarIntegrationKind
} from '@hcengineering/calendar'
import contact, { Contact } from '@hcengineering/contact'
import core, { MeasureContext, Ref, SocialIdType, TxOperations, WorkspaceUuid } from '@hcengineering/core'
import { areEqualMarkups, htmlToMarkup, isEmptyMarkup, jsonToHTML, markupToJSON } from '@hcengineering/text'
import { deepEqual } from 'fast-equals'
import { OAuth2Client } from 'google-auth-library'
import { calendar_v3 } from 'googleapis'
import { getClient } from './client'
import { setSyncHistory } from './kvsUtils'
import { lock, synced } from './mutex'
import { getRateLimitter, RateLimiter } from './rateLimiter'
import { Token } from './types'
import {
  convertDate,
  encodeReccuring,
  getGoogleClient,
  getMixinFields,
  getTimezone,
  parseEventDate,
  parseRecurrenceStrings,
  removeIntegrationSecret,
  removeUserByEmail,
  setCredentials
} from './utils'

export class OutcomingClient {
  private readonly calendar: calendar_v3.Calendar
  private readonly oAuth2Client: OAuth2Client
  readonly rateLimiter: RateLimiter

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly workspace: WorkspaceUuid,
    private readonly client: TxOperations,
    private readonly user: Token
  ) {
    this.rateLimiter = getRateLimitter(this.user.email)
    const res = getGoogleClient()
    this.calendar = res.google
    this.oAuth2Client = res.auth
  }

  async push (event: Event, type: 'create' | 'update' | 'delete'): Promise<void> {
    const calendar = await this.getCalendar(event)
    if (calendar === undefined) return
    this.ctx.info('Push outcoming event', {
      calendarId: calendar.externalId,
      eventId: event.eventId,
      user: this.user.email,
      workspace: this.workspace,
      event: event._id,
      type
    })
    if (type === 'delete') {
      await this.remove(event.eventId, calendar.externalId)
    } else if (type === 'update') {
      if (!(await this.update(event, calendar))) {
        await this.create(event, calendar)
      }
    } else if (type === 'create') {
      await this.create(event, calendar)
    }
    if (synced.has(this.user.workspace)) {
      await setSyncHistory(this.workspace, Date.now())
    }
  }

  private async convertBody (event: Event): Promise<calendar_v3.Schema$Event> {
    const res: calendar_v3.Schema$Event = {
      start: convertDate(event.date, event.allDay, getTimezone(event)),
      end: convertDate(event.dueDate, event.allDay, getTimezone(event)),
      id: event.eventId,
      description: jsonToHTML(markupToJSON(event.description)),
      summary: event.title
    }
    if (event.location != null) {
      res.location = event.location
    }
    if (event.visibility !== undefined) {
      res.visibility = event.visibility === 'public' ? 'public' : 'private'
    }
    if (event.visibility === 'freeBusy') {
      res.extendedProperties = {
        private: {
          visibility: 'freeBusy'
        }
      }
    }
    const mixin = getMixinFields(this.client.getHierarchy(), event)
    if (Object.keys(mixin).length > 0) {
      res.extendedProperties = {
        ...res.extendedProperties,
        shared: {
          ...res.extendedProperties?.shared,
          mixin: JSON.stringify(mixin)
        }
      }
    }
    if (event.reminders !== undefined) {
      res.reminders = {
        useDefault: false,
        overrides: event.reminders.map((p) => {
          return { method: 'popup', minutes: p / 60 / 1000 }
        })
      }
    }
    const attendees = await this.getAttendees(event)
    if (attendees.length > 0) {
      res.attendees = attendees.map((p) => {
        if (p === this.user.email) {
          return { email: p, responseStatus: 'accepted', self: true }
        }
        return { email: p }
      })
    }
    if (event._class === calendar.class.ReccuringInstance) {
      const instance = event as ReccuringInstance
      res.recurringEventId = instance.recurringEventId
      res.originalStartTime = convertDate(instance.originalStartTime ?? event.date, event.allDay, instance.timeZone)
      res.status = instance.isCancelled === true ? 'cancelled' : undefined
    }
    if (event._class === calendar.class.ReccuringEvent) {
      const rec = event as ReccuringEvent
      res.recurrence = encodeReccuring(rec.rules, rec.rdate, rec.exdate)
    }
    return res
  }

  private async create (event: Event, calendar: ExternalCalendar): Promise<void> {
    const body = await this.convertBody(event)
    const calendarId = calendar.externalId
    if (calendarId !== undefined) {
      await this.rateLimiter.take(1)
      await this.calendar.events.insert({
        calendarId,
        requestBody: body
      })
    }
  }

  private async update (event: Event, space: ExternalCalendar): Promise<boolean> {
    const calendarId = space?.externalId
    if (calendarId !== undefined) {
      try {
        await this.rateLimiter.take(1)
        const current = await this.calendar.events.get({ calendarId, eventId: event.eventId })
        if (current !== undefined && current.data.status !== 'cancelled') {
          this.ctx.info('Update event', {
            calendarId,
            eventId: event.eventId,
            user: this.user.email,
            workspace: this.workspace,
            event: event._id,
            current: current.data.id
          })
          const ev = await this.applyUpdate(current.data, event)
          if (ev === undefined) {
            this.ctx.info('No changes to update', {
              calendarId,
              eventId: event.eventId,
              user: this.user.email,
              workspace: this.workspace,
              event: event._id
            })
            return true
          }
          await this.rateLimiter.take(1)
          await this.calendar.events.update({
            calendarId,
            eventId: event.eventId,
            requestBody: ev
          })
        }
        return true
      } catch (err: any) {
        if (err.code === 404) {
          return false
        } else {
          throw err
        }
      }
    }
    return false
  }

  private async applyUpdate (
    event: calendar_v3.Schema$Event,
    current: Event
  ): Promise<calendar_v3.Schema$Event | undefined> {
    let res: boolean = false
    if (current.title !== event.summary) {
      this.ctx.info('Update event diff: title', {
        calendarId: current.calendar,
        eventId: current.eventId,
        user: this.user.email,
        workspace: this.workspace,
        event: current._id,
        prev: event.summary,
        current: current.title
      })
      event.summary = current.title
      res = true
    }
    if (current.visibility !== undefined) {
      const newVisibility = current.visibility === 'public' ? 'public' : 'private'
      if (newVisibility !== event.visibility) {
        this.ctx.info('Update event diff: visibility', {
          calendarId: current.calendar,
          eventId: current.eventId,
          user: this.user.email,
          workspace: this.workspace,
          event: current._id,
          prev: event.visibility,
          current: newVisibility
        })
        event.visibility = newVisibility
        res = true
      }
      if (current.visibility === 'freeBusy' && event?.extendedProperties?.private?.visibility !== 'freeBusy') {
        event.extendedProperties = {
          ...event.extendedProperties,
          private: {
            visibility: 'freeBusy'
          }
        }
        res = true
      }
    }
    const description = jsonToHTML(markupToJSON(current.description))
    const originMarkup = htmlToMarkup(event.description ?? '')
    if (
      isEmptyMarkup(description) !== isEmptyMarkup(originMarkup) &&
      !areEqualMarkups(current.description, originMarkup)
    ) {
      res = true
      this.ctx.info('Update event diff: description', {
        calendarId: current.calendar,
        eventId: current.eventId,
        user: this.user.email,
        workspace: this.workspace,
        event: current._id,
        prev: event.description,
        current: description
      })
      event.description = description
    }
    if (current.location !== event.location) {
      res = true
      this.ctx.info('Update event diff: location', {
        calendarId: current.calendar,
        eventId: current.eventId,
        user: this.user.email,
        workspace: this.workspace,
        event: current._id,
        prev: event.location,
        current: current.location
      })
      event.location = current.location
    }
    const attendees = await this.getAttendees(current)
    if (attendees.length > 0 && event.attendees !== undefined) {
      for (const attendee of attendees) {
        if (event.attendees.findIndex((p) => p.email === attendee) === -1) {
          res = true
          this.ctx.info('Update event diff: attendees', {
            calendarId: current.calendar,
            eventId: current.eventId,
            user: this.user.email,
            workspace: this.workspace,
            event: current._id,
            prev: event.attendees,
            current: attendee
          })
          event.attendees.push({ email: attendee })
        }
      }
    }
    const currentStart = parseEventDate(event.start)
    if (currentStart !== current.date) {
      res = true
      const newStart = convertDate(current.date, event.start?.date !== undefined, getTimezone(current))
      this.ctx.info('Update event diff: start', {
        calendarId: current.calendar,
        eventId: current.eventId,
        user: this.user.email,
        workspace: this.workspace,
        event: current._id,
        prev: event.start,
        current: newStart
      })
      event.start = newStart
    }
    const currentEnd = parseEventDate(event.end)
    if (currentEnd !== current.dueDate) {
      res = true
      const newEnd = convertDate(current.dueDate, event.end?.date !== undefined, getTimezone(current))
      this.ctx.info('Update event diff: end', {
        calendarId: current.calendar,
        eventId: current.eventId,
        user: this.user.email,
        workspace: this.workspace,
        event: current._id,
        prev: event.end,
        current: newEnd
      })
      event.end = newEnd
    }
    if (current._class === calendar.class.ReccuringEvent) {
      const rec = current as ReccuringEvent
      const parsed = parseRecurrenceStrings(event.recurrence ?? [])
      if (
        !deepEqual(rec.rules, parsed.rules) ||
        !deepEqual(rec.rdate, parsed.rdate) ||
        !deepEqual(rec.exdate, parsed.exdate)
      ) {
        res = true
        const newRec = encodeReccuring(rec.rules, rec.rdate, rec.exdate)
        this.ctx.info('Update event diff: recurrence', {
          calendarId: current.calendar,
          eventId: current.eventId,
          user: this.user.email,
          workspace: this.workspace,
          event: current._id,
          prev: event.recurrence,
          current: newRec
        })
        event.recurrence = newRec
      }
    }
    return res ? event : undefined
  }

  private async getParticipantsMap (participants: Ref<Contact>[]): Promise<Map<Ref<Contact>, string>> {
    const res = new Map<Ref<Contact>, string>()
    const emailSocialIds = await this.client.findAll(contact.class.SocialIdentity, {
      type: { $in: [SocialIdType.GOOGLE, SocialIdType.EMAIL] },
      attachedTo: { $in: participants }
    })
    for (const val of emailSocialIds) {
      res.set(val.attachedTo, val.value)
    }
    return res
  }

  private async getAttendees (event: Event): Promise<string[]> {
    const res = new Set<string>()
    const map = await this.getParticipantsMap(event.participants)
    for (const participant of event.participants) {
      const contact = map.get(participant)
      if (contact !== undefined) {
        res.add(contact)
      }
    }
    for (const ext of event.externalParticipants ?? []) {
      res.add(ext)
    }
    return Array.from(res)
  }

  private async remove (eventId: string, calendarId: string): Promise<void> {
    const current = await this.calendar.events.get({ calendarId, eventId })
    if (current?.data !== undefined) {
      if (current.data.organizer?.self === true) {
        await this.rateLimiter.take(1)
        try {
          await this.calendar.events.delete({
            eventId,
            calendarId
          })
        } catch {}
      }
    }
  }

  private async getCalendar (event: Event): Promise<ExternalCalendar | undefined> {
    return await this.client.findOne(calendar.class.ExternalCalendar, {
      _id: event.calendar as Ref<ExternalCalendar>
    })
  }

  static async push (
    ctx: MeasureContext,
    accountClient: AccountClient,
    workspace: WorkspaceUuid,
    event: Event,
    type: 'create' | 'update' | 'delete'
  ): Promise<void> {
    if (event.access === 'owner' || event.access === 'writer') {
      const mutex = await lock(`outcoming:${workspace}`)
      const client = await getClient(workspace)
      const txOp = new TxOperations(client, core.account.System)
      try {
        const user = await getTokenByEvent(accountClient, txOp, event, workspace)
        if (user === undefined) {
          return
        }
        const calendarClient = new OutcomingClient(ctx, workspace, txOp, user)
        const authSucces = await setCredentials(calendarClient.oAuth2Client, user)
        if (!authSucces) {
          ctx.warn('OutcomingClient push: remove user', {
            user: user.userId,
            workspace: user.workspace,
            email: user.email
          })
          removeUserByEmail(user, user.email)
          await removeIntegrationSecret(ctx, accountClient, {
            socialId: user.userId,
            kind: calendarIntegrationKind,
            workspaceUuid: user.workspace,
            key: user.email
          })
          return
        }
        await calendarClient.push(event, type)
      } finally {
        await txOp.close()
        mutex()
      }
    }
  }
}

async function getTokenByEvent (
  accountClient: AccountClient,
  txOp: TxOperations,
  event: Event,
  workspace: WorkspaceUuid
): Promise<Token | undefined> {
  const _calendar = await txOp.findOne(calendar.class.ExternalCalendar, {
    _id: event.calendar as Ref<ExternalCalendar>
  })
  if (_calendar === undefined) return
  const res = await accountClient.getIntegrationSecret({
    socialId: event.user,
    kind: calendarIntegrationKind,
    workspaceUuid: workspace,
    key: _calendar.externalUser
  })
  if (res == null) return
  return JSON.parse(res.secret)
}
