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
import calendar, { Event, ExternalCalendar, calendarIntegrationKind } from '@hcengineering/calendar'
import core, {
  MeasureContext,
  RateLimiter,
  SocialIdType,
  TxOperations,
  WorkspaceUuid,
  type Ref
} from '@hcengineering/core'
import contact, { getPersonRefsBySocialIds, Person } from '@hcengineering/contact'
import setting from '@hcengineering/setting'

import { CalendarClient } from './calendar'
import { getClient } from './client'
import config from './config'
import { addUserByEmail, getSyncHistory, setSyncHistory } from './kvsUtils'
import { getWorkspaceTokens } from './tokens'
import { GoogleEmail, Token } from './types'
import { getWorkspaceToken } from './utils'

export class WorkspaceClient {
  private readonly clients = new Map<GoogleEmail, CalendarClient>()
  private readonly calendarsByExternal = new Map<string, ExternalCalendar>()
  readonly calendarsById = new Map<Ref<ExternalCalendar>, ExternalCalendar>()
  readonly participants = new Map<Ref<Person>, string>()

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly accountClient: AccountClient,
    private readonly client: TxOperations,
    private readonly workspace: WorkspaceUuid
  ) {}

  static async run (ctx: MeasureContext, accountClient: AccountClient, workspace: WorkspaceUuid): Promise<void> {
    const client = await getClient(getWorkspaceToken(workspace))
    const txOp = new TxOperations(client, core.account.System)
    const instance = new WorkspaceClient(ctx, accountClient, txOp, workspace)

    await instance.init()
    await instance.startAll()
    await instance.close()
  }

  async init (): Promise<void> {
    const calendars = await this.client.findAll(calendar.class.ExternalCalendar, {})
    this.calendarsById.clear()
    this.calendarsByExternal.clear()
    for (const calendar of calendars) {
      this.calendarsById.set(calendar._id, calendar)
      this.calendarsByExternal.set(calendar.externalId, calendar)
    }
    await this.fillParticipants()
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
        this.participants.set(pers, sID.value)
      }
    }

    for (const channel of emails) {
      if (channel.value === '') continue
      const pers = channel.attachedTo as Ref<Person>
      if (this.participants.has(pers)) continue
      this.participants.set(pers, channel.value)
    }

    for (const integration of integrations) {
      if (integration.value === '') continue
      const pers = personsBySocialId[integration.createdBy ?? integration.modifiedBy]
      if (pers != null) {
        this.participants.set(pers, integration.value)
      }
    }
  }

  async startAll (): Promise<void> {
    const tokens = await getWorkspaceTokens(this.accountClient, this.workspace)
    for (const token of tokens) {
      if (token.workspaceUuid === null) continue
      await addUserByEmail(JSON.parse(token.secret), token.key as GoogleEmail)
      await this.createCalendarClient(JSON.parse(token.secret))
    }
    await this.getNewEvents()
    const limiter = new RateLimiter(config.InitLimit)
    for (const client of this.clients.values()) {
      await limiter.add(async () => {
        await client.startSync()
      })
    }
  }

  private async createCalendarClient (user: Token): Promise<CalendarClient | undefined> {
    const current = this.clients.get(user.email)
    if (current !== undefined) {
      return current
    }
    const newClient = await CalendarClient.create(this.ctx, this.accountClient, user, this.client, this)
    if (newClient === undefined) {
      return
    }
    this.clients.set(user.email, newClient)
    return newClient
  }

  private async close (): Promise<void> {
    this.clients.clear()
    await this.client?.close()
  }

  // #region Events

  static async push (
    ctx: MeasureContext,
    accountClient: AccountClient,
    workspace: WorkspaceUuid,
    event: Event,
    type: 'create' | 'update' | 'delete'
  ): Promise<void> {
    const client = await getClient(getWorkspaceToken(workspace))
    const txOp = new TxOperations(client, core.account.System)
    const token = await getTokenByEvent(accountClient, txOp, event, workspace)
    if (token != null) {
      const instance = new WorkspaceClient(ctx, accountClient, txOp, workspace)
      await instance.pushEvent(token, event, type)
      await instance.close()
      return
    }
    await txOp.close()
  }

  async pushEvent (user: Token, event: Event, type: 'create' | 'update' | 'delete'): Promise<void> {
    const client =
      this.getCalendarClientByCalendar(event.calendar as Ref<ExternalCalendar>) ??
      (await this.createCalendarClient(user))
    if (client === undefined) {
      console.warn('Client not found', event.calendar, this.workspace)
      return
    }
    if (type === 'delete') {
      await client.removeEvent(event)
    } else {
      await client.syncMyEvent(event)
    }
    await this.updateSyncTime()
  }

  private async getSyncTime (): Promise<number | undefined> {
    return (await getSyncHistory(this.workspace)) ?? undefined
  }

  private async updateSyncTime (): Promise<void> {
    await setSyncHistory(this.workspace)
  }

  private async getNewEvents (): Promise<void> {
    const lastSync = await this.getSyncTime()
    const query = lastSync !== undefined ? { modifiedOn: { $gt: lastSync } } : {}
    const newEvents = await this.client.findAll(calendar.class.Event, query)
    for (const newEvent of newEvents) {
      const client = this.getCalendarClientByCalendar(newEvent.calendar as Ref<ExternalCalendar>)
      if (client === undefined) {
        this.ctx.warn('Client not found', { calendar: newEvent.calendar, workspace: this.workspace })
        continue
      }
      await client.syncMyEvent(newEvent)
      await this.updateSyncTime()
    }
    this.ctx.info('all outcoming messages synced', { workspace: this.workspace })
  }

  private getCalendarClientByCalendar (id: Ref<ExternalCalendar>): CalendarClient | undefined {
    const calendar = this.calendarsById.get(id)
    if (calendar === undefined) {
      this.ctx.warn("couldn't find calendar by id", { id })
      return
    }
    return this.clients.get(calendar.externalUser as GoogleEmail)
  }
  // #endregion
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
