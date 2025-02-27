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

import calendar, { Event, ExternalCalendar } from '@hcengineering/calendar'
import contact, { Channel, Contact, type Employee, type PersonAccount } from '@hcengineering/contact'
import core, {
  RateLimiter,
  TxOperations,
  TxProcessor,
  systemAccountEmail,
  toIdMap,
  type Account,
  type Client,
  type Doc,
  type Ref,
  type Tx,
  type TxCreateDoc,
  type TxRemoveDoc,
  type TxUpdateDoc
} from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import setting, { Integration } from '@hcengineering/setting'
import { Collection, type Db } from 'mongodb'
import { CalendarClient } from './calendar'
import { CalendarController } from './calendarController'
import { getClient } from './client'
import { SyncHistory, Token, type User } from './types'
import config from './config'

export class WorkspaceClient {
  private readonly txHandlers: ((...tx: Tx[]) => Promise<void>)[] = []

  client!: Client
  private readonly clients: Map<string, CalendarClient | Promise<CalendarClient>> = new Map<
  string,
  CalendarClient | Promise<CalendarClient>
  >()

  private readonly syncHistory: Collection<SyncHistory>
  private readonly tokens: Collection<Token>
  private closeTimer: NodeJS.Timeout | undefined = undefined
  private channels = new Map<Ref<Channel>, Channel>()
  private readonly calendarsByEmail = new Map<string, ExternalCalendar[]>()
  readonly calendars = {
    byId: new Map<Ref<ExternalCalendar>, ExternalCalendar>(),
    byExternal: new Map<string, ExternalCalendar[]>()
  }

  readonly contacts = {
    byId: new Map<Ref<Contact>, string>(),
    byEmail: new Map<string, Ref<Contact>>()
  }

  readonly integrations = {
    byId: new Map<Ref<Integration>, Integration>(),
    byContact: new Map<Ref<Contact>, string[]>(),
    byEmail: new Map<string, Ref<Contact>>()
  }

  private constructor (
    private readonly mongo: Db,
    private readonly workspace: string,
    private readonly serviceController: CalendarController
  ) {
    this.tokens = mongo.collection<Token>('tokens')
    this.syncHistory = mongo.collection<SyncHistory>('syncHistories')
  }

  static async getSystemClient (workspace: string): Promise<Client> {
    const token = generateToken(systemAccountEmail, { name: workspace })
    return await getClient(token)
  }

  static async create (mongo: Db, workspace: string, serviceController: CalendarController): Promise<WorkspaceClient> {
    const instance = new WorkspaceClient(mongo, workspace, serviceController)
    console.log('create workspace client', workspace)
    await instance.initClient(workspace)
    return instance
  }

  async createCalendarClient (user: User, stayAlive: boolean = false): Promise<CalendarClient> {
    const current = this.getCalendarClient(user.email)
    if (current !== undefined) {
      if (current instanceof Promise) {
        return await current
      }
      return current
    }
    const newClient = CalendarClient.create(user, this.mongo, this.client, this, stayAlive)
    if (this.clients.has(user.email)) {
      console.error('Calendar client already exists', user.workspace, user.userId)
    }
    this.clients.set(user.email, newClient)
    const res = await newClient
    this.clients.set(user.email, res)
    return res
  }

  async newCalendarClient (user: User, code: string): Promise<CalendarClient> {
    const newClient = await CalendarClient.create(user, this.mongo, this.client, this)
    const email = await newClient.authorize(code)
    if (this.clients.has(email)) {
      newClient.close()
      throw new Error('Client already exist')
    }
    this.clients.set(email, newClient)
    return newClient
  }

  async close (): Promise<void> {
    for (let client of this.clients.values()) {
      if (client instanceof Promise) {
        client = await client
      }
      client.close()
    }
    this.clients.clear()
    await this.client?.close()
  }

  async getUserId (email: string): Promise<Ref<Account>> {
    const user = this.client.getModel().getAccountByEmail(email)
    if (user === undefined) {
      throw new Error('User not found')
    }
    return user._id
  }

  async signout (value: string, byError: boolean = false): Promise<number> {
    let client = this.clients.get(value)
    if (client !== undefined) {
      if (client instanceof Promise) {
        client = await client
      }
      await client.signout()
    } else {
      const integration = await this.client.findOne(setting.class.Integration, {
        type: calendar.integrationType.Calendar,
        value
      })
      if (integration !== undefined) {
        const txOp = new TxOperations(this.client, core.account.System)
        if (byError) {
          await txOp.update(integration, { disabled: true })
        } else {
          await txOp.remove(integration)
        }
      }
    }
    this.clients.delete(value)
    return this.clients.size
  }

