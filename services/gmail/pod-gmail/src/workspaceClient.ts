/* eslint-disable @typescript-eslint/no-unused-vars */
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

import contact, { type Channel as PlatformChannel, type Person, Employee } from '@hcengineering/contact'
import core, {
  type WorkspaceUuid,
  type Client,
  type Doc,
  MeasureContext,
  type Ref,
  systemAccountUuid,
  type Tx,
  type TxCreateDoc,
  TxProcessor,
  type TxRemoveDoc,
  type TxUpdateDoc,
  PersonId,
  AccountUuid,
  TxOperations
} from '@hcengineering/core'
import gmailP, { type NewMessage } from '@hcengineering/gmail'
import type { StorageAdapter } from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'
import { getClient } from './client'
import { GmailClient } from './gmail'
import { type Channel, type ProjectCredentials, type User } from './types'
import { getAccountSocialIds } from './accounts'
import { cleanIntegrations } from './integrations'
import { CreateMessageEvent } from '@hcengineering/communication-sdk-types'

export class WorkspaceClient {
  private messageSubscribed: boolean = false
  private channels: Map<string, Channel> = new Map<string, Channel>()
  private channelsById: Map<Ref<Channel>, Channel> = new Map<Ref<Channel>, Channel>()
  private readonly txHandlers: ((...tx: Tx[]) => Promise<void>)[] = []

