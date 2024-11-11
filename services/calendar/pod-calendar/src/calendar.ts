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

import calendar, {
  Calendar,
  Event,
  ExternalCalendar,
  ReccuringEvent,
  ReccuringInstance,
  Visibility
} from '@hcengineering/calendar'
import { Contact } from '@hcengineering/contact'
import core, {
  Account,
  AttachedData,
  Client,
  Data,
  Doc,
  DocData,
  DocumentUpdate,
  Mixin,
  Ref,
  TxOperations,
  TxUpdateDoc,
  generateId
} from '@hcengineering/core'
import setting from '@hcengineering/setting'
import { htmlToMarkup, markupToHTML } from '@hcengineering/text'
import { deepEqual } from 'fast-equals'
import type { Credentials, OAuth2Client } from 'google-auth-library'
import { calendar_v3, google } from 'googleapis'
import type { Collection, Db } from 'mongodb'
import { encode64 } from './base64'
import { CalendarController } from './calendarController'
import config from './config'
import { RateLimiter } from './rateLimiter'
import type { CalendarHistory, EventHistory, EventWatch, ProjectCredentials, State, Token, User, Watch } from './types'
import { encodeReccuring, isToken, parseRecurrenceStrings } from './utils'
import type { WorkspaceClient } from './workspaceClient'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.calendars.readonly',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email'
]
const DUMMY_RESOURCE = 'Dummy'

export class CalendarClient {
  private readonly oAuth2Client: OAuth2Client
  private readonly calendar: calendar_v3.Calendar
  private readonly tokens: Collection<Token>
  private readonly calendarHistories: Collection<CalendarHistory>
  private readonly histories: Collection<EventHistory>
  private readonly client: TxOperations
  private me: string | undefined = undefined
  private readonly watches: EventWatch[] = []
  private calendarWatch: Watch | undefined = undefined
  private refreshTimer: NodeJS.Timeout | undefined = undefined
  private readonly activeSync: Record<string, boolean> = {}
  private readonly rateLimiter = new RateLimiter(1000, 500)

  isClosed: boolean = false