  removeClient (email: string): void {
    this.clients.delete(email)
    if (this.clients.size > 0) return
    if (this.closeTimer !== undefined) clearTimeout(this.closeTimer)
    this.closeTimer = setTimeout(() => {
      if (this.clients.size > 0) return
      void this.close()
      this.serviceController.removeWorkspace(this.workspace)
    }, 20000)
  }

  getCalendarClient (email: string): CalendarClient | Promise<CalendarClient> | undefined {
    return this.clients.get(email)
  }

  private async getCalendarClientByCalendar (
    id: Ref<ExternalCalendar>,
    create: boolean = false
  ): Promise<CalendarClient | undefined> {
    const calendar = this.calendars.byId.get(id)
    if (calendar === undefined) {
      return
    }
    const client = this.clients.get(calendar.externalUser)
    if (client instanceof Promise) {
      return await client
    }
    if (client === undefined && create) {
      const user = await this.tokens.findOne({
        workspace: this.workspace,
        access_token: { $exists: true },
        email: calendar.externalUser
      })
      if (user != null) {
        return await this.createCalendarClient(user)
      }
    }
    return client
  }

  private async initClient (workspace: string): Promise<Client> {
    const token = generateToken(systemAccountEmail, { name: workspace })
    const client = await getClient(token)
    client.notify = (...tx: Tx[]) => {
      void this.txHandler(...tx)
    }

    this.client = client
    await this.init()
    return this.client
  }

  private async txHandler (...tx: Tx[]): Promise<void> {
    await Promise.all(
      this.txHandlers.map(async (handler) => {
        await handler(...tx)
      })
    )
  }

  private async init (): Promise<void> {
    await this.checkUsers()
    await this.initContacts()
    await this.initIntegrations()
    await this.initCalendars()
  }

  async sync (): Promise<void> {
    try {
      await this.getNewEvents()
    } catch (err) {
      console.error('sync error', err)
    }
    const limiter = new RateLimiter(config.InitLimit)
    for (let client of this.clients.values()) {
      await limiter.add(async () => {
        if (client instanceof Promise) {
          client = await client
        }
        await client.startSync()
        await client.release()
      })
    }
    await limiter.waitProcessing()
  }

  // #region Events

  private async getSyncTime (): Promise<number | undefined> {
    const res = await this.syncHistory.findOne({
      workspace: this.workspace
    })
    return res?.timestamp
  }

  async updateSyncTime (to: number | undefined = undefined): Promise<void> {
    const timestamp = to ?? Date.now()
    await this.syncHistory.updateOne(
      {
        workspace: this.workspace
      },
      {
        $set: {
          timestamp
        }
      },
      { upsert: true }
    )
  }

  async pushEvent (event: Event, type: 'create' | 'update' | 'delete'): Promise<void> {
    const client = await this.getCalendarClientByCalendar(event.calendar as Ref<ExternalCalendar>, true)
    if (client === undefined) {
      return
    }
    // if client synced our events just call resync
    if (event.access === 'owner' || event.access === 'writer') {
      if (type === 'delete') {
        await client.removeEvent(event)
      } else {
        await client.syncMyEvent(event)
      }
      await this.updateSyncTime()
    }
  }

  async getNewEvents (): Promise<void> {
    const lastSync = await this.getSyncTime()
    const query = lastSync !== undefined ? { modifiedOn: { $gt: lastSync } } : {}
    const newEvents = await this.client.findAll(calendar.class.Event, query)
    this.txHandlers.push(async (...tx: Tx[]) => {
      await this.txEventHandler(...tx)
    })
    for (const newEvent of newEvents) {
      const client = await this.getCalendarClientByCalendar(newEvent.calendar as Ref<ExternalCalendar>)
      if (client === undefined) {
        continue
      }
      await client.syncMyEvent(newEvent)
      await this.updateSyncTime(newEvent.modifiedOn)
    }
    await this.updateSyncTime()
  }

  private async txEventHandler (...txes: Tx[]): Promise<void> {
    for (const tx of txes) {
      switch (tx._class) {
        case core.class.TxCreateDoc: {
          await this.txCreateEvent(tx as TxCreateDoc<Doc>)
          continue
        }
        case core.class.TxUpdateDoc: {
          await this.txUpdateEvent(tx as TxUpdateDoc<Event>)
          continue
        }
        case core.class.TxRemoveDoc: {
          await this.txRemoveEvent(tx as TxRemoveDoc<Doc>)
        }
      }
    }
  }

