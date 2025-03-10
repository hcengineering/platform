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
import contact, {
  Channel,
  Contact,
  Person,
  getPrimarySocialId,
  getPersonRefBySocialId,
  getPersonRefsBySocialIds,
  type Employee,
  SocialIdentityRef
} from '@hcengineering/contact'
import core, {
  PersonId,
  SocialIdType,
  TxMixin,
  RateLimiter,
  TxOperations,
  TxProcessor,
  WorkspaceUuid,
  toIdMap,
  type Client,
  type Doc,
  type Ref,
  type Tx,
  type TxCreateDoc,
  type TxRemoveDoc,
  type TxUpdateDoc,
  systemAccountUuid,
  PersonUuid
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
  private channels = new Map<Ref<Channel>, Channel>()
  private readonly externalIdByPersonId = new Map<PersonId, string | null>()
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
    private readonly workspace: WorkspaceUuid,
    private readonly serviceController: CalendarController
  ) {
    this.tokens = mongo.collection<Token>('tokens')
    this.syncHistory = mongo.collection<SyncHistory>('syncHistories')
  }

  static async create (
    mongo: Db,
    workspace: WorkspaceUuid,
    serviceController: CalendarController
  ): Promise<WorkspaceClient> {
    const instance = new WorkspaceClient(mongo, workspace, serviceController)

    await instance.initClient(workspace)
    return instance
  }

  async createCalendarClient (user: User): Promise<CalendarClient> {
    const current = this.getCalendarClient(user.userId)
    if (current !== undefined) {
      if (current instanceof Promise) {
        return await current
      }
      return current
    }
    const newClient = CalendarClient.create(user, this.mongo, this.client, this)
    this.clients.set(user.userId, newClient)
    const res = await newClient
    this.clients.set(user.userId, res)
    return res
  }

  async newCalendarClient (user: User, code: string): Promise<CalendarClient> {
    const newClient = await CalendarClient.create(user, this.mongo, this.client, this)
    const userId = await newClient.authorize(code)
    if (this.clients.has(userId)) {
      newClient.close()
      throw new Error('Client already exist')
    }
    this.clients.set(userId, newClient)
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

  async getUserId (account: PersonUuid): Promise<PersonId> {
    const person = await this.client.findOne(contact.class.Person, { personUuid: account })
    if (person === undefined) {
      throw new Error('Person not found')
    }

    const personId = await getPrimarySocialId(this.client, person._id)

    if (personId === undefined) {
      throw new Error('PersonId not found')
    }

    return personId
  }

  async signout (personId: PersonId, byError: boolean = false): Promise<number> {
    let client = this.clients.get(personId)
    if (client !== undefined) {
      if (client instanceof Promise) {
        client = await client
      }
      await client.signout()
    } else {
      const integration = await this.client.findOne(setting.class.Integration, {
        type: calendar.integrationType.Calendar,
        value: personId
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
    this.clients.delete(personId)
    return this.clients.size
  }

  removeClient (personId: PersonId): void {
    this.clients.delete(personId)
    if (this.clients.size > 0) return
    void this.close()
    this.serviceController.removeWorkspace(this.workspace)
  }

  private getCalendarClient (personId: PersonId): CalendarClient | Promise<CalendarClient> | undefined {
    return this.clients.get(personId)
  }

  private async getCalendarClientByCalendar (
    id: Ref<ExternalCalendar>,
    create: boolean = false
  ): Promise<CalendarClient | undefined> {
    const calendar = this.calendars.byId.get(id)
    if (calendar === undefined) {
      console.warn("couldn't find calendar by id", id)
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

  private async initClient (workspace: WorkspaceUuid): Promise<Client> {
    const token = generateToken(systemAccountUuid, workspace, { service: 'calendar' })
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
    await this.getNewEvents()
    const limiter = new RateLimiter(config.InitLimit)
    for (let client of this.clients.values()) {
      void limiter.add(async () => {
        if (client instanceof Promise) {
          client = await client
        }
        await client.startSync()
      })
    }
  }

  // #region Events

  private async getSyncTime (): Promise<number | undefined> {
    const res = await this.syncHistory.findOne({
      workspace: this.workspace
    })
    return res?.timestamp
  }

  async updateSyncTime (): Promise<void> {
    const timestamp = Date.now()
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
        console.warn('Client not found', newEvent.calendar, this.workspace)
        return
      }
      await client.syncMyEvent(newEvent)
      await this.updateSyncTime()
    }
    console.log('all outcoming messages synced', this.workspace)
  }

  private async txEventHandler (...txes: Tx[]): Promise<void> {
    for (const tx of txes) {
      switch (tx._class) {
        case core.class.TxCreateDoc: {
          await this.txCreateEvent(tx as TxCreateDoc<Doc>)
          return
        }
        case core.class.TxUpdateDoc: {
          await this.txUpdateEvent(tx as TxUpdateDoc<Event>)
          return
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
    for (const calendar of calendars) {
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

  async getExtIdByPersonId (personId: PersonId): Promise<string | null | undefined> {
    if (!this.externalIdByPersonId.has(personId)) {
      const socialIdentity = await this.client.findOne(contact.class.SocialIdentity, {
        _id: personId as SocialIdentityRef,
        type: SocialIdType.GOOGLE
      })
      this.externalIdByPersonId.set(personId, socialIdentity?.value ?? null)
    }

    return this.externalIdByPersonId.get(personId)
  }

  async getMyCalendars (personId: PersonId): Promise<ExternalCalendar[]> {
    const extId = await this.getExtIdByPersonId(personId)
    if (extId == null) {
      return []
    }

    return this.calendars.byExternal.get(extId) ?? []
  }

  private async txCalendarHandler (actualTx: Tx): Promise<void> {
    if (actualTx._class === core.class.TxCreateDoc) {
      if ((actualTx as TxCreateDoc<Doc>).objectClass === calendar.class.ExternalCalendar) {
        const calendar = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<ExternalCalendar>)
        this.calendars.byId.set(calendar._id, calendar)
        const arr = this.calendars.byExternal.get(calendar.externalId) ?? []
        arr.push(calendar)
        this.calendars.byExternal.set(calendar.externalId, arr)
      }
    }
    if (actualTx._class === core.class.TxRemoveDoc) {
      const remTx = actualTx as TxRemoveDoc<ExternalCalendar>
      const calendar = this.calendars.byId.get(remTx.objectId)
      if (calendar !== undefined) {
        this.calendars.byId.delete(remTx.objectId)
        const arrByExt = this.calendars.byExternal.get(calendar.externalId) ?? []
        const indexByExt = arrByExt.findIndex((p) => p._id === calendar._id)
        if (indexByExt !== -1) {
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
    const emailSocialIds = await this.client.findAll(contact.class.SocialIdentity, { type: SocialIdType.EMAIL })
    for (const socialId of emailSocialIds) {
      this.contacts.byEmail.set(socialId.value, socialId.attachedTo)
      // Note: this doesn't seem to support multiple emails
      this.contacts.byId.set(socialId.attachedTo, socialId.value)
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
    const personsBySocialId = await getPersonRefsBySocialIds(this.client)
    const integrations = await this.client.findAll(setting.class.Integration, {
      type: calendar.integrationType.Calendar
    })
    for (const integration of integrations) {
      const person = personsBySocialId[integration.createdBy ?? integration.modifiedBy]
      if (person != null) {
        this.integrations.byEmail.set(integration.value, person)
        const arr = this.integrations.byContact.get(person) ?? []
        arr.push(integration.value)
        this.integrations.byContact.set(person, arr)
        this.integrations.byId.set(integration._id, integration)
      }
    }
    this.txHandlers.push(async (...txes: Tx[]) => {
      for (const tx of txes) {
        await this.txIntegrationHandler(tx)
      }
    })
  }

  private addContactIntegration (integration: Integration, person: Ref<Contact>): void {
    const arr = this.integrations.byContact.get(person) ?? []
    arr.push(integration.value)
    this.integrations.byContact.set(person, arr)
  }

  private removeContactIntegration (integration: Integration, person: Ref<Contact>): void {
    const arr = this.integrations.byContact.get(person)
    if (arr !== undefined) {
      const index = arr.findIndex((p) => p === integration.value)
      if (index !== -1) {
        arr.splice(index, 1)
        if (arr.length > 0) {
          this.integrations.byContact.set(person, arr)
        } else {
          this.integrations.byContact.delete(person)
        }
      }
    }
  }

  private async addIntegration (integration: Integration): Promise<void> {
    const person = await getPersonRefBySocialId(this.client, integration.createdBy ?? integration.modifiedBy)
    if (person != null) {
      if (integration.value !== '') {
        this.integrations.byEmail.set(integration.value, person)
        this.addContactIntegration(integration, person)
      }
      this.integrations.byId.set(integration._id, integration)
    }
  }

  private async removeIntegration (integration: Integration): Promise<void> {
    const person = await getPersonRefBySocialId(this.client, integration.createdBy ?? integration.modifiedBy)
    if (person != null) {
      this.removeContactIntegration(integration, person)
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

    this.txHandlers.push(async (...txes: Tx[]) => {
      for (const tx of txes) {
        await this.txEmployeeHandler(tx)
      }
    })
    for (const employee of removedEmployees) {
      await this.deactivateUser(employee._id)
    }
  }

  private async deactivateUser (person: Ref<Contact>): Promise<void> {
    const integrations = this.integrations.byContact.get(person) ?? []
    for (const integration of integrations) {
      if (integration !== '') {
        await this.signout(integration as any, true) // TODO: FIXME
      }
    }
  }

  private async txEmployeeHandler (tx: Tx): Promise<void> {
    if (tx._class !== core.class.TxUpdateDoc) return
    const ctx = tx as TxMixin<Person, Employee>
    if (!this.client.getHierarchy().isDerived(ctx.objectClass, contact.mixin.Employee)) return
    if (ctx.attributes.active === false) {
      await this.deactivateUser(ctx.objectId)
    }
  }

  // #endregion
}