  private constructor (
    credentials: ProjectCredentials,
    private readonly user: User,
    mongo: Db,
    client: Client,
    private readonly workspace: WorkspaceClient
  ) {
    const { client_secret, client_id, redirect_uris } = credentials.web // eslint-disable-line
    this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]) // eslint-disable-line
    this.calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client })
    this.tokens = mongo.collection<Token>('tokens')
    this.histories = mongo.collection<EventHistory>('histories')
    this.calendarHistories = mongo.collection<CalendarHistory>('calendarHistories')
    this.client = new TxOperations(client, this.user.userId)
  }

  static async create (
    credentials: ProjectCredentials,
    user: User | Token,
    mongo: Db,
    client: Client,
    workspace: WorkspaceClient
  ): Promise<CalendarClient> {
    const calendarClient = new CalendarClient(credentials, user, mongo, client, workspace)
    if (isToken(user)) {
      await calendarClient.setToken(user)
      await calendarClient.refreshToken()
      await calendarClient.addClient()
    }
    return calendarClient
  }

  static getAutUrl (redirectURL: string, workspace: string, userId: Ref<Account>, token: string): string {
    const credentials = JSON.parse(config.Credentials)
    const { client_secret, client_id, redirect_uris } = credentials.web // eslint-disable-line
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]) // eslint-disable-line
    const state: State = {
      token,
      redirectURL,
      workspace,
      userId,
      email: ''
    }
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: encode64(JSON.stringify(state))
    })
    return authUrl
  }

  async authorize (code: string): Promise<string> {
    const token = await this.oAuth2Client.getToken(code)
    await this.setToken(token.tokens)
    const me = await this.getMe()
    const providedScopes = token.tokens.scope?.split(' ') ?? []
    for (const scope of SCOPES) {
      if (providedScopes.findIndex((p) => p === scope) === -1) {
        const integrations = await this.client.findAll(setting.class.Integration, {
          createdBy: this.user.userId,
          type: calendar.integrationType.Calendar
        })
        for (const integration of integrations.filter((p) => p.value === '')) {
          await this.client.remove(integration)
        }

        const updated = integrations.find((p) => p.disabled && p.value === me)
        if (updated !== undefined) {
          await this.client.update(updated, {
            disabled: true,
            error: calendar.string.NotAllPermissions
          })
        } else {
          await this.client.createDoc(setting.class.Integration, core.space.Workspace, {
            type: calendar.integrationType.Calendar,
            disabled: true,
            error: calendar.string.NotAllPermissions,
            value: me
          })
        }
        throw new Error(
          `Not all scopes provided, provided: ${providedScopes.join(', ')} required: ${SCOPES.join(', ')}`
        )
      }
    }
    await this.refreshToken()
    await this.addClient()

    const integrations = await this.client.findAll(setting.class.Integration, {
      createdBy: this.user.userId,
      type: calendar.integrationType.Calendar
    })

    const updated = integrations.find((p) => p.disabled && p.value === me)

    for (const integration of integrations.filter((p) => p.value === '')) {
      await this.client.remove(integration)
    }
    if (updated !== undefined) {
      await this.client.update(updated, {
        disabled: false,
        error: null
      })
    } else {
      await this.client.createDoc(setting.class.Integration, core.space.Workspace, {
        type: calendar.integrationType.Calendar,
        disabled: false,
        value: me
      })
    }

    await this.startSync(me)
    void this.syncOurEvents()

    return me
  }

  async signout (byError: boolean = false): Promise<void> {
    try {
      await this.close()
      await this.oAuth2Client.revokeCredentials()
    } catch {}
    await this.tokens.deleteOne({
      userId: this.user.userId,
      workspace: this.user.workspace
    })
    const integration = await this.client.findOne(setting.class.Integration, {
      createdBy: this.user.userId,
      type: calendar.integrationType.Calendar,
      value: this.user.email
    })
    if (integration !== undefined) {
      if (byError) {
        await this.client.update(integration, { disabled: true })
      } else {
        await this.client.remove(integration)
      }
    }
    this.workspace.removeClient(this.user.email)
  }

  async startSync (me?: string): Promise<void> {
    try {
      if (me === undefined) {
        me = await this.getMe()
      }
      await this.syncCalendars(me)
      const calendars = this.workspace.getMyCalendars(me)
      for (const calendar of calendars) {
        if (calendar.externalId !== undefined) {
          void this.sync(calendar.externalId, me)
        }
      }
    } catch (err) {
      console.log('Start sync error', this.user.workspace, this.user.userId, err)
    }
  }

  async startSyncCalendar (calendar: ExternalCalendar): Promise<void> {
    const me = await this.getMe()
    void this.sync(calendar.externalId, me)
  }

  async close (): Promise<void> {
    if (this.refreshTimer !== undefined) clearTimeout(this.refreshTimer)
    for (const watch of this.watches) {
      clearTimeout(watch.timer)
      try {
        if (watch.resourceId !== DUMMY_RESOURCE) {
          await this.rateLimiter.take(1)
          await this.calendar.channels.stop({ requestBody: { id: watch.channelId, resourceId: watch.resourceId } })
        }
      } catch (err) {
        console.log('close error', err)
      }
    }
    if (this.calendarWatch !== undefined) {
      clearTimeout(this.calendarWatch.timer)
      try {
        await this.rateLimiter.take(1)
        await this.calendar.channels.stop({
          requestBody: { id: this.calendarWatch.channelId, resourceId: this.calendarWatch.resourceId }
        })
      } catch (err) {
        console.log('close error', err)
      }
    }
    this.isClosed = true
  }

  private async getMe (): Promise<string> {
    if (this.me !== undefined) {
      return this.me
    }

    const info = await google.oauth2({ version: 'v2', auth: this.oAuth2Client }).userinfo.get()
    this.me = info.data.email ?? ''
    return this.me
  }

  // #region Token

  private async getCurrentToken (): Promise<Token | null> {
    return await this.tokens.findOne({
      userId: this.user.userId,
      workspace: this.user.workspace,
      email: this.me ?? this.user.email
    })
  }

  private async updateCurrentToken (token: Credentials): Promise<void> {
    await this.tokens.updateOne(
      {
        userId: this.user.userId,
        workspace: this.user.workspace,
        email: this.me ?? this.user.email
      },
      {
        $set: {
          ...token
        }
      }
    )
  }

  private async addClient (): Promise<void> {
    try {
      const me = await this.getMe()
      const controller = CalendarController.getCalendarController()
      controller.addClient(me, this)
    } catch (err) {
      console.log('Add client error', this.user.workspace, this.user.userId, err)
    }
  }

  private async setToken (token: Credentials): Promise<void> {
    try {
      this.oAuth2Client.setCredentials(token)
    } catch (err: any) {
      console.log('Set token error', this.user.workspace, this.user.userId, err)
      await this.checkError(err)
      throw err
    }
  }

  private async updateToken (token: Credentials): Promise<void> {
    try {
      const currentToken = await this.getCurrentToken()
      if (currentToken != null) {
        await this.updateCurrentToken(token)
      } else {
        await this.tokens.insertOne({
          userId: this.user.userId,
          email: this.me ?? this.user.email,
          workspace: this.user.workspace,
          token: this.user.token,
          ...token
        })
      }
    } catch (err) {
      console.log('update token error', this.user.workspace, this.user.userId, err)
    }
  }

  private async refreshToken (): Promise<void> {
    try {
      const res = await this.oAuth2Client.refreshAccessToken()
      await this.updateToken(res.credentials)
      this.refreshTimer = setTimeout(
        () => {
          void this.refreshToken()
        },
        30 * 60 * 1000
      )
    } catch (err: any) {
      console.log("Couldn't refresh token, error:", err)
      if (err?.response?.data?.error === 'invalid_grant' || err.message === 'No refresh token is set.') {
        await this.signout(true)
      } else {
        this.refreshTimer = setTimeout(
          () => {
            void this.refreshToken()
          },
          15 * 60 * 1000
        )
      }
      throw err
    }
  }

  // #endregion

  // #region Calendars

  private async watchCalendar (): Promise<void> {
    try {
      const current = this.calendarWatch
      if (current !== undefined) {
        clearTimeout(current.timer)
        await this.rateLimiter.take(1)
        await this.calendar.channels.stop({ requestBody: { id: current.channelId, resourceId: current.resourceId } })
      }
      const channelId = generateId()
      const me = await this.getMe()
      const body = { id: channelId, address: config.WATCH_URL, type: 'webhook', token: `user=${me}&mode=calendar` }
      await this.rateLimiter.take(1)
      const res = await this.calendar.calendarList.watch({ requestBody: body })
      if (res.data.expiration != null && res.data.resourceId !== null) {
        const time = Number(res.data.expiration) - new Date().getTime()
        // eslint-disable-next-line
        const timer = setTimeout(() => void this.watchCalendar(), time)
        this.calendarWatch = {
          channelId,
          resourceId: res.data.resourceId ?? '',
          timer
        }
      }
    } catch (err) {
      console.log('Calendar watch error', err)
    }
  }

  async syncCalendars (me: string): Promise<void> {
    const history = await this.getCalendarHistory(me)
    await this.calendarSync(history?.historyId)
    await this.watchCalendar()
  }

  private async calendarSync (syncToken?: string, pageToken?: string): Promise<void> {
    try {
      await this.rateLimiter.take(1)
      const res = await this.calendar.calendarList.list({
        syncToken,
        pageToken
      })
      if (res.status === 410) {
        await this.calendarSync()
        return
      }
      const nextPageToken = res.data.nextPageToken
      for (const calendar of res.data.items ?? []) {
        try {
          await this.syncCalendar(calendar)
        } catch (err) {
          console.log('save calendar error', JSON.stringify(event), err)
        }
      }
      if (nextPageToken != null) {
        await this.calendarSync(syncToken, nextPageToken)
      }
      if (res.data.nextSyncToken != null) {
        await this.setCalendarHistoryId(res.data.nextSyncToken)
      }
    } catch (err: any) {
      if (err?.response?.status === 410) {
        await this.calendarSync()
        return
      }
      console.log('Calendar sync error', this.user.workspace, this.user.userId, err)
    }
  }

  private async syncCalendar (val: calendar_v3.Schema$CalendarListEntry): Promise<void> {
    if (val.id != null) {
      const exists = await this.client.findOne(calendar.class.ExternalCalendar, {
        externalId: val.id,
        externalUser: this.me ?? ''
      })
      if (exists === undefined) {
        const data: Data<ExternalCalendar> = {
          name: val.summary ?? '',
          visibility: 'freeBusy',
          hidden: false,
          externalId: val.id,
          externalUser: this.me ?? '',
          default: false
        }
        if (val.primary === true) {
          const primaryExists = await this.client.findOne(
            calendar.class.ExternalCalendar,
            {
              createdBy: this.user.userId
            },
            { projection: { _id: 1 } }
          )
          if (primaryExists === undefined) {
            data.default = true
          }
        }
        await this.client.createDoc<ExternalCalendar>(calendar.class.ExternalCalendar, calendar.space.Calendar, data)
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

  private async getCalendarHistory (me: string): Promise<CalendarHistory | null> {
    return await this.calendarHistories.findOne({
      email: me,
      userId: this.user.userId,
      workspace: this.user.workspace
    })
  }

  private async setCalendarHistoryId (historyId: string): Promise<void> {
    const me = await this.getMe()
    await this.calendarHistories.updateOne(
      {
        userId: this.user.userId,
        workspace: this.user.workspace,
        email: me
      },
      {
        $set: {
          historyId
        }
      },
      { upsert: true }
    )
  }

  // #endregion

  // #region Events

  // #region Incoming

  async stopWatch (calendar: ExternalCalendar): Promise<void> {
    for (const watch of this.watches) {
      if (watch.calendarId === calendar.externalId) {
        clearTimeout(watch.timer)
        try {
          if (watch.resourceId !== DUMMY_RESOURCE) {
            await this.rateLimiter.take(1)
            await this.calendar.channels.stop({ requestBody: { id: watch.channelId, resourceId: watch.resourceId } })
          }
        } catch (err) {
          console.log('close error', err)
        }
      }
    }
  }

  private async watch (calendarId: string): Promise<void> {
    try {
      const index = this.watches.findIndex((p) => p.calendarId === calendarId)
      if (index !== -1) {
        const current = this.watches[index]
        if (current !== undefined) {
          clearTimeout(current.timer)
          if (current.resourceId !== DUMMY_RESOURCE) {
            await this.rateLimiter.take(1)
            await this.calendar.channels.stop({
              requestBody: { id: current.channelId, resourceId: current.resourceId }
            })
          }
        }
        this.watches.splice(index, 1)
      }
      const channelId = generateId()
      const me = await this.getMe()
      const body = {
        id: channelId,
        address: config.WATCH_URL,
        type: 'webhook',
        token: `user=${me}&mode=events&calendarId=${calendarId}`
      }
      await this.rateLimiter.take(1)
      const res = await this.calendar.events.watch({ calendarId, requestBody: body })
      if (res.data.expiration != null && res.data.resourceId != null) {
        const time = Number(res.data.expiration) - new Date().getTime()
        // eslint-disable-next-line
        const timer = setTimeout(() => void this.watch(calendarId), time)
        this.watches.push({
          calendarId,
          channelId,
          resourceId: res.data.resourceId ?? '',
          timer
        })
      }
    } catch (err: any) {
      if (err?.errors?.[0]?.reason === 'pushNotSupportedForRequestedResource') {
        await this.dummyWatch(calendarId)
      } else {
        console.log('Watch error', err)
        await this.checkError(err)
      }
    }
  }

  private async checkError (err: any): Promise<boolean> {
    if (err?.response?.data?.error === 'invalid_grant') {
      await this.signout(true)
      return true
    }
    return false
  }

  private async dummyWatch (calendarId: string): Promise<void> {
    const me = await this.getMe()
    const timer = setTimeout(
      () => {
        void this.sync(calendarId, me)
      },
      6 * 60 * 60 * 1000
    )
    this.watches.push({
      calendarId,
      channelId: DUMMY_RESOURCE,
      resourceId: DUMMY_RESOURCE,
      timer
    })
  }

  async sync (calendarId: string, me: string): Promise<void> {
    if (this.isClosed) return
    if (this.activeSync[calendarId]) return
    this.activeSync[calendarId] = true
    await this.syncEvents(calendarId, me)
    this.activeSync[calendarId] = false
    await this.watch(calendarId)
  }

  private async getEventHistory (calendarId: string, me: string): Promise<EventHistory | null> {
    return await this.histories.findOne({
      calendarId,
      email: me,
      userId: this.user.userId,
      workspace: this.user.workspace
    })
  }

  private async setEventHistoryId (calendarId: string, historyId: string): Promise<void> {
    const me = await this.getMe()
    await this.histories.updateOne(
      {
        calendarId,
        userId: this.user.userId,
        workspace: this.user.workspace,
        email: me
      },
      {
        $set: {
          historyId
        }
      },
      { upsert: true }
    )
  }

  private async syncEvents (calendarId: string, me: string): Promise<void> {
    const history = await this.getEventHistory(calendarId, me)
    await this.eventsSync(calendarId, history?.historyId)
  }

  private async eventsSync (calendarId: string, syncToken?: string, pageToken?: string): Promise<void> {
    try {
      await this.rateLimiter.take(1)
      const res = await this.calendar.events.list({
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
          console.log('save event error', JSON.stringify(event), err)
        }
      }
      if (nextPageToken != null) {
        await this.eventsSync(calendarId, syncToken, nextPageToken)
      }
      if (res.data.nextSyncToken != null) {
        await this.setEventHistoryId(calendarId, res.data.nextSyncToken)
      }
    } catch (err: any) {
      if (err?.response?.status === 410) {
        await this.eventsSync(calendarId)
        return
      }
      await this.checkError(err)
      console.log('Event sync error', this.user.workspace, this.user.userId, err)
    }
  }

  private async syncEvent (calendarId: string, event: calendar_v3.Schema$Event, accessRole: string): Promise<void> {
    if (event.id != null) {
      const me = await this.getMe()
      const calendars = this.workspace.getMyCalendars(me)
      const _calendar =
        calendars.find((p) => p.externalId === event.organizer?.email) ??
        calendars.find((p) => p.externalId === calendarId) ??
        calendars[0]
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

  private parseMixins (event: calendar_v3.Schema$Event): Record<string, any> | undefined {
    if (event.extendedProperties?.shared?.mixins !== undefined) {
      const mixins = JSON.parse(event.extendedProperties.shared.mixins)
      return mixins
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
      timeZone: event.start?.timeZone ?? event.end?.timeZone ?? 'Etc/GMT'
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

  private getParticipant (value: string): {
    contact?: Ref<Contact>
    extra?: string
  } {
    const integration = this.workspace.integrations.byEmail.get(value)
    if (integration != null) {
      return {
        contact: integration
      }
    }
    const contact = this.workspace.contacts.byEmail.get(value)
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
    const contacts = new Set<Ref<Contact>>()
    const extra = new Set<string>()
    if (event.creator?.email != null) {
      const res = this.getParticipant(event.creator.email)
      if (res.contact !== undefined) {
        contacts.add(res.contact)
      }
      if (res.extra !== undefined) {
        extra.add(res.extra)
      }
    }
    for (const attendee of event.attendees ?? []) {
      if (attendee.email != null) {
        const res = this.getParticipant(attendee.email)
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

  // #endregion

  // #region Outcoming

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
      const _calendar = this.workspace.calendars.byId.get(event.calendar as Ref<ExternalCalendar>)
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
      await this.checkError(err)
      // eslint-disable-next-line
      throw new Error(`Create event error, ${this.user.workspace}, ${this.user.userId}, ${event._id}, ${err?.message}`)
    }
  }

  async updateEvent (event: Event, tx: TxUpdateDoc<Event>): Promise<void> {
    const _calendar = this.workspace.calendars.byId.get(event.calendar as Ref<ExternalCalendar>)
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
          console.log('Update event error', this.user.workspace, this.user.userId, err)
          await this.checkError(err)
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

  async removeEvent (event: Event): Promise<void> {
    try {
      const _calendar = this.workspace.calendars.byId.get(event.calendar as Ref<ExternalCalendar>)
      if (_calendar !== undefined) {
        await this.remove(event.eventId, _calendar.externalId)
      }
    } catch (err) {
      console.log('Remove event error', this.user.workspace, this.user.userId, err)
    }
  }

  async syncOurEvents (): Promise<void> {
    const me = await this.getMe()
    const events = await this.client.findAll(calendar.class.Event, {
      access: 'owner',
      createdBy: this.user.userId,
      calendar: { $in: this.workspace.getMyCalendars(me).map((p) => p._id) }
    })
    for (const event of events) {
      await this.syncMyEvent(event)
    }
    await this.workspace.updateSyncTime()
  }

  async syncMyEvent (event: Event): Promise<void> {
    if (event.access === 'owner' || event.access === 'writer') {
      try {
        const space = this.workspace.calendars.byId.get(event.calendar as Ref<ExternalCalendar>)
        if (space !== undefined && space.externalUser === this.me) {
          if (!(await this.update(event, space))) {
            await this.create(event, space)
          }
        }
      } catch (err: any) {
        console.log('Sync event error', this.user.workspace, this.user.userId, event._id, err.message)
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
        if (current !== undefined) {
          const ev = this.applyUpdate(current.data, event)
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

  private getMixinFields (event: Event): Record<string, any> {
    const res = {}
    const h = this.client.getHierarchy()
    for (const [k, v] of Object.entries(event)) {
      if (typeof v === 'object' && h.isMixin(k as Ref<Mixin<Doc>>)) {
        for (const [key, value] of Object.entries(v)) {
          if (value !== undefined) {
            const obj = (res as any)[k] ?? {}
            obj[key] = value
            ;(res as any)[k] = obj
          }
        }
      }
    }

    return res
  }

  private convertBody (event: Event): calendar_v3.Schema$Event {
    const res: calendar_v3.Schema$Event = {
      start: convertDate(event.date, event.allDay, getTimezone(event)),
      end: convertDate(event.dueDate, event.allDay, getTimezone(event)),
      id: event.eventId,
      description: markupToHTML(event.description),
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
    const mixin = this.getMixinFields(event)
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
        if (p === this.me) {
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

  private applyUpdate (event: calendar_v3.Schema$Event, current: Event): calendar_v3.Schema$Event {
    if (current.title !== event.summary) {
      event.summary = current.title
    }
    if (current.visibility !== undefined) {
      const newVisibility = current.visibility === 'public' ? 'public' : 'private'
      if (newVisibility !== event.visibility) {
        event.visibility = newVisibility
      }
      if (current.visibility === 'freeBusy') {
        event.extendedProperties = {
          ...event.extendedProperties,
          private: {
            visibility: 'freeBusy'
          }
        }
      }
    }
    const description = htmlToMarkup(event.description ?? '')
    if (current.description !== description) {
      event.description = description
    }
    if (current.location !== event.location) {
      event.location = current.location
    }
    const attendees = this.getAttendees(current)
    if (attendees.length > 0 && event.attendees !== undefined) {
      for (const attendee of attendees) {
        if (event.attendees.findIndex((p) => p.email === attendee) === -1) {
          event.attendees.push({ email: attendee })
        }
      }
    }
    event.start = convertDate(current.date, event.start?.date !== undefined, getTimezone(current))
    event.end = convertDate(current.dueDate, event.end?.date !== undefined, getTimezone(current))
    if (current._class === calendar.class.ReccuringEvent) {
      const rec = current as ReccuringEvent
      event.recurrence = encodeReccuring(rec.rules, rec.rdate, rec.exdate)
    }
    return event
  }

  private getAttendees (event: Event): string[] {
    const res = new Set<string>()
    for (const participant of event.participants) {
      const integrations = this.workspace.integrations.byContact.get(participant) ?? []
      const integration = integrations.find((p) => p === this.me) ?? integrations[0]
      if (integration !== undefined && integration !== '') {
        res.add(integration)
      } else {
        const contact = this.workspace.contacts.byId.get(participant)
        if (contact !== undefined) {
          res.add(contact)
        }
      }
    }
    for (const ext of event.externalParticipants ?? []) {
      res.add(ext)
    }
    return Array.from(res)
  }

  // #endregion

  // #endregion
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

function convertDate (value: number, allDay: boolean, timeZone: string | undefined): calendar_v3.Schema$EventDateTime {
  return allDay
    ? { date: new Date(value).toISOString().split('T')[0] }
    : { dateTime: new Date(value).toISOString(), timeZone: timeZone ?? 'Etc/GMT' }
}

function getTimezone (event: Event): string | undefined {
  return event.timeZone
}