  private client!: Client
  private readonly clients: Map<PersonId, GmailClient> = new Map<PersonId, GmailClient>()

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly credentials: ProjectCredentials,
    private readonly storageAdapter: StorageAdapter,
    private readonly workspace: WorkspaceUuid
  ) {}

  static async create (
    ctx: MeasureContext,
    credentials: ProjectCredentials,
    storageAdapter: StorageAdapter,
    workspace: WorkspaceUuid
  ): Promise<WorkspaceClient> {
    const instance = new WorkspaceClient(ctx, credentials, storageAdapter, workspace)
    await instance.initClient(workspace)
    return instance
  }

  async createGmailClient (user: User, authCode?: string): Promise<GmailClient> {
    const current = user.socialId?._id !== undefined ? this.getGmailClient(user.socialId?._id) : undefined
    if (current !== undefined) return current
    this.ctx.info('Creating new gmail client', {
      workspaceUuid: this.workspace,
      userId: user.userId,
      email: user.email,
      socialId: user.socialId?._id
    })
    const newClient = await GmailClient.create(
      this.ctx,
      this.credentials,
      user,
      this.client,
      this,
      this.workspace,
      this.storageAdapter,
      authCode
    )
    this.clients.set(user.socialId._id, newClient)
    return newClient
  }

  async close (): Promise<void> {
    for (const client of this.clients.values()) {
      await client.close()
    }
    this.clients.clear()
    await this.client?.close()
  }

  async signoutByAccountId (userId: AccountUuid, byError: boolean = false): Promise<number> {
    const socialIds = await getAccountSocialIds(userId)
    this.ctx.info('socialIds', { socialIds })
    this.ctx.info('clients', { clients: this.clients })
    let deleted = false
    for (const socialId of socialIds) {
      const client = this.clients.get(socialId._id)
      if (client !== undefined) {
        await client.signout(byError)
        this.clients.delete(socialId._id)
        deleted = true
      }
    }
    if (!deleted && socialIds.length > 0) {
      this.ctx.info('Clean up integrations without clients')
      const tx = new TxOperations(this.client, socialIds[0]._id)
      await cleanIntegrations(this.ctx, tx, userId, this.workspace)
    }

    return this.clients.size
  }

  async signoutBySocialId (socialId: PersonId, byError: boolean = false): Promise<number> {
    const client = this.clients.get(socialId)
    if (client !== undefined) {
      await client.signout(byError)
      this.clients.delete(socialId)
    }
    return this.clients.size
  }

  async handleNewMessage (message: CreateMessageEvent): Promise<void> {
    for (const client of this.clients.values()) {
      await client.handleNewMessage(message)
    }
  }

  getGmailClient (userId: PersonId): GmailClient | undefined {
    return this.clients.get(userId)
  }

  private async initClient (workspace: WorkspaceUuid): Promise<Client> {
    const token = generateToken(systemAccountUuid, workspace, { service: 'gmail' })
    this.ctx.info('Init client', { workspaceUuid: workspace })
    const client = await getClient(token)
    client.notify = (...tx: Tx[]) => {
      void this.txHandler(...tx)
    }

    this.client = client
    await this.setChannels()
    return this.client
  }

  private async txHandler (...tx: Tx[]): Promise<void> {
    await Promise.all(
      this.txHandlers.map(async (handler) => {
        await handler(...tx)
      })
    )
  }

  // #region Message

  async subscribeMessages (): Promise<void> {
    if (this.messageSubscribed) return
    this.txHandlers.push(async (...txes: Tx[]) => {
      for (const tx of txes) {
        await this.txMessageHandler(tx)
      }
    })
    this.messageSubscribed = true
  }

  async getNewMessages (): Promise<void> {
    const newMessages = await this.client.findAll(gmailP.class.NewMessage, {
      status: 'new'
    })
    this.ctx.info('get new messages', { workspaceUuid: this.workspace, count: newMessages.length })
    await this.subscribeMessages()
    for (const message of newMessages) {
      const from = message.from ?? message.createdBy ?? message.modifiedBy
      const client = this.getGmailClient(from)
      if (client !== undefined) {
        await client.createMessage(message)
      } else {
        this.ctx.error('client not found, skip message', {
          workspaceUuid: this.workspace,
          from,
          messageId: message._id
        })
      }
    }
  }

  private async txMessageHandler (tx: Tx): Promise<void> {
    switch (tx._class) {
      case core.class.TxCreateDoc: {
        await this.txCreateMessage(tx as TxCreateDoc<Doc>)
        break
      }
      case core.class.TxUpdateDoc: {
        await this.txUpdateMessage(tx as TxUpdateDoc<NewMessage>)
        break
      }
    }
  }

  private async txCreateMessage (tx: TxCreateDoc<Doc>): Promise<void> {
    const hierarchy = this.client.getHierarchy()
    if (hierarchy.isDerived(tx.objectClass, gmailP.class.NewMessage)) {
      const doc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<NewMessage>)
      await this.prepareAndSendMessage(doc)
    }
  }

  private async txUpdateMessage (tx: TxUpdateDoc<NewMessage>): Promise<void> {
    const hierarchy = this.client.getHierarchy()
    if (hierarchy.isDerived(tx.objectClass, gmailP.class.NewMessage)) {
      if (tx.operations?.status !== 'new') return
      const doc = await this.client.findOne(tx.objectClass, { _id: tx.objectId })
      if (doc === undefined) return
      await this.prepareAndSendMessage(doc)
    }
  }

  private async prepareAndSendMessage (doc: NewMessage): Promise<void> {
    const client = this.getGmailClient(doc.from ?? doc.createdBy ?? doc.modifiedBy)
    if (client === undefined) {
      this.ctx.warn('Cannot send message without client', {
        workspaceUuid: this.workspace,
        messageId: doc._id,
        from: doc.from ?? doc.createdBy ?? doc.modifiedBy
      })
      return
    }
    await client.createMessage(doc)
  }

  // #endregion

  // #region channels

  getChannel (channel: string): Channel | undefined {
    return this.channels.get(normalize(channel))
  }

  private async setChannels (): Promise<void> {
    const channels = await this.getChannels(this.client)
    this.channels = new Map(
      channels.map((p) => {
        return [normalize(p.value), p]
      })
    )
    this.ctx.info('Set channels', { workspaceUuid: this.workspace, channels })
    this.channelsById = new Map(
      channels.map((p) => {
        return [p._id, p]
      })
    )

    this.txHandlers.push(async (...txes: Tx[]) => {
      for (const tx of txes) {
        await this.txChannelHandler(tx)
      }
    })
  }

  private async getChannels (client: Client): Promise<Channel[]> {
    return await client.findAll(
      contact.class.Channel,
      {
        provider: contact.channelProvider.Email
      },
      { projection: { _id: 1, _class: 1, space: 1, value: 1 } }
    )
  }

  private async addChannel (channel: Channel): Promise<void> {
    this.channels.set(normalize(channel.value), channel)
    this.channelsById.set(channel._id, channel)
  }

  private async syncChannel (channel: Channel): Promise<void> {
    await Promise.all(
      Array.from(this.clients.values()).map(async (p) => {
        await p.newChannel(channel.value)
      })
    )
  }

  private async removeChannel (channel: Channel): Promise<void> {
    this.channels.delete(normalize(channel.value))
    this.channelsById.delete(channel._id)
  }

  private async txChannelHandler (tx: Tx): Promise<void> {
    switch (tx._class) {
      case core.class.TxCreateDoc: {
        await this.txCreateChannel(tx as TxCreateDoc<Doc>)
        return
      }
      case core.class.TxUpdateDoc: {
        await this.txUpdateChannel(tx as TxUpdateDoc<Doc>)
        return
      }
      case core.class.TxRemoveDoc: {
        await this.txRemoveChannel(tx as TxRemoveDoc<Doc>)
      }
    }
  }

  private async txCreateChannel (tx: TxCreateDoc<Doc>): Promise<void> {
    const hierarhy = this.client.getHierarchy()
    if (hierarhy.isDerived(tx.objectClass, contact.class.Channel)) {
      const doc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<PlatformChannel>)
      if (doc.provider === contact.channelProvider.Email) {
        await this.addChannel(doc)
        await this.syncChannel(doc)
      }
    }
  }

  private async txUpdateChannel (tx: TxUpdateDoc<Doc>): Promise<void> {
    const hierarhy = this.client.getHierarchy()
    if (hierarhy.isDerived(tx.objectClass, contact.class.Channel)) {
      const ctx = tx as TxUpdateDoc<Channel>
      const channel = this.channelsById.get(ctx.objectId)
      if (channel !== undefined && ctx.operations.value !== undefined) {
        await this.removeChannel(channel)
        channel.value = ctx.operations.value
        await this.addChannel(channel)
        await this.syncChannel(channel)
      }
    }
  }

  private async txRemoveChannel (tx: TxRemoveDoc<Doc>): Promise<void> {
    const hierarhy = this.client.getHierarchy()
    if (hierarhy.isDerived(tx.objectClass, contact.class.Channel)) {
      const ctx = tx as TxRemoveDoc<Channel>
      const channel = this.channelsById.get(ctx.objectId)
      if (channel !== undefined) {
        await this.removeChannel(channel)
      }
    }
  }

  // #endregion

  // #region Users

  async checkUsers (): Promise<void> {
    const removedEmployees = await this.client.findAll(contact.mixin.Employee, {
      active: false
    })

    for (const person of removedEmployees) {
      await this.deactivateUser(person)
    }
    this.txHandlers.push(async (...txes: Tx[]) => {
      for (const tx of txes) {
        await this.txEmployeeHandler(tx)
      }
    })
    this.ctx.info('deactivate users', { workspaceUuid: this.workspace, count: removedEmployees.length })
  }

  private async deactivateUser (acc: Person): Promise<void> {
    if (acc.personUuid === undefined) return
    await this.signoutByAccountId(acc.personUuid as AccountUuid, true)
  }

  private async txEmployeeHandler (tx: Tx): Promise<void> {
    if (tx._class !== core.class.TxUpdateDoc) return
    const ctx = tx as TxUpdateDoc<Employee>
    if (!this.client.getHierarchy().isDerived(ctx.objectClass, contact.mixin.Employee)) return
    if (ctx.operations.active === false) {
      const acc = await this.client.findOne(contact.class.Person, { _id: ctx.objectId })
      if (acc !== undefined) {
        await this.deactivateUser(acc)
      }
    }
  }

  // #endregion
}

function normalize (str: string): string {
  return str.toLowerCase().trim()
}
