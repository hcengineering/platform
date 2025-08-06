//
// Copyright © 2023 Hardcore Engineering Inc.
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
import { Client, MeasureContext, Ref, TxOperations } from '@hcengineering/core'
import { areEqualMarkups, htmlToMarkup, isEmptyMarkup, jsonToHTML, markupToJSON } from '@hcengineering/text'
import { deepEqual } from 'fast-equals'
import { OAuth2Client } from 'google-auth-library'
import { calendar_v3 } from 'googleapis'
import { getRateLimitter, RateLimiter } from './rateLimiter'
import { type Token } from './types'
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
import type { WorkspaceClient } from './workspaceClient'

export class CalendarClient {
  private readonly calendar: calendar_v3.Calendar
  private readonly client: TxOperations
  private readonly oAuth2Client: OAuth2Client
  readonly rateLimiter: RateLimiter

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly accountClient: AccountClient,
    private readonly user: Token,
    client: Client,
    private readonly workspace: WorkspaceClient
  ) {
    this.client = new TxOperations(client, this.user.userId)
    this.rateLimiter = getRateLimitter(this.user.email)
    const res = getGoogleClient()
    this.calendar = res.google
    this.oAuth2Client = res.auth
  }

  static async create (
    ctx: MeasureContext,
    accountClient: AccountClient,
    user: Token,
    client: Client,
    workspace: WorkspaceClient
  ): Promise<CalendarClient | undefined> {
    const calendarClient = new CalendarClient(ctx, accountClient, user, client, workspace)
    const authSucces = await setCredentials(calendarClient.oAuth2Client, user)
    if (!authSucces) {
      removeUserByEmail(user, user.email)
      await removeIntegrationSecret(ctx, calendarClient.accountClient, {
        socialId: user.userId,
        kind: calendarIntegrationKind,
        workspaceUuid: user.workspace,
        key: user.email
      })
      return
    }
    return calendarClient
  }

  private areDatesEqual (first: calendar_v3.Schema$EventDateTime, second: calendar_v3.Schema$EventDateTime): boolean {
    if (first.date != null && second.date != null) {
      return new Date(first.date).getTime() === new Date(second.date).getTime()
    }
    if (first.dateTime != null && second.dateTime != null) {
      return new Date(first.dateTime).getTime() === new Date(second.dateTime).getTime()
    }
    return false
  }

  private async createRecInstance (calendarId: string, event: ReccuringInstance): Promise<void> {
    const body = this.convertBody(event)
    const req: calendar_v3.Params$Resource$Events$Instances = {
      calendarId,
      eventId: event.recurringEventId
    }
    await this.rateLimiter.take(1)
    const instancesResp = await this.calendar.events.instances(req)
    const items = instancesResp.data.items
    const target = items?.find(
      (p) =>
        p.originalStartTime != null &&
        body.originalStartTime != null &&
        this.areDatesEqual(p.originalStartTime, body.originalStartTime)
    )
    if (target?.id != null) {
      body.id = target.id
      await this.rateLimiter.take(1)
      await this.calendar.events.update({
        calendarId,
        eventId: target.id,
        requestBody: body
      })
      await this.client.update(event, { eventId: body.id ?? '' })
    }
  }

  async createEvent (event: Event): Promise<void> {
    try {
      const _calendar = this.workspace.calendarsById.get(event.calendar as Ref<ExternalCalendar>)
      if (_calendar !== undefined) {
        if (event._class === calendar.class.ReccuringInstance) {
          await this.createRecInstance(_calendar.externalId, event as ReccuringInstance)
        } else {
          const body = this.convertBody(event)
          await this.rateLimiter.take(1)
          await this.calendar.events.insert({
            calendarId: _calendar.externalId,
            requestBody: body
          })
        }
      }
    } catch (err: any) {
      throw new Error(`Create event error, ${this.user.workspace}, ${this.user.userId}, ${event._id}, ${err?.message}`)
    }
  }

  async updateEvent (event: Event): Promise<void> {
    const _calendar = this.workspace.calendarsById.get(event.calendar as Ref<ExternalCalendar>)
    const calendarId = _calendar?.externalId
    if (calendarId !== undefined) {
      try {
        await this.rateLimiter.take(1)
        const current = await this.calendar.events.get({ calendarId, eventId: event.eventId })
        if (current?.data !== undefined) {
          if (current.data.organizer?.self === true) {
            const ev = this.applyUpdate(current.data, event)
            await this.rateLimiter.take(1)
            await this.calendar.events.update({
              calendarId,
              eventId: event.eventId,
              requestBody: ev
            })
          }
        }
      } catch (err: any) {
        if (err.code === 404) {
          await this.createEvent(event)
        } else {
          console.error('Update event error', this.user.workspace, this.user.userId, err)
        }
      }
    }
  }

  async remove (eventId: string, calendarId: string): Promise<void> {
    const current = await this.calendar.events.get({ calendarId, eventId })
    if (current?.data !== undefined) {
      if (current.data.organizer?.self === true) {
        await this.rateLimiter.take(1)
        await this.calendar.events.delete({
          eventId,
          calendarId
        })
      }
    }
  }

  async syncMyEvent (event: Event): Promise<void> {
    if (event.access === 'owner' || event.access === 'writer') {
      try {
        const space = this.workspace.calendarsById.get(event.calendar as Ref<ExternalCalendar>)
        if (space !== undefined && space.externalUser === this.user.email) {
          if (!(await this.update(event, space))) {
            await this.create(event, space)
          }
        }
      } catch (err: any) {
        console.error('Sync event error', this.user.workspace, this.user.userId, event._id, err.message)
      }
    }
  }

  private async create (event: Event, space: ExternalCalendar): Promise<void> {
    const body = this.convertBody(event)
    const calendarId = space?.externalId
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
          const ev = this.applyUpdate(current.data, event)
          if (ev === undefined) {
            return true // No changes to apply
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

  private convertBody (event: Event): calendar_v3.Schema$Event {
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
    const attendees = this.getAttendees(event)
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

  private applyUpdate (event: calendar_v3.Schema$Event, current: Event): calendar_v3.Schema$Event | undefined {
    let res: boolean = false
    if (current.title !== event.summary) {
      this.ctx.info('Update event diff: title', {
        calendarId: current.calendar,
        eventId: current.eventId,
        user: this.user.email,
        workspace: this.user.workspace,
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
        event.visibility = newVisibility
        this.ctx.info('Update event diff: visibility', {
          calendarId: current.calendar,
          eventId: current.eventId,
          user: this.user.email,
          workspace: this.user.workspace,
          event: current._id,
          prev: event.visibility,
          current: newVisibility
        })
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
        workspace: this.user.workspace,
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
        workspace: this.user.workspace,
        event: current._id,
        prev: event.location,
        current: current.location
      })
      event.location = current.location
    }
    const attendees = this.getAttendees(current)
    if (attendees.length > 0 && event.attendees !== undefined) {
      for (const attendee of attendees) {
        if (event.attendees.findIndex((p) => p.email === attendee) === -1) {
          res = true
          this.ctx.info('Update event diff: attendees', {
            calendarId: current.calendar,
            eventId: current.eventId,
            user: this.user.email,
            workspace: this.user.workspace,
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
      const newStart = convertDate(current.date, event.start?.date !== undefined, getTimezone(current))
      res = true
      this.ctx.info('Update event diff: start', {
        calendarId: current.calendar,
        eventId: current.eventId,
        user: this.user.email,
        workspace: this.user.workspace,
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
        workspace: this.user.workspace,
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
          workspace: this.user.workspace,
          event: current._id,
          prev: event.recurrence,
          current: newRec
        })
        event.recurrence = newRec
      }
    }
    return res ? event : undefined
  }

  private getAttendees (event: Event): string[] {
    const res = new Set<string>()
    for (const participant of event.participants) {
      const contact = this.workspace.participants.get(participant)
      if (contact !== undefined) {
        res.add(contact)
      }
    }
    for (const ext of event.externalParticipants ?? []) {
      res.add(ext)
    }
    return Array.from(res)
  }
}