  private async txCreateEvent (tx: TxCreateDoc<Doc>): Promise<void> {
    const hierarhy = this.client.getHierarchy()
    if (hierarhy.isDerived(tx.objectClass, calendar.class.Event)) {
      const doc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<Event>)
      if (doc.access !== 'owner') return
      const client = await this.getCalendarClientByCalendar(doc.calendar as Ref<ExternalCalendar>)
      if (client === undefined) {
        return
      }
      try {
        await client.createEvent(doc)
        await this.updateSyncTime()
      } catch (err) {
        console.error(err)
      }
    }
  }

  private async handleMove (tx: TxUpdateDoc<Event>): Promise<void> {
    const event = await this.client.findOne(calendar.class.Event, { _id: tx.objectId })
    if (event === undefined) {
      return
    }
    try {
      const txes = await this.client.findAll(core.class.TxCUD, {
        objectId: tx.objectId
      })
      const extracted = txes.filter((p) => p._id !== tx._id)
      const ev = TxProcessor.buildDoc2Doc<Event>(extracted)
      if (ev !== undefined) {
        const oldClient = await this.getCalendarClientByCalendar(ev.calendar as Ref<ExternalCalendar>)
        if (oldClient !== undefined) {
          const oldCalendar = this.calendars.byId.get(ev.calendar as Ref<ExternalCalendar>)
          if (oldCalendar !== undefined) {
            await oldClient.remove(event.eventId, oldCalendar.externalId)
          }
        }
      }
    } catch (err) {
      console.error('Error on remove event', err)
    }
    try {
      const client = await this.getCalendarClientByCalendar(event.calendar as Ref<ExternalCalendar>)
      if (client !== undefined) {
        await client.syncMyEvent(event)
      }
      await this.updateSyncTime()
    } catch (err) {
      console.error('Error on move event', err)
    }
  }

  private async txUpdateEvent (tx: TxUpdateDoc<Event>): Promise<void> {
    const hierarhy = this.client.getHierarchy()
    if (hierarhy.isDerived(tx.objectClass, calendar.class.Event)) {
      if (tx.operations.calendar !== undefined) {
        await this.handleMove(tx)
        return
      }
      const event = await this.client.findOne(calendar.class.Event, { _id: tx.objectId })
      if (event === undefined) {
        return
      }
      if (event.access !== 'owner' && event.access !== 'writer') return
      const client = await this.getCalendarClientByCalendar(event.calendar as Ref<ExternalCalendar>)
      if (client === undefined) {
        return
      }
      try {
        await client.updateEvent(event)
        await this.updateSyncTime()
      } catch (err) {
        console.error(err)
      }
    }
  }

  private async txRemoveEvent (tx: TxRemoveDoc<Doc>): Promise<void> {
    const hierarhy = this.client.getHierarchy()
    if (hierarhy.isDerived(tx.objectClass, calendar.class.Event)) {
      const txes = await this.client.findAll(core.class.TxCUD, {
        objectId: tx.objectId
      })
      const ev = TxProcessor.buildDoc2Doc<Event>(txes)
      if (ev === undefined) return
      if (ev.access !== 'owner' && ev.access !== 'writer') return
      const client = await this.getCalendarClientByCalendar(ev?.calendar as Ref<ExternalCalendar>)
      if (client === undefined) {
        return
      }
      await client.removeEvent(ev)
      await this.updateSyncTime()
    }
  }

  // #endregion

  // #region Calendars

  private async initCalendars (): Promise<void> {
    const calendars = await this.client.findAll(calendar.class.ExternalCalendar, {})
    this.calendars.byId = toIdMap(calendars)
    this.calendars.byExternal.clear()
    this.calendarsByEmail.clear()
    for (const calendar of calendars) {
      const arr = this.calendarsByEmail.get(calendar.externalUser) ?? []
      arr.push(calendar)
      this.calendarsByEmail.set(calendar.externalUser, arr)
      const arrByExt = this.calendars.byExternal.get(calendar.externalId) ?? []
      arrByExt.push(calendar)
      this.calendars.byExternal.set(calendar.externalId, arrByExt)
    }
    this.txHandlers.push(async (...txes: Tx[]) => {
      for (const tx of txes) {
        await this.txCalendarHandler(tx)
      }
    })
  }

  getMyCalendars (email: string): ExternalCalendar[] {
    return this.calendarsByEmail.get(email) ?? []
  }

  private async txCalendarHandler (actualTx: Tx): Promise<void> {
    if (actualTx._class === core.class.TxCreateDoc) {
      if ((actualTx as TxCreateDoc<Doc>).objectClass === calendar.class.ExternalCalendar) {
        const calendar = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<ExternalCalendar>)
        this.calendars.byId.set(calendar._id, calendar)
        const arr = this.calendars.byExternal.get(calendar.externalId) ?? []
        arr.push(calendar)
        this.calendars.byExternal.set(calendar.externalId, arr)
        const arrByExt = this.calendarsByEmail.get(calendar.externalUser) ?? []
        arrByExt.push(calendar)
        this.calendarsByEmail.set(calendar.externalUser, arrByExt)
      }
    }
    if (actualTx._class === core.class.TxRemoveDoc) {
      const remTx = actualTx as TxRemoveDoc<ExternalCalendar>
      const calendar = this.calendars.byId.get(remTx.objectId)
      if (calendar !== undefined) {
        const arr = this.calendarsByEmail.get(calendar.externalUser) ?? []
        const index = arr.findIndex((p) => p._id === calendar._id)
        if (index !== -1) {
          arr.splice(index, 1)
          this.calendarsByEmail.set(calendar.externalUser, arr)
        }
        this.calendars.byId.delete(remTx.objectId)
        const arrByExt = this.calendars.byExternal.get(calendar.externalId) ?? []
        const indexByExt = arrByExt.findIndex((p) => p._id === calendar._id)
        if (index !== -1) {
          arrByExt.splice(indexByExt, 1)
          this.calendars.byExternal.set(calendar.externalId, arrByExt)
        }
      }
    }
  }

  // #endregion

  // #region Contacts

  private async initContacts (): Promise<void> {
    const channels = await this.client.findAll(contact.class.Channel, { provider: contact.channelProvider.Email })
    this.channels = toIdMap(channels)
    const accounts = await this.client.findAll(contact.class.PersonAccount, {})
    for (const acc of accounts) {
      this.contacts.byEmail.set(acc.email, acc.person)
      this.contacts.byId.set(acc.person, acc.email)
    }
    for (const channel of channels) {
      if (channel.value !== '') {
        this.contacts.byEmail.set(channel.value, channel.attachedTo as Ref<Contact>)
        this.contacts.byId.set(channel.attachedTo as Ref<Contact>, channel.value)
      }
    }
    this.txHandlers.push(async (...txes: Tx[]) => {
      for (const tx of txes) {
        await this.txChannelHandler(tx)
      }
    })
  }

  private async txChannelHandler (actualTx: Tx): Promise<void> {
    if (actualTx._class === core.class.TxCreateDoc) {
      if ((actualTx as TxCreateDoc<Doc>).objectClass === contact.class.Channel) {
        const channel = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<Channel>)
        if (channel.provider === contact.channelProvider.Email) {
          this.contacts.byEmail.set(channel.value, channel.attachedTo as Ref<Contact>)
          this.contacts.byId.set(channel.attachedTo as Ref<Contact>, channel.value)
          this.channels.set(channel._id, channel)
        }
      }
    }
    if (actualTx._class === core.class.TxUpdateDoc) {
      const updateTx = actualTx as TxUpdateDoc<Channel>
      if (updateTx.operations.value !== undefined) {
        const channel = this.channels.get(updateTx.objectId)
        if (channel !== undefined) {
          const oldValue = channel.value
          this.contacts.byEmail.delete(oldValue)
          TxProcessor.updateDoc2Doc(channel, updateTx)
          this.contacts.byEmail.set(channel.value, channel.attachedTo as Ref<Contact>)
          this.contacts.byId.set(channel.attachedTo as Ref<Contact>, channel.value)
          this.channels.set(channel._id, channel)
        }
      }
    }
    if (actualTx._class === core.class.TxRemoveDoc) {
      const remTx = actualTx as TxRemoveDoc<Channel>
      const channel = this.channels.get(remTx.objectId)
      if (channel !== undefined) {
        this.contacts.byEmail.delete(channel.value)
        this.contacts.byId.delete(channel.attachedTo as Ref<Contact>)
        this.channels.delete(channel._id)
      }
    }
  }

  // #endregion

  // #region Integrations

  private async initIntegrations (): Promise<void> {
    const accounts = toIdMap(await this.client.findAll(contact.class.PersonAccount, {}))
    const integrations = await this.client.findAll(setting.class.Integration, {
      type: calendar.integrationType.Calendar
    })
    for (const integration of integrations) {
      const person = accounts.get((integration.createdBy ?? integration.modifiedBy) as Ref<PersonAccount>)
      if (person != null) {
        this.integrations.byEmail.set(integration.value, person.person)
        const arr = this.integrations.byContact.get(person.person) ?? []
        arr.push(integration.value)
        this.integrations.byContact.set(person.person, arr)
        this.integrations.byId.set(integration._id, integration)
      }
    }
    this.txHandlers.push(async (...txes: Tx[]) => {
      for (const tx of txes) {
        await this.txIntegrationHandler(tx)
      }
    })
  }

  private addContactIntegration (integration: Integration, account: PersonAccount): void {
    const arr = this.integrations.byContact.get(account.person) ?? []
    arr.push(integration.value)
    this.integrations.byContact.set(account.person, arr)
  }

  private removeContactIntegration (integration: Integration, account: PersonAccount): void {
    const arr = this.integrations.byContact.get(account.person)
    if (arr !== undefined) {
      const index = arr.findIndex((p) => p === integration.value)
      if (index !== -1) {
        arr.splice(index, 1)
        if (arr.length > 0) {
          this.integrations.byContact.set(account.person, arr)
        } else {
          this.integrations.byContact.delete(account.person)
        }
      }
    }
  }

  private async addIntegration (integration: Integration): Promise<void> {
    const account = await this.client.findOne(contact.class.PersonAccount, {
      _id: (integration.createdBy ?? integration.modifiedBy) as Ref<PersonAccount>
    })
    if (account != null) {
      if (integration.value !== '') {
        this.integrations.byEmail.set(integration.value, account.person)
        this.addContactIntegration(integration, account)
      }
      this.integrations.byId.set(integration._id, integration)
    }
  }

  private async removeIntegration (integration: Integration): Promise<void> {
    const account = await this.client.findOne(contact.class.PersonAccount, {
      _id: (integration.createdBy ?? integration.modifiedBy) as Ref<PersonAccount>
    })
    if (account != null) {
      this.removeContactIntegration(integration, account)
    }
    this.integrations.byEmail.delete(integration.value)
    this.integrations.byId.delete(integration._id)
  }

  private async txIntegrationHandler (actualTx: Tx): Promise<void> {
    if (actualTx._class === core.class.TxCreateDoc) {
      if ((actualTx as TxCreateDoc<Doc>).objectClass === setting.class.Integration) {
        const integration = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<Integration>)
        if (integration.type === calendar.integrationType.Calendar) {
          await this.addIntegration(integration)
        }
      }
    }
    if (actualTx._class === core.class.TxRemoveDoc) {
      const remTx = actualTx as TxRemoveDoc<Integration>
      const integration = this.integrations.byId.get(remTx.objectId)
      if (integration !== undefined) {
        await this.removeIntegration(integration)
      }
    }
  }

  // #endregion

  // #region Users

  async checkUsers (): Promise<void> {
    const removedEmployees = await this.client.findAll(contact.mixin.Employee, {
      active: false
    })
    const accounts = await this.client.findAll(contact.class.PersonAccount, {
      person: { $in: removedEmployees.map((p) => p._id) }
    })
    this.txHandlers.push(async (...txes: Tx[]) => {
      for (const tx of txes) {
        await this.txEmployeeHandler(tx)
      }
    })
    for (const acc of accounts) {
      await this.deactivateUser(acc)
    }
  }

  private async deactivateUser (acc: PersonAccount): Promise<void> {
    const integrations = this.integrations.byContact.get(acc.person) ?? []
    for (const integration of integrations) {
      if (integration !== '') {
        await this.signout(integration, true)
      }
    }
  }

  private async txEmployeeHandler (tx: Tx): Promise<void> {
    if (tx._class !== core.class.TxUpdateDoc) return
    const ctx = tx as TxUpdateDoc<Employee>
    if (!this.client.getHierarchy().isDerived(ctx.objectClass, contact.class.PersonAccount)) return
    if (ctx.operations.active === false) {
      const acc = await this.client.findOne(contact.class.PersonAccount, { person: ctx.objectId })
      if (acc !== undefined) {
        await this.deactivateUser(acc)
      }
    }
  }

  // #endregion
}
